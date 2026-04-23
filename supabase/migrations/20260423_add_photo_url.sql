-- 20260423_add_photo_url.sql
--
-- Purpose:
--   Add photo_url column to games so a coach can attach a field/team photo
--   to each game. The actual image is stored in Supabase Storage (game-photos bucket).
--   This column just holds the public URL pointing to that file.
--
-- Storage setup (run once manually in each Supabase project):
--   1. Create a public bucket named "game-photos" in Supabase Storage.
--   2. Run the policy below to allow anon uploads.

ALTER TABLE games ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Allow the anon role to upload files to the game-photos bucket
CREATE POLICY "anon can upload game photos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'game-photos');
