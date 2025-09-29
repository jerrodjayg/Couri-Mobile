-- Fix transactions table to support web invitation system
-- Run this in your Supabase SQL Editor

-- Add missing columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS item_title TEXT,
ADD COLUMN IF NOT EXISTS item_description TEXT,
ADD COLUMN IF NOT EXISTS item_image TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Facebook Marketplace',
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'invitation' CHECK (transaction_type IN ('invitation', 'request')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- Make amount and item_title required (NOT NULL)
-- Note: This will fail if there are existing rows, so run this only on empty table
-- If you have existing data, you'll need to populate these columns first

-- Update existing rows to have default values (if any exist)
UPDATE transactions 
SET 
  amount = 0,
  item_title = 'Legacy Transaction',
  source = 'Facebook Marketplace',
  transaction_type = 'invitation',
  expires_at = NOW() + INTERVAL '7 days'
WHERE amount IS NULL OR item_title IS NULL;

-- Now make them NOT NULL
ALTER TABLE transactions 
ALTER COLUMN amount SET NOT NULL,
ALTER COLUMN item_title SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
CREATE INDEX IF NOT EXISTS idx_transactions_item_title ON transactions(item_title);
CREATE INDEX IF NOT EXISTS idx_transactions_expires_at ON transactions(expires_at);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);

-- Update foreign key constraints to properly reference auth.users
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_inviter_id_fkey,
DROP CONSTRAINT IF EXISTS transactions_invitee_id_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_inviter_id_fkey 
FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
ADD CONSTRAINT transactions_invitee_id_fkey 
FOREIGN KEY (invitee_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create functions for invitation handling
CREATE OR REPLACE FUNCTION accept_transaction_invitation(transaction_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transactions 
  SET 
    invitee_id = user_id,
    status = 'accepted',
    updated_at = NOW()
  WHERE id = transaction_id 
    AND status = 'pending'
    AND expires_at > NOW();
  
  RETURN FOUND;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION decline_transaction_invitation(transaction_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE transactions 
  SET 
    status = 'declined',
    updated_at = NOW()
  WHERE id = transaction_id 
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ language 'plpgsql';

-- Create function to generate invitation URL
CREATE OR REPLACE FUNCTION generate_invitation_url(transaction_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://gocouri.com/invite/' || transaction_id::text;
END;
$$ language 'plpgsql';

-- Create function to clean up expired transactions
CREATE OR REPLACE FUNCTION cleanup_expired_transactions()
RETURNS void AS $$
BEGIN
  UPDATE transactions 
  SET status = 'expired' 
  WHERE expires_at < NOW() 
    AND status = 'pending';
END;
$$ language 'plpgsql';

-- Create a view for active transactions with user info
CREATE OR REPLACE VIEW active_transactions AS
SELECT 
  t.*,
  inviter.full_name as inviter_name,
  inviter.email as inviter_email,
  invitee.full_name as invitee_name,
  invitee.email as invitee_email
FROM transactions t
LEFT JOIN auth.users inviter ON t.inviter_id = inviter.id
LEFT JOIN auth.users invitee ON t.invitee_id = invitee.id
WHERE t.status IN ('pending', 'accepted');

-- Grant access to the view
GRANT SELECT ON active_transactions TO authenticated;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
