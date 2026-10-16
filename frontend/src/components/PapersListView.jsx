import React from 'react';
import { BookOpen, Star, Quote, Sparkles, ExternalLink, ArrowRight, Layers } from 'lucide-react';

const CLUSTER_COLORS = [
  '#38bdf8', // Cyan
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

export default function PapersListView({
  nodes = [],
  clusters = [],
  filterClusters,
  filterEdgeTypes,
  landmarksOnly,
  searchQuery,
  onSelectNode,
  onSwitchToGraph
}) {
  // Apply same filters as graph canvas
  const filteredNodes = nodes.filter(n => {
    const data = n.data || {};
    if (landmarksOnly && !data.is_landmark) return false;
    if (filterClusters && filterClusters[data.cluster] === false) return false;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (data.label || '').toLowerCase().includes(q) || (data.details?.title || '').toLowerCase().includes(q);
      const authorsMatch = (data.details?.authors || []).some(a => a.toLowerCase().includes(q));
      if (!titleMatch && !authorsMatch) return false;
    }
    return true;
  });

  return (
    <div className="list-view-container">
      <div className="list-view-header">
        <div>
          <h2 className="list-view-title">Research Papers Catalog</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing {filteredNodes.length} of {nodes.length} papers
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onSwitchToGraph}
          style={{ gap: 6 }}
        >
          <Layers size={15} />
          <span>View in Interactive Graph</span>
        </button>
      </div>

      {filteredNodes.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <BookOpen size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No papers match your filter</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Try adjusting your search query or cluster toggles in the sidebar.</p>
        </div>
      ) : (
        <div className="papers-grid">
          {filteredNodes.map(node => {
            const data = node.data || {};
            const details = data.details || {};
            const clusterIdx = data.cluster || 0;
            const clusterColor = CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
            const clusterName = details.cluster_name || `Cluster ${clusterIdx}`;
            const authorsList = (details.authors || []).join(', ') || 'Unknown Authors';
            const claimsCount = (details.claims || []).length;

            return (
              <div
                key={data.id}
                className="paper-grid-card"
                onClick={() => onSelectNode(data)}
              >
                <div className="paper-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: `${clusterColor}18`,
                        color: clusterColor,
                        border: `1px solid ${clusterColor}33`
                      }}
                    >
                      {clusterName}
                    </span>
                    {data.is_landmark && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}
                      >
                        <Star size={11} fill="#f59e0b" />
                        <span>Landmark</span>
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {details.year || 2024}
                  </span>
                </div>

                <div>
                  <h3 className="paper-card-title">
                    {details.title || data.label}
                  </h3>
                  <p className="paper-card-authors" style={{ marginTop: 6 }}>
                    {authorsList}
                  </p>
                </div>

                {details.abstract && (
                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5
                  }}>
                    {details.abstract}
                  </p>
                )}

                <div className="paper-card-stats">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Quote size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span className="tabular-nums font-semibold">{(details.citation_count || 0).toLocaleString()}</span>
                    <span>citations</span>
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={13} style={{ color: '#10b981' }} />
                    <span className="tabular-nums font-semibold">{claimsCount}</span>
                    <span>claims</span>
                  </span>
                  
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.78rem' }}>
                    <span>Inspect</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
