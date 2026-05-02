-- 000004_five_minute_time_granularity.sql

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_time_granularity,
  ADD CONSTRAINT chk_time_granularity CHECK (
    EXTRACT(SECOND FROM start_time) = 0 AND
    EXTRACT(SECOND FROM end_time) = 0 AND
    MOD(EXTRACT(MINUTE FROM start_time)::int, 5) = 0 AND
    MOD(EXTRACT(MINUTE FROM end_time)::int, 5) = 0
  );

ALTER TABLE rooms
  ADD CONSTRAINT chk_room_hours_granularity CHECK (
    open_time < close_time AND
    EXTRACT(SECOND FROM open_time) = 0 AND
    EXTRACT(SECOND FROM close_time) = 0 AND
    MOD(EXTRACT(MINUTE FROM open_time)::int, 5) = 0 AND
    MOD(EXTRACT(MINUTE FROM close_time)::int, 5) = 0
  );
