/*
  # Fix RLS policies for users table

  1. Security
    - Drop existing recursive policies that cause infinite recursion
    - Create simple, direct policies that check auth.uid() against user id
    - Ensure policies don't reference the users table in their conditions

  2. Changes
    - Remove policies that query the users table within their conditions
    - Add straightforward policies for user profile access
    - Maintain security while avoiding recursion
*/

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- For admin access, we'll handle this in the application layer
-- by checking the user's role after they've been authenticated
-- This avoids the recursive policy issue