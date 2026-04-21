// components/requests/FileUpload.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, GripVertical, FileText, Image as ImageIcon, File } from 'lucide-react';

interface FileItem {
  file: File;
  id: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
  if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadProps {
  files: FileItem[];
  onChange: (files: FileItem[]) => void;
}

export default function FileUpload({ files, onChange }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const validFiles = Array.from(newFiles).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );
      const items: FileItem[] = validFiles.map((file) => ({
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }));
      onChange([...files, ...items]);
    },
    [files, onChange]
  );

  const removeFile = useCallback(
    (id: string) => {
      onChange(files.filter((f) => f.id !== id));
    },
    [files, onChange]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleReorderDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...files];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setDragIndex(index);
    onChange(reordered);
  };

  const handleReorderDragEnd = () => {
    setDragIndex(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...files];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    onChange(reordered);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    const reordered = [...files];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    onChange(reordered);
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
          }
        `}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium text-foreground">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse — PDF, Images, Word
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File list with reordering */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Drag to reorder or use arrows — order determines page order in merged PDF
            </p>
          )}
          {files.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleReorderDragStart(index)}
              onDragOver={(e) => handleReorderDragOver(e, index)}
              onDragEnd={handleReorderDragEnd}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 text-sm
                ${dragIndex === index ? 'opacity-50 ring-2 ring-primary/30' : ''}
              `}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
              <span className="flex-shrink-0 text-muted-foreground">{getFileIcon(item.file.type)}</span>
              <span className="flex-1 truncate text-foreground">{item.file.name}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatSize(item.file.size)}
              </span>
              {files.length > 1 && (
                <div className="flex flex-col flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === files.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none"
                  >
                    ▼
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(item.id)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-error-container text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
