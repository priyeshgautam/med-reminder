/*
  # Add insert policy for managed_users table

  1. Changes
    - Add insert policy to allow authenticated users to create managed users where they are the owner

  2. Security
    - Users can only create managed users where they are set as the owner
    - Maintains data isolation between users
*/

CREATE POLICY "Users can create managed users" 
ON managed_users 
FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());