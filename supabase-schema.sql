-- ============================================================
-- Peach Email Builder - Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  thumbnail TEXT,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Template versions (edit history)
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content JSONB NOT NULL,
  version_number INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reusable components library
CREATE TABLE IF NOT EXISTS components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Custom',
  content JSONB NOT NULL,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

-- Templates RLS policies
CREATE POLICY "Users can view own templates" ON templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own templates" ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON templates FOR DELETE USING (auth.uid() = user_id);

-- Template versions RLS policies
CREATE POLICY "Users can view own versions" ON template_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own versions" ON template_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own versions" ON template_versions FOR DELETE USING (auth.uid() = user_id);

-- Components RLS policies
CREATE POLICY "Users can view own components" ON components FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own components" ON components FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own components" ON components FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own components" ON components FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER components_updated_at BEFORE UPDATE ON components FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for email images
INSERT INTO storage.buckets (id, name, public) VALUES ('email-images', 'email-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'email-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view email images" ON storage.objects
  FOR SELECT USING (bucket_id = 'email-images');

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (bucket_id = 'email-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_components_user_id ON components(user_id);
