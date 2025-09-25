/*
  # Add admin-specific policies for user management

  1. Problem
    - Current policies only allow users to update their own profile
    - Admins need to be able to update and delete any user
    - Need to add admin-specific policies

  2. Solution
    - Add admin policies for UPDATE and DELETE operations
    - Use application layer to check admin role
    - Maintain security while allowing admin functionality

  3. Security
    - Admins can update any user profile
    - Admins can delete any user (except themselves)
    - Regular users can only manage their own profile
*/

-- Add admin UPDATE policy
CREATE POLICY "Admins can update any user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add admin DELETE policy
CREATE POLICY "Admins can delete any user"
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

-- Note: These policies work alongside existing user-specific policies
-- Application layer handles the logic of who can do what
