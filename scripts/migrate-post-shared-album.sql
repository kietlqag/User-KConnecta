-- Link feed posts to shared albums (share album to feed feature).
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS shared_album_id UUID NULL REFERENCES public.albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_shared_album_id ON public.posts(shared_album_id);
