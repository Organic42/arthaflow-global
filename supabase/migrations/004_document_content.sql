-- ============================================================
-- 004: AI Document Generator — store generated content
-- Adds structured content + doc type + product link to documents.
-- Safe to run multiple times.
-- ============================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content JSONB,
  ADD COLUMN IF NOT EXISTS doc_type TEXT
    CHECK (doc_type IN ('product_export_sheet', 'hs_classification', 'proforma_invoice')),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Users can insert their own documents (needed by the generator API)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents'
      AND policyname = 'Users can insert own documents'
  ) THEN
    CREATE POLICY "Users can insert own documents" ON public.documents
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
