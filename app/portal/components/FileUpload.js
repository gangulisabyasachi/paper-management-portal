'use client';

import { useRef, useState } from 'react';

export default function FileUpload({
  onFileSelect,
  accept = '.pdf',
  maxSize = 15 * 1024 * 1024,
  currentFile = null,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const validateAndEmit = (file) => {
    setError('');
    if (!file) return;

    if (accept === '.pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files (.pdf) are allowed.');
      return;
    }

    if (file.size > maxSize) {
      const mb = Math.round(maxSize / (1024 * 1024));
      setError(`File exceeds the ${mb} MB limit.`);
      return;
    }

    onFileSelect(file);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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
              <p style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.2rem' }}>
                {formatBytes(currentFile.size)} • Ready to upload (click to replace)
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.94rem' }}>
                Click to upload or drag & drop manuscript PDF
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                PDF only, max {Math.round(maxSize / (1024 * 1024))} MB
              </p>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="portal-alert error" style={{ marginTop: '0.65rem' }}>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
