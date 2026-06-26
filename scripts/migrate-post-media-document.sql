-- Allow DOCUMENT attachments on posts (pdf, doc, docx, txt).
ALTER TABLE public.post_media DROP CONSTRAINT IF EXISTS post_media_media_type_check;
ALTER TABLE public.post_media ADD CONSTRAINT post_media_media_type_check
    CHECK (media_type IN ('IMAGE', 'VIDEO', 'DOCUMENT'));
