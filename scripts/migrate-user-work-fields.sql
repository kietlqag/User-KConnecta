-- Optional manual migration (Hibernate ddl-auto=update also adds these columns).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS workplace VARCHAR(150);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title VARCHAR(120);
