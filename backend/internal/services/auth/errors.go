package auth

import "errors"

var (
	ErrEmailExists         = errors.New("EMAIL_ALREADY_EXISTS")
	ErrInvalidCredentials  = errors.New("UNAUTHORIZED")
	ErrRefreshTokenInvalid = errors.New("REFRESH_TOKEN_INVALID")
	ErrUserNotFound        = errors.New("USER_NOT_FOUND")
)
