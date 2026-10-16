import React, { useState } from 'react';
import { X, GitFork, ArrowRight, ArrowDown, CheckCircle2, AlertCircle, ArrowLeftRight, Sparkles } from 'lucide-react';
import axios from 'axios';

export default function LiteratureConnectorModal({
  papers = [],
  isOpen,
  onClose,
  onApplyHighlight,
  initialSourceId = ''
}) {
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Update source if initialSourceId changes
  React.useEffect(() => {
    if (initialSourceId) {
      setSourceId(initialSourceId);
    }
  }, [initialSourceId]);

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = sourceId;
    setSourceId(targetId);
    setTargetId(temp);
  };

  const handleCompute = async () => {
    if (!sourceId || !targetId) {
      setError('Please choose both a source and target paper.');
      return;
    }
    if (sourceId === targetId) {
      setError('Source and target papers must be different.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await axios.get('/api/graph/connector', {
        params: { source_id: sourceId, target_id: targetId }
      });
      setResult(res.data);
      if (onApplyHighlight && res.data.path) {
        onApplyHighlight(res.data.path);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'No connecting citation or claim path found between these papers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <GitFork size={18} />
            </div>
            <div>
              <h3 className="modal-title">Literature Connector</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Discover citation and claim bridges connecting disparate fields</p>
            </div>
          </div>
          <button className="hud-btn" onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Paper A */}
            <div>
              <label className="group-label" style={{ display: 'block', marginBottom: 6 }}>
                Starting Paper (Source)
              </label>
              <select
                className="search-input"
                style={{ padding: '10px 12px', cursor: 'pointer' }}
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
              >
                <option value="">Select starting paper...</option>
                {papers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.year})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '0.75rem', gap: 6 }}
                onClick={handleSwap}
                title="Swap source and target"
              >
                <ArrowLeftRight size={13} />
                <span>Swap</span>
              </button>
            </div>

            {/* Paper B */}
            <div>
              <label className="group-label" style={{ display: 'block', marginBottom: 6 }}>
                Target Paper (Destination)
              </label>
              <select
                className="search-input"
                style={{ padding: '10px 12px', cursor: 'pointer' }}
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
              >
                <option value="">Select target paper...</option>
                {papers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.year})
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ justifyContent: 'center', padding: '11px', marginTop: 4 }}
              disabled={loading || !sourceId || !targetId}
              onClick={handleCompute}
            >
              {loading ? (
                <span>Calculating shortest bridge path...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Find Connecting Bridge Path</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              color: '#fda4af',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              fontSize: '0.84rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: '0.88rem', fontWeight: 600 }}>
                <CheckCircle2 size={17} />
                <span>Bridge Discovered: {result.length} Degrees of Separation</span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'var(--bg-surface-elevated)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}>
                {result.nodes.map((node, i) => (
                  <React.Fragment key={node.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: i === 0 || i === result.nodes.length - 1 ? 'var(--accent-primary)' : '#f59e0b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        flexShrink: 0
                      }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                          {node.title}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginLeft: 6 }}>
                          ({node.year})
                        </span>
                      </div>
                    </div>
                    {i < result.nodes.length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 11, gap: 8 }}>
                        <div style={{ width: 2, height: 16, background: '#f59e0b', opacity: 0.6 }} />
                        <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Cites / Extends
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  if (onApplyHighlight && result.path) {
                    onApplyHighlight(result.path);
                  }
                  onClose();
                }}
              >
                <span>View Highlighted Bridge in Graph</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
