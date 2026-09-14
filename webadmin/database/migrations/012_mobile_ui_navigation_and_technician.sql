-- Mobile UI Studio v2: register the app key first. PostgreSQL requires a new
-- enum value to be committed before it can be used by another statement.
ALTER TYPE "AppKey" ADD VALUE IF NOT EXISTS 'TECHNICIAN_MOBILE';
