DROP INDEX IF EXISTS idx_users_email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified;
