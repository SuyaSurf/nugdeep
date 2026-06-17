DROP INDEX IF EXISTS idx_users_last_solve_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_solve_at;
