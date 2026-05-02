package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port string
	Host string

	DatabaseURL string

	JWTSecret        string
	JWTRefreshSecret string
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration

	CORSOrigins []string

	LogLevel string
	Env      string

	S3Endpoint          string
	S3Bucket            string
	S3AccessKey         string
	S3SecretKey         string
	S3UseSSL            bool
	MediaPublicBasePath string
	MaxRoomPhotoBytes   int64
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	accessTTL, err := time.ParseDuration(getEnv("JWT_ACCESS_TTL", "15m"))
	if err != nil {
		accessTTL = 15 * time.Minute
	}

	refreshTTL, err := time.ParseDuration(getEnv("JWT_REFRESH_TTL", "720h"))
	if err != nil {
		refreshTTL = 720 * time.Hour
	}

	origins := splitEnv("CORS_ORIGINS", "http://localhost:5173")
	maxRoomPhotoBytes, err := strconv.ParseInt(getEnv("MAX_ROOM_PHOTO_BYTES", "5242880"), 10, 64)
	if err != nil || maxRoomPhotoBytes <= 0 {
		maxRoomPhotoBytes = 5 * 1024 * 1024
	}

	return &Config{
		Port:             getEnv("PORT", "3000"),
		Host:             getEnv("HOST", "0.0.0.0"),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		JWTSecret:        getEnv("JWT_SECRET", "change-me-in-production"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "change-refresh-secret"),
		JWTAccessTTL:     accessTTL,
		JWTRefreshTTL:    refreshTTL,
		CORSOrigins:      origins,
		LogLevel:         getEnv("LOG_LEVEL", "info"),
		Env:              getEnv("ENV", "development"),

		S3Endpoint:          getEnv("S3_ENDPOINT", ""),
		S3Bucket:            getEnv("S3_BUCKET", "room-photos"),
		S3AccessKey:         getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:         getEnv("S3_SECRET_KEY", ""),
		S3UseSSL:            getEnvBool("S3_USE_SSL", false),
		MediaPublicBasePath: getEnv("MEDIA_PUBLIC_BASE_PATH", "/api/media"),
		MaxRoomPhotoBytes:   maxRoomPhotoBytes,
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func splitEnv(key, fallback string) []string {
	v := getEnv(key, fallback)
	if v == "" {
		return []string{}
	}
	result := []string{}
	start := 0
	for i := 0; i <= len(v); i++ {
		if i == len(v) || v[i] == ',' {
			part := v[start:i]
			if part != "" {
				result = append(result, part)
			}
			start = i + 1
		}
	}
	return result
}

var _ = getEnvBool
