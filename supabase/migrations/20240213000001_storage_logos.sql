-- Create a new storage bucket for logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to logos
CREATE POLICY "Give public access to logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

-- Policy to allow authenticated users to upload logos
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'logos' AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to update their logos
CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE USING (
  bucket_id = 'logos' AND auth.role() = 'authenticated'
);
