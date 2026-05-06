-- 000006_room_type_equipment_catalogs.sql

CREATE TABLE room_types (
  code       TEXT PRIMARY KEY,
  label_ru   TEXT NOT NULL,
  label_en   TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO room_types (code, label_ru, label_en, sort_order)
VALUES
  ('lab', 'Лаборатория', 'Lab', 10),
  ('auditorium', 'Аудитория', 'Auditorium', 20),
  ('seminar', 'Семинарская', 'Seminar room', 30),
  ('conference', 'Конференц-зал', 'Conference room', 40),
  ('studio', 'Студия', 'Studio', 50),
  ('lecture_hall', 'Лекционный зал', 'Lecture hall', 60)
ON CONFLICT (code) DO UPDATE SET
  label_ru = EXCLUDED.label_ru,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

ALTER TABLE rooms
  ALTER COLUMN room_type TYPE TEXT USING room_type::text;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_room_type_fk
  FOREIGN KEY (room_type) REFERENCES room_types(code);

CREATE INDEX idx_room_types_active_order ON room_types (is_active, sort_order, code);

DROP TYPE IF EXISTS room_type;

ALTER TABLE equipment ADD COLUMN code TEXT;
ALTER TABLE equipment ADD COLUMN label_ru TEXT;
ALTER TABLE equipment ADD COLUMN label_en TEXT;
ALTER TABLE equipment ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE equipment ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE equipment ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE equipment ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE equipment
SET
  code = CASE name
    WHEN 'Projector' THEN 'projector'
    WHEN 'Whiteboard' THEN 'whiteboard'
    WHEN 'Computers' THEN 'computers'
    WHEN 'Microphone' THEN 'microphone'
    WHEN 'Live Stream' THEN 'live-stream'
    WHEN 'Spatial Audio' THEN 'spatial-audio'
    WHEN 'Wi-Fi' THEN 'wi-fi'
    WHEN 'Linux Nodes' THEN 'linux-nodes'
    ELSE lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
  END,
  label_ru = CASE name
    WHEN 'Projector' THEN 'Проектор'
    WHEN 'Whiteboard' THEN 'Доска'
    WHEN 'Computers' THEN 'Компьютеры'
    WHEN 'Microphone' THEN 'Микрофон'
    WHEN 'Live Stream' THEN 'Трансляция'
    WHEN 'Spatial Audio' THEN 'Пространственный звук'
    WHEN 'Wi-Fi' THEN 'Wi-Fi'
    WHEN 'Linux Nodes' THEN 'Linux-узлы'
    ELSE name
  END,
  label_en = name,
  sort_order = CASE name
    WHEN 'Projector' THEN 10
    WHEN 'Whiteboard' THEN 20
    WHEN 'Computers' THEN 30
    WHEN 'Microphone' THEN 40
    WHEN 'Live Stream' THEN 50
    WHEN 'Spatial Audio' THEN 60
    WHEN 'Wi-Fi' THEN 70
    WHEN 'Linux Nodes' THEN 80
    ELSE 100
  END
WHERE code IS NULL;

ALTER TABLE equipment ALTER COLUMN code SET NOT NULL;
ALTER TABLE equipment ALTER COLUMN label_ru SET NOT NULL;
ALTER TABLE equipment ALTER COLUMN label_en SET NOT NULL;

ALTER TABLE equipment ADD CONSTRAINT equipment_code_key UNIQUE (code);

CREATE INDEX idx_equipment_active_order ON equipment (is_active, sort_order, code);
