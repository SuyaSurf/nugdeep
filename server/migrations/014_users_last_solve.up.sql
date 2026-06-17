ALTER TABLE users ADD COLUMN last_solve_at TIMESTAMPTZ;
CREATE INDEX idx_users_last_solve_at ON users(last_solve_at);
