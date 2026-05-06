CREATE TYPE participant_type AS ENUM ('student', 'teacher');

CREATE TYPE teacher_rank AS ENUM (
  'assistant',
  'junior_lecturer',
  'lecturer',
  'senior_lecturer',
  'associate_professor',
  'professor',
  'head_of_department'
);

ALTER TABLE users
  ADD COLUMN participant_type participant_type,
  ADD COLUMN teacher_rank teacher_rank;

ALTER TABLE users
  ADD CONSTRAINT chk_teacher_rank
  CHECK (teacher_rank IS NULL OR participant_type = 'teacher');

CREATE INDEX idx_users_participant_type ON users (participant_type)
  WHERE participant_type IS NOT NULL;

CREATE INDEX idx_users_teacher_rank ON users (teacher_rank)
  WHERE teacher_rank IS NOT NULL;
