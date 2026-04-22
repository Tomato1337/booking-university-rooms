-- 000003_seed_data.sql

INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('admin@uni.edu', '$2a$10$brVApVeWweNBdVQ5JgAIFO6rjnhpiSSCX71COqStHLeJJcunyIvG2', 'System', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO rooms (name, description, room_type, capacity, building, floor, open_time, close_time)
VALUES 
  ('LAB_402_OMEGA', 'High-performance computing lab with Linux nodes.', 'lab', 30, 'Main Building', 4, '08:00', '22:00'),
  ('AUD_101_ALPHA', 'Large lecture auditorium with a projector and live stream setup.', 'auditorium', 150, 'Main Building', 1, '08:00', '20:00'),
  ('CONF_205_BETA', 'Small conference room for collaborative study.', 'conference', 12, 'Main Building', 2, '09:00', '18:00')
ON CONFLICT (name) DO NOTHING;

-- Map equipment to rooms
INSERT INTO room_equipment (room_id, equipment_id)
SELECT r.id, e.id
FROM rooms r
CROSS JOIN equipment e
WHERE r.name = 'LAB_402_OMEGA' AND e.name IN ('Computers', 'Linux Nodes', 'Wi-Fi')
ON CONFLICT DO NOTHING;

INSERT INTO room_equipment (room_id, equipment_id)
SELECT r.id, e.id
FROM rooms r
CROSS JOIN equipment e
WHERE r.name = 'AUD_101_ALPHA' AND e.name IN ('Projector', 'Microphone', 'Live Stream', 'Wi-Fi')
ON CONFLICT DO NOTHING;

INSERT INTO room_equipment (room_id, equipment_id)
SELECT r.id, e.id
FROM rooms r
CROSS JOIN equipment e
WHERE r.name = 'CONF_205_BETA' AND e.name IN ('Whiteboard', 'Wi-Fi')
ON CONFLICT DO NOTHING;
