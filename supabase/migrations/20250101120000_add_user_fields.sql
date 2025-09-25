/*
  # Add additional user fields for comprehensive user management

  1. New Columns
    - `phone` (text, nullable) - User phone number
    - `position` (text, nullable) - User job position
    - `location` (text, nullable) - User location
    - `is_active` (boolean, default true) - User active status
    - `hire_date` (date, nullable) - User hire date
    - `notes` (text, nullable) - Additional notes about user

  2. Security
    - Maintain existing RLS policies
    - New fields follow same access patterns as existing fields
*/

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS notes text;

-- Add comments for documentation
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.position IS 'User job position/title';
COMMENT ON COLUMN users.location IS 'User work location';
COMMENT ON COLUMN users.is_active IS 'Whether user account is active';
COMMENT ON COLUMN users.hire_date IS 'Date when user was hired';
COMMENT ON COLUMN users.notes IS 'Additional notes about the user';
