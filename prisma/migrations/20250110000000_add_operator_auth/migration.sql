-- AlterTable
ALTER TABLE "operators" ADD COLUMN "password" TEXT NOT NULL DEFAULT 'temp_password',
ADD COLUMN "refreshToken" TEXT;

-- Set a default password for existing operators (they will need to reset it)
-- Password: 'password123' hashed with bcrypt
UPDATE "operators" SET "password" = '$2b$10$XqvD1p2dHZv8cQv9yC7YuOxKhP0K1R/YJf8fC8kFZ8ZCXyYJYJ0Iu' WHERE "password" = 'temp_password';

-- Remove default
ALTER TABLE "operators" ALTER COLUMN "password" DROP DEFAULT;
