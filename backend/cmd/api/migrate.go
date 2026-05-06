package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/000001_init.sql
var initSQL []byte

//go:embed migrations/000002_add_room_hours.sql
var addRoomHoursSQL []byte

//go:embed migrations/000003_seed_data.sql
var seedDataSQL []byte

//go:embed migrations/000004_five_minute_time_granularity.sql
var fiveMinuteTimeGranularitySQL []byte

//go:embed migrations/000005_catalogs.sql
var catalogsSQL []byte

//go:embed migrations/000006_add_role_hierarchy.sql
var roleHierarchySQL []byte

func runMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	// Create migrations tracking table if needed
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version     TEXT PRIMARY KEY,
			applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	migrations := []struct {
		version string
		sql     []byte
	}{
		{"000001_init", initSQL},
		{"000002_add_room_hours", addRoomHoursSQL},
		{"000003_seed_data", seedDataSQL},
		{"000004_five_minute_time_granularity", fiveMinuteTimeGranularitySQL},
		{"000005_catalogs", catalogsSQL},
		{"000006_add_role_hierarchy", roleHierarchySQL},
	}

	for _, m := range migrations {
		var applied bool
		err := pool.QueryRow(ctx,
			"SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)",
			m.version,
		).Scan(&applied)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", m.version, err)
		}
		if applied {
			log.Printf("migration %s: already applied, skipping", m.version)
			continue
		}

		log.Printf("migration %s: applying...", m.version)
		if _, err := pool.Exec(ctx, string(m.sql)); err != nil {
			return fmt.Errorf("apply migration %s: %w", m.version, err)
		}
		if _, err := pool.Exec(ctx,
			"INSERT INTO schema_migrations (version) VALUES ($1)",
			m.version,
		); err != nil {
			return fmt.Errorf("record migration %s: %w", m.version, err)
		}
		log.Printf("migration %s: done", m.version)
	}

	return nil
}
