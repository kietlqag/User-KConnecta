-- Separate comments/reactions on share wrappers from the original post.

ALTER TABLE post_comments
    ADD COLUMN IF NOT EXISTS share_id UUID REFERENCES post_shares(id) ON DELETE CASCADE;

ALTER TABLE post_reactions
    ADD COLUMN IF NOT EXISTS share_id UUID REFERENCES post_shares(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_post_comments_share_id ON post_comments(share_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_share_id ON post_reactions(share_id);

ALTER TABLE post_reactions DROP CONSTRAINT IF EXISTS uk_post_reaction;

CREATE UNIQUE INDEX IF NOT EXISTS uk_post_reaction_post
    ON post_reactions(post_id, user_id)
    WHERE share_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_post_reaction_share
    ON post_reactions(share_id, user_id)
    WHERE share_id IS NOT NULL;
