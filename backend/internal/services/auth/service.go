package auth

import (
	"context"
	"fmt"
	"time"

	"booking-university-rooms/backend/internal/models"
	"booking-university-rooms/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	db               *pgxpool.Pool
	jwtSecret        string
	jwtRefreshSecret string
	accessTTL        time.Duration
	refreshTTL       time.Duration
}

func NewService(db *pgxpool.Pool, jwtSecret, jwtRefreshSecret string, accessTTL, refreshTTL time.Duration) *Service {
	return &Service{
		db:               db,
		jwtSecret:        jwtSecret,
		jwtRefreshSecret: jwtRefreshSecret,
		accessTTL:        accessTTL,
		refreshTTL:       refreshTTL,
	}
}

type RegisterInput struct {
	Email           string
	Password        string
	FirstName       string
	LastName        string
	Department      *string
	ParticipantType *models.ParticipantType
	TeacherRank     *models.TeacherRank
}

type AuthResult struct {
	User         *models.User
	AccessToken  string
	RefreshToken string
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (*AuthResult, error) {
	var exists bool
	err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", input.Email).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("check email: %w", err)
	}
	if exists {
		return nil, ErrEmailExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &models.User{}
	err = s.db.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, first_name, last_name, department, role, participant_type, teacher_rank)
		 VALUES ($1, $2, $3, $4, $5, 'user', $6, $7)
		 RETURNING id, email, first_name, last_name, department, role, participant_type, teacher_rank, created_at, updated_at`,
		input.Email, string(hash), input.FirstName, input.LastName, input.Department, input.ParticipantType, input.TeacherRank,
	).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Department, &user.Role, &user.ParticipantType, &user.TeacherRank, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}

	return s.issueTokens(ctx, user)
}

type LoginInput struct {
	Email    string
	Password string
}

func (s *Service) Login(ctx context.Context, input LoginInput) (*AuthResult, error) {
	user := &models.User{}
	err := s.db.QueryRow(ctx,
		`SELECT id, email, password_hash, first_name, last_name, department, role, participant_type, teacher_rank, created_at, updated_at
		 FROM users WHERE email = $1`,
		input.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName, &user.Department, &user.Role, &user.ParticipantType, &user.TeacherRank, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("find user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) Refresh(ctx context.Context, rawToken string) (*AuthResult, error) {
	tokenHash := utils.HashToken(rawToken)

	var tokenID uuid.UUID
	var userID uuid.UUID
	var expiresAt time.Time
	var revokedAt *time.Time

	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, expires_at, revoked_at
		 FROM refresh_tokens
		 WHERE token_hash = $1`,
		tokenHash,
	).Scan(&tokenID, &userID, &expiresAt, &revokedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrRefreshTokenInvalid
		}
		return nil, fmt.Errorf("find refresh token: %w", err)
	}

	if revokedAt != nil || time.Now().After(expiresAt) {
		return nil, ErrRefreshTokenInvalid
	}

	_, err = s.db.Exec(ctx,
		"UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1",
		tokenID,
	)
	if err != nil {
		return nil, fmt.Errorf("revoke token: %w", err)
	}

	user := &models.User{}
	err = s.db.QueryRow(ctx,
		`SELECT id, email, first_name, last_name, department, role, participant_type, teacher_rank, created_at, updated_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Department, &user.Role, &user.ParticipantType, &user.TeacherRank, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	return s.issueTokens(ctx, user)
}

func (s *Service) Logout(ctx context.Context, rawToken string) error {
	if rawToken == "" {
		return nil
	}
	tokenHash := utils.HashToken(rawToken)
	_, err := s.db.Exec(ctx,
		"UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
		tokenHash,
	)
	return err
}

func (s *Service) GetMe(ctx context.Context, userIDStr string) (*models.User, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, ErrUserNotFound
	}

	user := &models.User{}
	err = s.db.QueryRow(ctx,
		`SELECT id, email, first_name, last_name, department, role, participant_type, teacher_rank, created_at, updated_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Department, &user.Role, &user.ParticipantType, &user.TeacherRank, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("find user: %w", err)
	}
	return user, nil
}

func (s *Service) issueTokens(ctx context.Context, user *models.User) (*AuthResult, error) {
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email, string(user.Role), s.jwtSecret, s.accessTTL)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	rawRefresh, err := utils.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	tokenHash := utils.HashToken(rawRefresh)
	expiresAt := time.Now().Add(s.refreshTTL)

	_, err = s.db.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		user.ID, tokenHash, expiresAt,
	)
	if err != nil {
		return nil, fmt.Errorf("save refresh token: %w", err)
	}

	return &AuthResult{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
	}, nil
}
