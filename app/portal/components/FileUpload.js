'use client';

import { useRef, useState } from 'react';
import {
  isAllowedManuscriptFile,
  RECOMMENDED_BYTES,
  MAX_BYTES,
} from '@/lib/portal/clientUpload';

export default function FileUpload({
  onFileSelect,
  accept = '.doc,.docx',
  currentFile = null,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const validateAndEmit = (file) => {
    setError('');
    if (!file) return;

    if (!isAllowedManuscriptFile(file)) {
      setError('Only Microsoft Word files (.doc or .docx) are allowed.');
      return;
    }

    onFileSelect(file);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isAboveRecommended = currentFile && currentFile.size > RECOMMENDED_BYTES && currentFile.size <= MAX_BYTES;
  const willAutoCompress = currentFile && currentFile.size > MAX_BYTES;

  return (
    <div>
      <div
        className={`portal-file-upload ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          validateAndEmit(dropped);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => validateAndEmit(e.target.files?.[0])}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          {currentFile ? (
            <div>
              <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                {currentFile.name}
              </p>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: willAutoCompress ? '#b45309' : '#059669',
                  marginTop: '0.2rem',
                  fontWeight: 600,
                }}
              >
                {formatBytes(currentFile.size)} •{' '}
                {willAutoCompress
                  ? 'Exceeds 10 MB — will auto-compress before submitting'
                  : 'Ready to upload (click to replace)'}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.94rem' }}>
                Click to upload or drag & drop manuscript (.docx or .doc)
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                Recommended under 5 MB • Files over 10 MB are auto-compressed before upload
              </p>
            </div>
          )}
        </div>
      </div>

      {isAboveRecommended && (
        <div className="portal-alert warning" style={{ marginTop: '0.65rem' }}>
          <span>
            Suggested max size is 5 MB (your file is {formatBytes(currentFile.size)}, still accepted up to 10 MB).
          </span>
        </div>
      )}

      {willAutoCompress && (
        <div className="portal-alert info" style={{ marginTop: '0.65rem' }}>
          <span>
            This file exceeds 10 MB ({formatBytes(currentFile.size)}). It will be automatically compressed in your browser before uploading.
          </span>
        </div>
      )}

      {error && (
        <div className="portal-alert error" style={{ marginTop: '0.65rem' }}>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
