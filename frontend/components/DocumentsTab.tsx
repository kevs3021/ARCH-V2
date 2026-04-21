'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, ExternalLink, Loader2, Upload } from 'lucide-react';

interface RequestDocument {
  document_id: string;
  request_id: string;
  name: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface DocumentsTabProps {
  requestId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsTab({ requestId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [docName, setDocName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}/documents`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load documents');
      setDocuments(json.data ?? []);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name
    if (!docName.trim()) {
      setNameError('Document name is required');
      return;
    }
    setNameError(null);

    if (!file) {
      setUploadError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('name', docName.trim());
      formData.append('file', file);

      const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}/documents`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');

      // Clear form and refresh list
      setDocName('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Document list */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError ? (
          <p className="text-sm text-red-500 text-center py-4">{fetchError}</p>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <FileText className="w-8 h-8 opacity-40" />
            <p className="text-sm">No documents yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40"
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.uploaded_at)} · {doc.uploaded_by}
                  </p>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title="Open file"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </p>

        <div className="space-y-1">
          <label htmlFor="doc-name" className="section-label">
            Document Name
          </label>
          <input
            id="doc-name"
            type="text"
            value={docName}
            onChange={(e) => {
              setDocName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. Invoice #001"
            className="input-field w-full"
            disabled={uploading}
          />
          {nameError && (
            <p className="text-xs text-red-500 mt-1">{nameError}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="doc-file" className="section-label">
            File
          </label>
          <input
            id="doc-file"
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input-field w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            disabled={uploading}
          />
        </div>

        {uploadError && (
          <p className="text-xs text-red-500">{uploadError}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary flex items-center gap-2"
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>
    </div>
  );
}
