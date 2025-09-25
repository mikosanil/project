/*
  # Fix RLS recursion for users table

  1. Security Changes
    - Drop all existing policies that cause recursion
    - Create simple, non-recursive policies
    - Use only auth.uid() without querying users table in policies
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for new user registration)
CREATE POLICY "Users can create own profile" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);