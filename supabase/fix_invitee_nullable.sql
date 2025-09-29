-- Quick fix to make invitee_id nullable for invitation system
-- Run this in your Supabase SQL Editor

-- Make invitee_id nullable so we can create invitations without an invitee
ALTER TABLE transactions 
ALTER COLUMN invitee_id DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name = 'invitee_id';
