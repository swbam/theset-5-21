-- 004_duplicate_vote_constraint.sql
-- This migration adds a UNIQUE constraint to the votes table to prevent
-- duplicate voting by a user on the same setlist.

ALTER TABLE votes
  ADD CONSTRAINT unique_user_setlist UNIQUE (user_id, setlist_id);