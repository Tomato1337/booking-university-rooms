package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var (
	ErrStorageDisabled  = errors.New("storage disabled")
	ErrUnsupportedImage = errors.New("unsupported image type")
)

type Config struct {
	Endpoint       string
	Bucket         string
	AccessKey      string
	SecretKey      string
	UseSSL         bool
	PublicBasePath string
	MaxPhotoBytes  int64
}

type RoomPhoto struct {
	Reader      io.ReadCloser
	ContentType string
	Size        int64
}

type Service struct {
	client         *minio.Client
	bucket         string
	publicBasePath string
	maxPhotoBytes  int64
}

func New(ctx context.Context, cfg Config) (*Service, error) {
	if cfg.Endpoint == "" {
		return nil, nil
	}
	if cfg.Bucket == "" {
		cfg.Bucket = "room-photos"
	}
	if cfg.PublicBasePath == "" {
		cfg.PublicBasePath = "/api/media"
	}
	if cfg.MaxPhotoBytes <= 0 {
		cfg.MaxPhotoBytes = 5 * 1024 * 1024
	}

	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}

	service := &Service{
		client:         client,
		bucket:         cfg.Bucket,
		publicBasePath: strings.TrimRight(cfg.PublicBasePath, "/"),
		maxPhotoBytes:  cfg.MaxPhotoBytes,
	}
	if err := service.ensureBucket(ctx); err != nil {
		return nil, err
	}

	return service, nil
}

func (s *Service) ensureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check minio bucket: %w", err)
	}
	if exists {
		return nil
	}
	if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("create minio bucket: %w", err)
	}
	return nil
}

func (s *Service) UploadRoomPhoto(ctx context.Context, roomID uuid.UUID, fileHeader *multipart.FileHeader) (string, error) {
	if s == nil || s.client == nil {
		return "", ErrStorageDisabled
	}
	if fileHeader == nil {
		return "", nil
	}
	if fileHeader.Size <= 0 || fileHeader.Size > s.maxPhotoBytes {
		return "", ErrUnsupportedImage
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("open uploaded photo: %w", err)
	}
	defer file.Close()

	head := make([]byte, 512)
	n, readErr := io.ReadFull(file, head)
	if readErr != nil && readErr != io.ErrUnexpectedEOF && readErr != io.EOF {
		return "", fmt.Errorf("read uploaded photo: %w", readErr)
	}
	head = head[:n]

	contentType := http.DetectContentType(head)
	ext, ok := imageExt(contentType)
	if !ok {
		return "", ErrUnsupportedImage
	}

	objectKey := fmt.Sprintf("rooms/%s/%s%s", roomID.String(), uuid.NewString(), ext)
	reader := io.MultiReader(bytes.NewReader(head), file)
	if _, err := s.client.PutObject(ctx, s.bucket, objectKey, reader, fileHeader.Size, minio.PutObjectOptions{
		ContentType: contentType,
	}); err != nil {
		return "", fmt.Errorf("upload room photo: %w", err)
	}

	return s.publicURLForObjectKey(objectKey), nil
}

func (s *Service) GetRoomPhoto(ctx context.Context, roomPhotoPath string) (*RoomPhoto, error) {
	if s == nil || s.client == nil {
		return nil, ErrStorageDisabled
	}
	objectKey := "rooms/" + strings.Trim(strings.TrimPrefix(roomPhotoPath, "/"), "/")

	stat, err := s.client.StatObject(ctx, s.bucket, objectKey, minio.StatObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("stat room photo: %w", err)
	}

	obj, err := s.client.GetObject(ctx, s.bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("get room photo: %w", err)
	}

	return &RoomPhoto{
		Reader:      obj,
		ContentType: stat.ContentType,
		Size:        stat.Size,
	}, nil
}

func (s *Service) DeleteManagedRoomPhotoURL(ctx context.Context, photoURL string) {
	if s == nil || s.client == nil {
		return
	}
	objectKey, ok := s.objectKeyFromPublicURL(photoURL)
	if !ok {
		return
	}
	_ = s.client.RemoveObject(ctx, s.bucket, objectKey, minio.RemoveObjectOptions{})
}

func (s *Service) publicURLForObjectKey(objectKey string) string {
	return s.publicBasePath + "/" + strings.Trim(objectKey, "/")
}

func (s *Service) objectKeyFromPublicURL(photoURL string) (string, bool) {
	prefix := s.publicBasePath + "/"
	if !strings.HasPrefix(photoURL, prefix) {
		return "", false
	}
	rest := strings.TrimPrefix(photoURL, prefix)
	if rest == "" || strings.Contains(rest, "..") || !strings.HasPrefix(rest, "rooms/") {
		return "", false
	}
	return strings.Trim(rest, "/"), true
}

func imageExt(contentType string) (string, bool) {
	switch contentType {
	case "image/png":
		return ".png", true
	case "image/jpeg":
		return ".jpg", true
	case "image/webp":
		return ".webp", true
	default:
		return "", false
	}
}
