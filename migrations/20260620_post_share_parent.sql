-- Track reshares from a specific share wrapper (parent share on timeline).

ALTER TABLE post_shares
    ADD COLUMN IF NOT EXISTS parent_share_id UUID REFERENCES post_shares(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_post_shares_parent_share_id ON post_shares(parent_share_id);
