import React, { useState } from 'react';
import { X, ExternalLink, Star, Copy, Check, BookOpen, Quote, Sparkles, GitFork, ArrowUpRight, ShieldAlert } from 'lucide-react';

export default function InspectionDrawer({ selectedNode, onClose, onOpenConnectorWithPaper }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  if (!selectedNode) return null;

  const details = selectedNode.details || {};
  const claims = details.claims || [];

  const handleCopyBibtex = () => {
    const bibtex = `@article{${selectedNode.id},
  title={${details.title || selectedNode.label}},
  author={${(details.authors || []).join(' and ')}},
  year={${details.year || '2024'}},
  doi={${details.doi || ''}}
}`;
    navigator.clipboard.writeText(bibtex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="inspector-drawer">
      {/* Header */}
      <div className="inspector-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="inspector-badges-row">
            {selectedNode.is_landmark && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Star size={11} fill="#f59e0b" />
                <span>Landmark Paper</span>
              </span>
            )}
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--border-highlight)'
              }}
            >
              {details.cluster_name || `Cluster ${selectedNode.cluster}`}
            </span>
          </div>
          <h2 className="inspector-title">{details.title || selectedNode.label}</h2>
        </div>
        <button className="hud-btn" onClick={onClose} title="Close Inspector">
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs">
        <button
          className={`inspector-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview & Abstract
        </button>
        <button
          className={`inspector-tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Key Claims ({claims.length})
        </button>
      </div>

      <div className="inspector-body">
        {/* Telemetry Strip */}
        <div className="meta-stats-strip">
          <div className="stat-cell">
            <span className="stat-cell-val">{details.year || '2024'}</span>
            <span className="stat-cell-lbl">Year</span>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />
          <div className="stat-cell">
            <span className="stat-cell-val" style={{ color: 'var(--accent-primary)' }}>
              {(details.citation_count || 0).toLocaleString()}
            </span>
            <span className="stat-cell-lbl">Citations</span>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />
          <div className="stat-cell">
            <span className="stat-cell-val" style={{ color: '#10b981' }}>
              {selectedNode.pagerank ? (selectedNode.pagerank * 100).toFixed(1) : '5.0'}
            </span>
            <span className="stat-cell-lbl">Centrality</span>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Authors */}
            <div className="filter-group">
              <label className="group-label">Authors</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {(details.authors || []).join(', ') || 'Authors not specified'}
              </p>
            </div>

            {/* Abstract */}
            <div className="filter-group">
              <label className="group-label">Abstract</label>
              <div className="abstract-text-block">
                {details.abstract || 'No abstract text available for this paper.'}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
              {onOpenConnectorWithPaper && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onOpenConnectorWithPaper(selectedNode.id)}
                >
                  <GitFork size={15} />
                  <span>Find Bridge Paths From This Paper</span>
                </button>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {details.doi && (
                  <a
                    href={`https://doi.org/${details.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ flex: 1, textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} />
                    <span>Open DOI</span>
                  </a>
                )}
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleCopyBibtex}
                >
                  {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied BibTeX' : 'Copy BibTeX'}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Claims Tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Scientific claims and methodology extracted via multimodal NLP analysis:
            </p>

            {claims.length > 0 ? (
              claims.map((c, idx) => {
                const isLimitation = c.category === 'Limitation';
                const isMethod = c.category === 'Methodology';
                const badgeColor = isLimitation ? '#f43f5e' : isMethod ? '#a855f7' : '#0284c7';
                return (
                  <div key={idx} className="claim-card-modern">
                    <div className="claim-card-header">
                      <span
                        className="claim-badge-pill"
                        style={{
                          backgroundColor: `${badgeColor}18`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}35`
                        }}
                      >
                        {c.category}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {Math.round((c.confidence || 0.9) * 100)}% confidence
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.84rem' }}>
                      {c.text}
                    </p>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '30px 16px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <Sparkles size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  No individual claims extracted yet for this paper.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
