-- 000005_catalogs.sql

CREATE TABLE buildings (
  code       TEXT PRIMARY KEY,
  label_ru   TEXT NOT NULL,
  label_en   TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO buildings (code, label_ru, label_en, sort_order)
VALUES
  ('aviamotornaya', 'Авиамоторная', 'Aviamotornaya', 10),
  ('narod-opolchenie', 'Народное Ополчение', 'Narodnoye Opolcheniye', 20)
ON CONFLICT (code) DO UPDATE SET
  label_ru = EXCLUDED.label_ru,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

UPDATE rooms
SET building = 'aviamotornaya'
WHERE building NOT IN (SELECT code FROM buildings);

ALTER TABLE rooms
  ADD CONSTRAINT rooms_building_fk
  FOREIGN KEY (building) REFERENCES buildings(code);

CREATE INDEX idx_rooms_building ON rooms (building);
CREATE INDEX idx_buildings_active_order ON buildings (is_active, sort_order, code);

CREATE TABLE booking_purposes (
  code       TEXT PRIMARY KEY,
  label_ru   TEXT NOT NULL,
  label_en   TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO booking_purposes (code, label_ru, label_en, sort_order)
VALUES
  ('academic_lecture', 'Лекция / занятие', 'Academic lecture', 10),
  ('research_workshop', 'Исследовательский воркшоп', 'Research workshop', 20),
  ('collaborative_study', 'Групповая работа', 'Collaborative study', 30),
  ('technical_assessment', 'Техническая аттестация', 'Technical assessment', 40)
ON CONFLICT (code) DO UPDATE SET
  label_ru = EXCLUDED.label_ru,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

ALTER TABLE bookings
  ALTER COLUMN purpose TYPE TEXT USING purpose::text;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_purpose_fk
  FOREIGN KEY (purpose) REFERENCES booking_purposes(code);

CREATE INDEX idx_booking_purposes_active_order ON booking_purposes (is_active, sort_order, code);

DROP TYPE IF EXISTS booking_purpose;
