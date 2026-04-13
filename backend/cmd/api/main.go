package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"booking-university-rooms/backend/internal/config"
	"booking-university-rooms/backend/internal/db"
	adminhandler "booking-university-rooms/backend/internal/handlers/admin"
	authhandler "booking-university-rooms/backend/internal/handlers/auth"
	bookingshandler "booking-university-rooms/backend/internal/handlers/bookings"
	equipmenthandler "booking-university-rooms/backend/internal/handlers/equipment"
	roomshandler "booking-university-rooms/backend/internal/handlers/rooms"
	"booking-university-rooms/backend/internal/middleware"
	adminsvc "booking-university-rooms/backend/internal/services/admin"
	authsvc "booking-university-rooms/backend/internal/services/auth"
	bookingssvc "booking-university-rooms/backend/internal/services/bookings"
	equipmentsvc "booking-university-rooms/backend/internal/services/equipment"
	roomssvc "booking-university-rooms/backend/internal/services/rooms"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	if err := runMigrations(context.Background(), pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	// Services
	authService := authsvc.NewService(pool, cfg.JWTSecret, cfg.JWTRefreshSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)
	roomsService := roomssvc.NewService(pool)
	bookingsService := bookingssvc.NewService(pool)
	equipmentService := equipmentsvc.NewService(pool)
	adminService := adminsvc.NewService(pool)

	// Handlers
	authH := authhandler.NewHandler(authService, cfg.JWTRefreshTTL)
	roomsH := roomshandler.NewHandler(roomsService)
	equipH := equipmenthandler.NewHandler(equipmentService)
	bookingsH := bookingshandler.NewHandler(bookingsService)
	adminH := adminhandler.NewHandler(adminService)

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())

	// CORS
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           86400 * time.Second,
	}
	r.Use(cors.New(corsConfig))

	// Rate limiters
	loginLimiter := newRateLimiter(5, 15*time.Minute)
	registerLimiter := newRateLimiter(3, time.Hour)
	refreshLimiter := newRateLimiter(10, time.Minute)
	createBookingLimiter := newRateLimiterByUser(10, time.Minute)
	generalAuthLimiter := newRateLimiterByUser(100, time.Minute)
	generalPublicLimiter := newRateLimiter(30, time.Minute)

	api := r.Group("/api")

	// Health check
	startTime := time.Now()
	api.GET("/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		dbStatus := "connected"
		if err := pool.Ping(ctx); err != nil {
			dbStatus = "disconnected"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"version":  "1.0.0",
			"uptime":   int64(time.Since(startTime).Seconds()),
			"database": dbStatus,
		})
	})

	// Swagger UI docs
	registerDocsRoutes(api)

	// Auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", rateLimitByIP(registerLimiter), authH.Register)
		auth.POST("/login", rateLimitByIP(loginLimiter), authH.Login)
		auth.POST("/refresh", rateLimitByIP(refreshLimiter), authH.Refresh)
		auth.POST("/logout", middleware.Authenticate(cfg.JWTSecret), authH.Logout)
		auth.GET("/me", middleware.Authenticate(cfg.JWTSecret), authH.Me)
	}

	// Authenticated routes
	authed := api.Group("", middleware.Authenticate(cfg.JWTSecret), rateLimitByUserID(generalAuthLimiter))

	// Rooms
	authed.GET("/rooms", roomsH.Search)
	authed.GET("/rooms/:roomId", roomsH.GetDetail)
	authed.GET("/equipment", equipH.List)

	// Admin room management
	adminRooms := api.Group("/rooms", middleware.Authenticate(cfg.JWTSecret), middleware.RequireRole("admin"))
	adminRooms.POST("", roomsH.Create)
	adminRooms.PUT("/:roomId", roomsH.Update)
	adminRooms.DELETE("/:roomId", roomsH.Delete)

	// Bookings
	bookings := authed.Group("/bookings")
	{
		bookings.POST("", rateLimitByUserID(createBookingLimiter), bookingsH.Create)
		bookings.GET("/my", bookingsH.ListMy)
		bookings.GET("/my/history", bookingsH.ListMyHistory)
		bookings.PATCH("/:bookingId/cancel", bookingsH.Cancel)
	}

	// Admin
	admin := api.Group("/admin", middleware.Authenticate(cfg.JWTSecret), middleware.RequireRole("admin"))
	{
		admin.GET("/bookings/pending", adminH.ListPending)
		admin.PATCH("/bookings/:bookingId/approve", adminH.Approve)
		admin.PATCH("/bookings/:bookingId/reject", adminH.Reject)
		admin.GET("/stats", adminH.GetStats)
		admin.POST("/equipment", equipH.Create)
		admin.PUT("/equipment/:equipmentId", equipH.Update)
		admin.DELETE("/equipment/:equipmentId", equipH.Delete)
	}

	// Public rate limit on non-authed non-auth endpoints
	_ = generalPublicLimiter

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	go func() {
		log.Printf("server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("server stopped")
}

type bucket struct {
	mu      sync.Mutex
	count   int
	resetAt time.Time
}

type rateLimiter struct {
	mu      sync.RWMutex
	buckets map[string]*bucket
	limit   int
	window  time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		buckets: make(map[string]*bucket),
		limit:   limit,
		window:  window,
	}
}

// newRateLimiterByUser returns a per-user rate limiter (same underlying struct).
func newRateLimiterByUser(limit int, window time.Duration) *rateLimiter {
	return newRateLimiter(limit, window)
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	b, ok := rl.buckets[key]
	if !ok {
		b = &bucket{}
		rl.buckets[key] = b
	}
	rl.mu.Unlock()

	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	if now.After(b.resetAt) {
		b.count = 0
		b.resetAt = now.Add(rl.window)
	}

	if b.count >= rl.limit {
		return false
	}
	b.count++
	return true
}

func rateLimitByIP(rl *rateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		if !rl.allow(key) {
			retryAfter := int(rl.window.Seconds())
			utils.RespondErrorWithDetails(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED",
				"Too many requests, please try again later",
				gin.H{"retryAfter": retryAfter})
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.Abort()
			return
		}
		c.Next()
	}
}

func rateLimitByUserID(rl *rateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetString(middleware.ContextUserID)
		if key == "" {
			key = c.ClientIP()
		}
		if !rl.allow(key) {
			retryAfter := int(rl.window.Seconds())
			utils.RespondErrorWithDetails(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED",
				"Too many requests, please try again later",
				gin.H{"retryAfter": retryAfter})
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.Abort()
			return
		}
		c.Next()
	}
}
