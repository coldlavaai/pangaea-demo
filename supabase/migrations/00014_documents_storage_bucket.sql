-- Create the operative-documents storage bucket (if not already created)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operative-documents',
  'operative-documents',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role full access to operative-documents"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'operative-documents')
  WITH CHECK (bucket_id = 'operative-documents');

-- Allow authenticated users in same org to view documents
CREATE POLICY IF NOT EXISTS "Authenticated users can view operative-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'operative-documents');
