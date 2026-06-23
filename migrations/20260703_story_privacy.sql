-- Story privacy + specific friend audience (safe for existing rows)
ALTER TABLE public.stories
    ADD COLUMN IF NOT EXISTS privacy VARCHAR(255);

UPDATE public.stories
SET privacy = 'PUBLIC'
WHERE privacy IS NULL;

ALTER TABLE public.stories
    ALTER COLUMN privacy SET DEFAULT 'PUBLIC';

ALTER TABLE public.stories
    ALTER COLUMN privacy SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.story_audience_allowances (
    id UUID PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    allowed_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT uk_story_allowance UNIQUE (story_id, allowed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_audience_allowances_story
    ON public.story_audience_allowances(story_id);

CREATE INDEX IF NOT EXISTS idx_story_audience_allowances_user
    ON public.story_audience_allowances(allowed_user_id);
