ALTER TABLE content_documents ADD COLUMN chunk_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS content_document_chunks (
  document_key TEXT NOT NULL REFERENCES content_documents(document_key) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  content_chunk TEXT NOT NULL,
  PRIMARY KEY (document_key, chunk_index)
);

