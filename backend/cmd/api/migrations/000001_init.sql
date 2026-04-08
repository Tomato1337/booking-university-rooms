-- 000001_init.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');
CREATE TYPE room_type AS ENUM ('lab', 'auditorium', 'seminar', 'conference', 'studio', 'lecture_hall');
CREATE TYPE booking_purpose AS ENUM ('academic_lecture', 'research_workshop', 'collaborative_study', 'technical_assessment');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  department    VARCHAR(200),
  role          user_role NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

CREATE TABLE equipment (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  VARCHAR(100) NOT NULL UNIQUE,
  icon  VARCHAR(50) NOT NULL
);

CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  room_type   room_type NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0),
  building    VARCHAR(200) NOT NULL,
  floor       INTEGER NOT NULL,
  photos      TEXT[] DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_equipment (
  room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, equipment_id)
);

CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  purpose         booking_purpose NOT NULL,
  booking_date    DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  attendee_count  INTEGER CHECK (attendee_count > 0),
  status          booking_status NOT NULL DEFAULT 'pending',
  admin_id        UUID REFERENCES users(id),
  status_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_time_range CHECK (start_time < end_time),
  CONSTRAINT chk_time_granularity CHECK (
    EXTRACT(MINUTE FROM start_time) IN (0, 30) AND
    EXTRACT(MINUTE FROM end_time) IN (0, 30)
  )
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;

CREATE INDEX idx_rooms_name_trgm ON rooms USING GIN (name gin_trgm_ops);
CREATE INDEX idx_rooms_capacity ON rooms (capacity);
CREATE INDEX idx_rooms_is_active ON rooms (is_active) WHERE is_active = true;

CREATE INDEX idx_room_equipment_equipment_id ON room_equipment (equipment_id);

CREATE INDEX idx_bookings_room_date_status ON bookings (room_id, booking_date, status);
CREATE INDEX idx_bookings_user_id_date ON bookings (user_id, booking_date DESC, created_at DESC);
CREATE INDEX idx_bookings_status_created ON bookings (status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_bookings_created_at ON bookings (created_at DESC, id DESC);

INSERT INTO equipment (name, icon) VALUES
  ('Projector', 'IconVideo'),
  ('Whiteboard', 'IconPresentation'),
  ('Computers', 'IconDeviceDesktop'),
  ('Microphone', 'IconMicrophone'),
  ('Live Stream', 'IconBroadcast'),
  ('Spatial Audio', 'IconVolume'),
  ('Wi-Fi', 'IconWifi'),
  ('Linux Nodes', 'IconTerminal2');
