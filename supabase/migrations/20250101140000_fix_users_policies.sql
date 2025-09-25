/*
  # Fix users table RLS policies

  1. Problem
    - Recursive policies causing issues with user updates and deletes
    - Admin policies querying users table within users table policies
    - Need simple, non-recursive policies

  2. Solution
    - Drop all existing policies
    - Create simple policies without recursion
    - Use application layer for admin checks
    - Allow basic CRUD operations for authenticated users

  3. Security
    - Users can manage their own profile
    - All authenticated users can read profiles (needed for assignments)
    - Application layer handles admin permissions
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "All users can read profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Note: Admin permissions will be handled in the application layer
-- This avoids recursive policy issues
