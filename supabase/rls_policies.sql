-- Enable Row-Level Security on the votes table and create policy
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY votes_policy ON votes
  FOR ALL
  USING (auth.uid() = user_id);

-- (Optional) Enable RLS on the users table and restrict access to admin users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_users_policy ON users
  FOR ALL
  USING (role = 'admin');