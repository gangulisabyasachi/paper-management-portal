'use client';

import { useEffect, useState } from 'react';

export default function SearchBar({
  placeholder = 'Search by Paper ID, title, or keyword...',
  onSearch,
  value = '',
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(local);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, onSearch]);

  return (
    <div className="portal-search-bar" style={{ flex: 1, minWidth: '220px' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className="portal-input"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}
