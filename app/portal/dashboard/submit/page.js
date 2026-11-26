'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '../../components/FileUpload';

const EMPTY_COAUTHOR = {
  name: '',
  email: '',
  phone: '',
  academicDesignation: '',
  affiliation: '',
};

export default function SubmitPaperPage() {
  const router = useRouter();
  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState('');
  const [targetIssueId, setTargetIssueId] = useState('');
  const [mainAuthor, setMainAuthor] = useState({
    name: '',
    email: '',
    phone: '',
    academicDesignation: '',
    affiliation: '',
  });
  const [coAuthors, setCoAuthors] = useState([]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInitial() {
      try {
        const [issRes, sessRes] = await Promise.all([
          fetch('/api/portal/admin/issues?status=open', { cache: 'no-store' }),
          fetch('/api/portal/auth/session', { cache: 'no-store' }),
        ]);
        const [issData, sessData] = await Promise.all([
          issRes.json(),
          sessRes.json(),
        ]);

        const openIssues = issData.issues || [];
        setIssues(openIssues);
        if (openIssues.length > 0) {
          setTargetIssueId(openIssues[0]._id);
        }

        if (sessData?.user) {
          setMainAuthor((prev) => ({
            name: prev.name || sessData.user.name || '',
            email: prev.email || sessData.user.email || '',
            phone: prev.phone || sessData.user.phone || '',
            academicDesignation:
              prev.academicDesignation || sessData.user.academicDesignation || '',
            affiliation: prev.affiliation || sessData.user.affiliation || '',
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingIssues(false);
      }
    }
    loadInitial();
  }, []);

  const updateMainAuthor = (field, value) => {
    const clean =
      field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setMainAuthor((prev) => ({ ...prev, [field]: clean }));
  };

  const addCoAuthor = () => {
    setCoAuthors((prev) => [...prev, { ...EMPTY_COAUTHOR }]);
  };

  const updateCoAuthor = (idx, field, value) => {
    const clean =
      field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setCoAuthors((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: clean } : a))
    );
  };

  const removeCoAuthor = (idx) => {
    setCoAuthors((prev) => prev.filter((_, i) => i !== idx));
  };

  const keywordTags = keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!targetIssueId) {
      setError('Please select a target WISDOM Journal issue.');
      return;
    }

    if (
      !mainAuthor.name.trim() ||
      !mainAuthor.email.trim() ||
      !mainAuthor.phone.trim() ||
      !mainAuthor.academicDesignation.trim() ||
      !mainAuthor.affiliation.trim()
    ) {
      setError(
        'Please complete all mandatory Main Author fields (Name, Email, Phone Number, Academic Designation, and Institution Name).'
      );
      return;
    }

    if (!/^\d{10}$/.test(mainAuthor.phone.trim())) {
      setError('Main Author phone number must be exactly 10 digits.');
      return;
    }

    for (let i = 0; i < coAuthors.length; i++) {
      const ca = coAuthors[i];
      if (
        !ca.name.trim() ||
        !ca.email.trim() ||
        !ca.phone.trim() ||
        !ca.academicDesignation.trim() ||
        !ca.affiliation.trim()
      ) {
        setError(
          `Please complete all mandatory fields for Co-Author #${i + 1} (Name, Email, Phone Number, Academic Designation, and Institution Name).`
        );
        return;
      }
      if (!/^\d{10}$/.test(ca.phone.trim())) {
        setError(`Co-Author #${i + 1} phone number must be exactly 10 digits.`);
        return;
      }
    }

    if (!file) {
      setError('Please attach your manuscript PDF file.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('abstract', abstract.trim());
      fd.append('keywords', keywords);
      fd.append('targetIssueId', targetIssueId);
      fd.append('mainAuthor', JSON.stringify(mainAuthor));
      fd.append('coAuthors', JSON.stringify(coAuthors));
      fd.append('file', file);

      const res = await fetch('/api/portal/papers', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Submission failed.');
      } else {
        router.push(`/portal/dashboard/paper/${data.paper._id}?submitted=1`);
      }
    } catch {
      setError('Network error while submitting manuscript.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="portal-page-header">
        <div>
          <h1 className="portal-page-title">Submit New Manuscript</h1>
          <p className="portal-page-subtitle">
            Complete the metadata below, select an open journal issue, and upload your PDF.
          </p>
        </div>
      </div>

      {error && (
        <div className="portal-alert error" style={{ marginBottom: '1.25rem' }}>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Target Issue Selection */}
        <div className="portal-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            1. Select Target Journal Issue *
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '1rem' }}>
            Choose which currently open WISDOM Journal volume & issue you are submitting to.
          </p>

          {loadingIssues ? (
            <div className="portal-skeleton" style={{ height: '48px' }} />
          ) : issues.length === 0 ? (
            <div className="portal-alert warning">
              <span>
                No journal issues are currently open for submission. Please check back soon or contact the editorial office.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <select
                className="portal-select"
                value={targetIssueId}
                onChange={(e) => setTargetIssueId(e.target.value)}
                required
              >
                {issues.map((iss) => {
                  const label = iss.title || `WISDOM Journal Vol ${iss.volume} Issue ${iss.issue}`;
                  const deadlineStr = iss.submissionDeadline
                    ? ` (Deadline: ${new Date(iss.submissionDeadline).toLocaleDateString()})`
                    : '';
                  return (
                    <option key={iss._id} value={iss._id}>
                      {label}{deadlineStr}
                    </option>
                  );
                })}
              </select>
              {issues.find((i) => i._id === targetIssueId)?.description && (
                <p style={{ fontSize: '0.82rem', color: '#475569' }}>
                  {issues.find((i) => i._id === targetIssueId).description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Paper Metadata */}
        <div className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2. Manuscript Details</h2>

          <div>
            <label className="portal-label">Manuscript Title *</label>
            <input
              type="text"
              className="portal-input"
              placeholder="Enter full title of your research paper"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="portal-label">Abstract *</label>
            <textarea
              className="portal-textarea"
              rows={6}
              placeholder="Paste or type your structured abstract..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="portal-label">Keywords (comma-separated, used for reviewer matching) *</label>
            <input
              type="text"
              className="portal-input"
              placeholder="e.g. Constitutional Law, AI Governance, Machine Learning, Ethics"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              required
            />
            {keywordTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.55rem' }}>
                {keywordTags.map((tag, i) => (
                  <span key={i} className="portal-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Main Author Details */}
        <div className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>3. Main / Corresponding Author Details *</h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              All fields below are mandatory for the primary submitting author.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            <div>
              <label className="portal-label">Full Name *</label>
              <input
                type="text"
                className="portal-input"
                placeholder="Dr. Aarav Sen"
                value={mainAuthor.name}
                onChange={(e) => updateMainAuthor('name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="portal-label">Email Address *</label>
              <input
                type="email"
                className="portal-input"
                placeholder="aarav.sen@university.edu"
                value={mainAuthor.email}
                onChange={(e) => updateMainAuthor('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="portal-label">Phone Number (10 digits) *</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                className="portal-input"
                placeholder="9876543210"
                value={mainAuthor.phone}
                onChange={(e) => updateMainAuthor('phone', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="portal-label">Academic Designation *</label>
              <input
                type="text"
                className="portal-input"
                placeholder="e.g. Assistant Professor, PhD Scholar"
                value={mainAuthor.academicDesignation}
                onChange={(e) => updateMainAuthor('academicDesignation', e.target.value)}
                required
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="portal-label">Institution Name *</label>
              <input
                type="text"
                className="portal-input"
                placeholder="e.g. University of Calcutta"
                value={mainAuthor.affiliation}
                onChange={(e) => updateMainAuthor('affiliation', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Section 4: Co-Authors (Optional, all fields mandatory when added) */}
        <div className="portal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>4. Co-Authors (Optional)</h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                If adding co-authors, Name, Email, Phone Number, Academic Designation, and Institution Name are all mandatory.
              </p>
            </div>
            <button
              type="button"
              onClick={addCoAuthor}
              className="portal-btn portal-btn-outline portal-btn-sm"
            >
              + Add Co-Author
            </button>
          </div>

          {coAuthors.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No co-authors added.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {coAuthors.map((author, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      Co-Author #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCoAuthor(idx)}
                      className="portal-btn portal-btn-ghost portal-btn-sm"
                      style={{ color: '#dc2626' }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="portal-label">Full Name *</label>
                      <input
                        type="text"
                        className="portal-input"
                        placeholder="Full Name"
                        value={author.name}
                        onChange={(e) => updateCoAuthor(idx, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="portal-label">Email *</label>
                      <input
                        type="email"
                        className="portal-input"
                        placeholder="Email Address"
                        value={author.email}
                        onChange={(e) => updateCoAuthor(idx, 'email', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="portal-label">Phone Number (10 digits) *</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        pattern="\d{10}"
                        className="portal-input"
                        placeholder="9876543210"
                        value={author.phone}
                        onChange={(e) => updateCoAuthor(idx, 'phone', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="portal-label">Academic Designation *</label>
                      <input
                        type="text"
                        className="portal-input"
                        placeholder="e.g. Associate Professor"
                        value={author.academicDesignation}
                        onChange={(e) =>
                          updateCoAuthor(idx, 'academicDesignation', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="portal-label">Institution Name *</label>
                      <input
                        type="text"
                        className="portal-input"
                        placeholder="Institution / University Name"
                        value={author.affiliation}
                        onChange={(e) => updateCoAuthor(idx, 'affiliation', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: PDF Upload */}
        <div className="portal-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            5. Upload Manuscript PDF *
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '1rem' }}>
            Ensure your manuscript is anonymized for double-blinded peer review if applicable.
          </p>
          <FileUpload onFileSelect={setFile} currentFile={file} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={() => router.push('/portal/dashboard')}
            className="portal-btn portal-btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="portal-btn portal-btn-primary"
            disabled={submitting || issues.length === 0}
          >
            {submitting ? 'Submitting Manuscript...' : 'Submit Manuscript'}
          </button>
        </div>
      </form>
    </div>
  );
}
