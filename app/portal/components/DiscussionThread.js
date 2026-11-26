'use client';

import { useState, useRef, useEffect } from 'react';

export default function DiscussionThread({ paperId, initialMessages = [], currentUser }) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/portal/papers/${paperId}/discussion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send message.');
      } else {
        setMessages(data.discussion?.messages || []);
        setContent('');
      }
    } catch {
      setError('Network error while sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="portal-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Editorial & Reviewer Discussion</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Private thread visible only to Admins, Editors, and assigned Reviewers
          </p>
        </div>
        <span className="portal-tag">{messages.length} message(s)</span>
      </div>

      <div className="portal-discussion-thread">
        {messages.length === 0 ? (
          <p style={{ fontSize: '0.86rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>
            No discussion messages yet. Start a conversation about this manuscript.
          </p>
        ) : (
          messages.map((msg, idx) => {
            const isMine =
              currentUser?._id &&
              (msg.author?._id === currentUser._id || msg.author === currentUser._id);
            return (
              <div
                key={msg._id || idx}
                className={`portal-discussion-message ${isMine ? 'mine' : ''}`}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.35rem',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                      {msg.author?.name || 'Portal Member'}
                    </span>
                    {msg.author?.role && (
                      <span className="portal-tag" style={{ textTransform: 'capitalize' }}>
                        {msg.author.role}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="portal-alert error" style={{ marginTop: '0.75rem' }}>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <input
          type="text"
          className="portal-input"
          placeholder="Write a confidential note to editors and reviewers..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          type="submit"
          className="portal-btn portal-btn-primary"
          disabled={sending || !content.trim()}
        >
          {sending ? 'Sending...' : 'Post'}
        </button>
      </form>
    </div>
  );
}
