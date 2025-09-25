/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - The admin policies were causing infinite recursion by querying the users table from within users table policies
    - This created a circular dependency that prevented any queries from working

  2. Solution
    - Remove all existing policies on users table
    - Create simple, non-recursive policies
    - Use auth.uid() directly instead of querying users table for role checks
    - Temporarily allow broader access to fix the immediate issue

  3. Security
    - Users can read their own profile
    - Users can update their own profile
    - All authenticated users can read other profiles (needed for user assignment)
    - Users can insert their own profile during registration
*/

-- Drop all existing policies on users table to fix recursion
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own profile"
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

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read other profiles (needed for assignments)
CREATE POLICY "Authenticated users can read profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: For admin functionality, we'll handle role-based permissions in the application layer
-- rather than in RLS policies to avoid recursion issues