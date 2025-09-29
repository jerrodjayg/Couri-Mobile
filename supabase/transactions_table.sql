-- Create transactions table for storing transaction invitations and details
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  item_title TEXT NOT NULL,
  item_description TEXT,
  item_image TEXT,
  source TEXT DEFAULT 'Facebook Marketplace',
  
  -- Participants
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  
  -- Transaction type
  transaction_type TEXT DEFAULT 'invitation' CHECK (transaction_type IN ('invitation', 'request')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_inviter_id ON transactions(inviter_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invitee_id ON transactions(invitee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_expires_at ON transactions(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view transactions they're involved in
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    auth.uid() = inviter_id OR 
    auth.uid() = invitee_id OR
    status = 'pending' -- Allow viewing pending invitations
  );

-- Create policy to allow users to create transactions
CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- Create policy to allow users to update their own transactions
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (
    auth.uid() = inviter_id OR 
    auth.uid() = invitee_id
  );

-- Create policy to allow users to delete their own transactions
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = inviter_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transactions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_transactions_updated_at_column();

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

-- Create a view for active transactions
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

-- Create function to generate invitation URL
CREATE OR REPLACE FUNCTION generate_invitation_url(transaction_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://gocouri.com/invite/' || transaction_id::text;
END;
$$ language 'plpgsql';

-- Create function to accept transaction invitation
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

-- Create function to decline transaction invitation
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
