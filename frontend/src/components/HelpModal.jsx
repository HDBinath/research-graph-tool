import React from 'react';
import { X, Network, Star, ArrowRight, Layers, Compass, BookOpen } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Compass size={22} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 className="modal-title">How to Read ResearchGraph</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>A 60-second guide to navigating literature networks</p>
            </div>
          </div>
          <button className="hud-btn" onClick={onClose} title="Close Guide">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 20 }}>
          {/* Card 1: Nodes */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
              <Network size={20} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4, color: 'var(--text-primary)' }}>
                Papers (Nodes)
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Each circular node represents a scientific research paper.
              </p>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, paddingLeft: 18, lineHeight: 1.6 }}>
                <li><strong>Node Size:</strong> Proportional to PageRank & Citation Influence. Larger nodes are foundational works.</li>
                <li><strong>Gold Border (<Star size={12} style={{ display: 'inline', color: '#f59e0b', verticalAlign: -1 }} />):</strong> Denotes landmark papers with high scientific centrality.</li>
                <li><strong>Node Color:</strong> Shows the thematic research cluster (e.g. Architectures, RLHF, Scaling).</li>
              </ul>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: 'var(--border-subtle)' }} />

          {/* Card 2: Relationship Edges */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
              <Layers size={20} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4, color: 'var(--text-primary)' }}>
                Evidence & Connections (Edges)
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Arrows represent how ideas and citations flow between papers:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                  <span style={{ width: 16, height: 3, borderRadius: 2, background: '#6366f1' }} />
                  <span><strong>Citations:</strong> Formal scholarly links</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                  <span style={{ width: 16, height: 3, borderRadius: 2, background: '#10b981' }} />
                  <span><strong>Supports:</strong> Confirms or backs claims</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                  <span style={{ width: 16, height: 0, borderTop: '2px dashed #f43f5e' }} />
                  <span><strong>Contradicts:</strong> Disputes findings</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                  <span style={{ width: 16, height: 3, borderRadius: 2, background: '#a855f7' }} />
                  <span><strong>Extends:</strong> Builds upon methodology</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: 'var(--border-subtle)' }} />

          {/* Card 3: Interaction Tips */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4, color: 'var(--text-primary)' }}>
                Interactive Workflows
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div><strong>Click any Node:</strong> Opens the detailed drawer with abstract, extracted claims, and BibTeX citation.</div>
                <div><strong>Literature Connector:</strong> Find the shortest scientific bridge connecting any two distant papers.</div>
                <div><strong>View Switcher:</strong> Switch between interactive 2D Graph and clean Paper Catalog view anytime from the top bar.</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 20px' }}>
              <span>Got it, let's explore!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
