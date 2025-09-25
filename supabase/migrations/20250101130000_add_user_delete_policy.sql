/*
  # Add DELETE policy for users table

  1. Problem
    - Users cannot be deleted because there's no DELETE policy on users table
    - Admin users need to be able to delete other users

  2. Solution
    - Add DELETE policy for admins to delete users
    - Allow users to delete their own profile
    - Maintain security by checking admin role

  3. Security
    - Only admins can delete other users
    - Users can delete their own profile
    - Regular users cannot delete other users
*/

-- Add DELETE policy for admins to delete users
CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
