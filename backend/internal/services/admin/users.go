package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"booking-university-rooms/backend/internal/models"
	"booking-university-rooms/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type ListUsersInput struct {
	Search          string
	ParticipantType string
	TeacherRank     string
	Limit           int
	Cursor          string
}

type ListUsersResult struct {
	Users      []models.User
	HasMore    bool
	NextCursor *string
}

func (s *Service) ListUsers(ctx context.Context, input ListUsersInput) (*ListUsersResult, error) {
	limit := normalizeLimit(input.Limit)

	args := []any{}
	argIdx := 1
	conditions := []string{"role != 'admin'"}

	if input.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			`(first_name ILIKE $%d OR last_name ILIKE $%d OR email ILIKE $%d OR department ILIKE $%d)`,
			argIdx, argIdx, argIdx, argIdx,
		))
		args = append(args, "%"+input.Search+"%")
		argIdx++
	}
	if input.ParticipantType != "" {
		conditions = append(conditions, fmt.Sprintf("participant_type = $%d", argIdx))
		args = append(args, input.ParticipantType)
		argIdx++
	}
	if input.TeacherRank != "" {
		conditions = append(conditions, fmt.Sprintf("teacher_rank = $%d", argIdx))
		args = append(args, input.TeacherRank)
		argIdx++
	}
	if input.Cursor != "" {
		cur, err := utils.DecodeAdminCursor(input.Cursor)
		if err == nil {
			conditions = append(conditions, fmt.Sprintf("(created_at, id::text) > ($%d, $%d)", argIdx, argIdx+1))
			args = append(args, cur.CreatedAt, cur.ID)
			argIdx += 2
		}
	}

	query := fmt.Sprintf(`
		SELECT id, email, first_name, last_name, department, role, participant_type, teacher_rank, created_at, updated_at
		FROM users
		WHERE %s
		ORDER BY created_at ASC, id ASC
		LIMIT $%d
	`, strings.Join(conditions, " AND "), argIdx)
	args = append(args, limit+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.Department, &u.Role, &u.ParticipantType, &u.TeacherRank, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	hasMore := len(users) > limit
	if hasMore {
		users = users[:limit]
	}

	var nextCursor *string
	if hasMore && len(users) > 0 {
		last := users[len(users)-1]
		encoded, err := utils.EncodeCursor(utils.AdminCursorPayload{
			CreatedAt: last.CreatedAt.UTC().Format(time.RFC3339Nano),
			ID:        last.ID.String(),
		})
		if err == nil {
			nextCursor = &encoded
		}
	}
	if users == nil {
		users = []models.User{}
	}

	return &ListUsersResult{Users: users, HasMore: hasMore, NextCursor: nextCursor}, nil
}

func (s *Service) UpdateUserRole(ctx context.Context, userIDStr string, participantType *models.ParticipantType, teacherRank *models.TeacherRank) (*models.User, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, ErrUserNotFound
	}

	user := &models.User{}
	err = s.db.QueryRow(ctx,
		`UPDATE users
		 SET participant_type = $1, teacher_rank = $2, updated_at = now()
		 WHERE id = $3
		 RETURNING id, email, first_name, last_name, department, role, participant_type, teacher_rank, created_at, updated_at`,
		participantType, teacherRank, userID,
	).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Department, &user.Role, &user.ParticipantType, &user.TeacherRank, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("update user role: %w", err)
	}

	return user, nil
}
