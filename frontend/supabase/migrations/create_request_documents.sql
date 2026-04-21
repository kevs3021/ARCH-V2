CREATE TABLE IF NOT EXISTS request_documents (
  document_id   TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL REFERENCES other_requests(request_id),
  name          TEXT NOT NULL,
  filename      TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  uploaded_by   TEXT NOT NULL,
  uploaded_by_id TEXT NOT NULL REFERENCES user_accounts(user_id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE request_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY request_documents_select_policy
  ON request_documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      uploaded_by_id = auth.uid()
      OR request_id IN (
        SELECT request_id FROM other_requests WHERE requestor_id = auth.uid()
      )
    )
  );

CREATE POLICY request_documents_insert_policy
  ON request_documents
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by_id = auth.uid()
  );

CREATE POLICY request_documents_update_policy
  ON request_documents
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND uploaded_by_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by_id = auth.uid()
  );

CREATE POLICY request_documents_delete_policy
  ON request_documents
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND uploaded_by_id = auth.uid()
  );
