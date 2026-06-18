CREATE TABLE IF NOT EXISTS public.policy_keywords (
    id            VARCHAR(64)  PRIMARY KEY,
    value         VARCHAR(255) NOT NULL,
    category      VARCHAR(50)  NOT NULL
        CHECK (category IN ('BLACKLIST', 'WATCHLIST', 'BLOCKED_DOMAIN')),
    keyword_group VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_policy_keywords_value_category
    ON public.policy_keywords (LOWER(value), category);

-- If an older manual migration used lowercase categories, normalize:
ALTER TABLE public.policy_keywords DROP CONSTRAINT IF EXISTS policy_keywords_category_check;
ALTER TABLE public.policy_keywords
    ADD CONSTRAINT policy_keywords_category_check
    CHECK (category IN ('BLACKLIST', 'WATCHLIST', 'BLOCKED_DOMAIN'));
