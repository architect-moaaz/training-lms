-- First, check if admin exists and delete if needed (for clean creation)
-- Then insert admin user with hashed password for 'admin123'

-- The bcrypt hash below is for password: admin123
-- Generated using: bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())

INSERT INTO users (username, email, password_hash, is_admin, created_at, registration_ip, registration_country, registration_city)
VALUES (
    'admin',
    'admin@lms.local',
    '$2b$12$KvPXQv5LIXb0tF0xJZJ0..EYvY.9.kZJRG0qV7XGzNzBhW0qNrK3m',
    true,
    NOW(),
    '127.0.0.1',
    'Local',
    'Local'
)
ON CONFLICT (username) 
DO UPDATE SET 
    is_admin = true,
    password_hash = '$2b$12$KvPXQv5LIXb0tF0xJZJ0..EYvY.9.kZJRG0qV7XGzNzBhW0qNrK3m';

-- Also handle email conflict
INSERT INTO users (username, email, password_hash, is_admin, created_at, registration_ip, registration_country, registration_city)
VALUES (
    'admin',
    'admin@lms.local',
    '$2b$12$KvPXQv5LIXb0tF0xJZJ0..EYvY.9.kZJRG0qV7XGzNzBhW0qNrK3m',
    true,
    NOW(),
    '127.0.0.1',
    'Local',
    'Local'
)
ON CONFLICT (email) 
DO UPDATE SET 
    is_admin = true,
    username = 'admin',
    password_hash = '$2b$12$KvPXQv5LIXb0tF0xJZJ0..EYvY.9.kZJRG0qV7XGzNzBhW0qNrK3m';
