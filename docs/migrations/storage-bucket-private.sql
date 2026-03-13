-- ============================================================
-- MIGRATION: Make operative-documents bucket PRIVATE
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- DATE: 2026-03-11
-- WHY: Bucket was public — anyone could guess file URLs and
--      download passport photos, ID documents, CSCS cards
-- ============================================================

-- 1. Set bucket to private (prevents direct URL access)
UPDATE storage.buckets
SET public = false
WHERE id = 'operative-documents';

-- 2. Keep the existing RLS policies but verify they exist
-- Authenticated users can upload (INSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated uploads to operative-documents'
  ) THEN
    CREATE POLICY "Allow authenticated uploads to operative-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'operative-documents');
  END IF;
END $$;

-- Authenticated users can view (SELECT) — needed for signed URL generation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated reads from operative-documents'
  ) THEN
    CREATE POLICY "Allow authenticated reads from operative-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'operative-documents');
  END IF;
END $$;

-- Service role (used by webhooks/cron) can do everything — no policy needed,
-- service role bypasses RLS automatically.

-- ============================================================
-- IMPORTANT: After running this, document images in the BOS
-- will need signed URLs to display. The code changes for this
-- are in the next commit.
-- ============================================================
