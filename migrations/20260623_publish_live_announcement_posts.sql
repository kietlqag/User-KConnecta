UPDATE public.posts p
SET status = 'PUBLISHED',
    published_at = COALESCE(p.published_at, p.created_at)
FROM public.live_sessions ls
WHERE ls.post_id = p.id
  AND ls.status = 'SCHEDULED'
  AND p.status = 'SCHEDULED';
