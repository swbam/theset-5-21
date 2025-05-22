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
-- Updated RLS Policies for Production Readiness

-- Enable RLS and add policies for the Artists table
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY artists_read ON artists
  FOR SELECT
  USING (true);
CREATE POLICY artists_write ON artists
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Enable RLS and add policies for the Shows table
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY shows_read ON shows
  FOR SELECT
  USING (true);
CREATE POLICY shows_write ON shows
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Enable RLS and add policies for the Setlists table
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY setlists_read ON setlists
  FOR SELECT
  USING (true);
CREATE POLICY setlists_write ON setlists
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Enable RLS and add policies for the Setlists Votes table
ALTER TABLE setlists_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY votes_read ON setlists_votes
  FOR SELECT
  USING (true);
CREATE POLICY votes_write ON setlists_votes
  FOR INSERT, UPDATE, DELETE
  USING (auth.uid() = created_by OR is_admin(auth.uid()));