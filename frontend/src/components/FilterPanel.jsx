import React from 'react';
import { Filter, Search, GitFork, Star, X, RotateCcw, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const CLUSTER_COLORS = [
  '#38bdf8', // Cyan
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

export default function FilterPanel({
  clusters = [],
  filterClusters,
  setFilterClusters,
  filterEdgeTypes,
  setFilterEdgeTypes,
  landmarksOnly,
  setLandmarksOnly,
  searchQuery,
  setSearchQuery,
  onOpenConnector,
  isOpen,
  onToggleOpen,
  totalMatchingPapers = 0
}) {
  const toggleCluster = (id) => {
    setFilterClusters(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }));
  };

  const toggleEdgeType = (type) => {
    setFilterEdgeTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const hasActiveFilters = 
    searchQuery.trim().length > 0 ||
    landmarksOnly ||
    Object.values(filterClusters).some(v => v === false) ||
    Object.values(filterEdgeTypes).some(v => v === false);

  const handleResetFilters = () => {
    setSearchQuery('');
    setLandmarksOnly(false);
    setFilterClusters({});
    setFilterEdgeTypes({ CITES: true, SUPPORTS: true, CONTRADICTS: true, EXTENDS: true });
  };

  if (!isOpen) {
    return (
      <button
        className="sidebar-collapse-trigger"
        onClick={onToggleOpen}
        title="Open Filters & Search"
      >
        <Filter size={17} />
      </button>
    );
  }

  return (
    <aside className="side-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Filter size={17} style={{ color: 'var(--accent-primary)' }} />
          <span>Filters & Exploration</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {hasActiveFilters && (
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.74rem' }}
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
          <button
            className="hud-btn"
            style={{ width: 28, height: 28 }}
            onClick={onToggleOpen}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <div className="panel-content">
        {/* Search Input */}
        <div className="filter-group">
          <div className="group-header">
            <label className="group-label">Search Papers & Authors</label>
            {searchQuery && (
              <span className="count-badge">{totalMatchingPapers} found</span>
            )}
          </div>
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="e.g. Attention, Vaswani, BERT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Literature Connector Feature Banner */}
        <div className="filter-group">
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '9px 14px' }}
            onClick={onOpenConnector}
          >
            <GitFork size={16} />
            <span>Find Bridges (Connector)</span>
          </button>
        </div>

        {/* Landmark Filter */}
        <div className="filter-group">
          <label className="group-label">Centrality & Influence</label>
          <div
            className={`filter-card-item ${landmarksOnly ? 'active' : ''}`}
            onClick={() => setLandmarksOnly(!landmarksOnly)}
          >
            <div className="filter-card-left">
              <Star size={16} fill={landmarksOnly ? '#f59e0b' : 'transparent'} style={{ color: '#f59e0b' }} />
              <span>Landmark Papers Only</span>
            </div>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: `1px solid ${landmarksOnly ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: landmarksOnly ? 'var(--accent-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              {landmarksOnly && <Check size={13} strokeWidth={3} />}
            </div>
          </div>
        </div>

        {/* Evidence & Edge Layers */}
        <div className="filter-group">
          <label className="group-label">Evidence & Relationship Layers</label>
          
          {/* CITES */}
          <div
            className={`filter-card-item ${filterEdgeTypes.CITES !== false ? 'active' : ''}`}
            onClick={() => toggleEdgeType('CITES')}
          >
            <div className="filter-card-left">
              <span className="layer-indicator" style={{ backgroundColor: '#6366f1' }} />
              <span>Citations (Formal Links)</span>
            </div>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: `1px solid ${filterEdgeTypes.CITES !== false ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: filterEdgeTypes.CITES !== false ? 'var(--accent-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              {filterEdgeTypes.CITES !== false && <Check size={13} strokeWidth={3} />}
            </div>
          </div>

          {/* SUPPORTS */}
          <div
            className={`filter-card-item ${filterEdgeTypes.SUPPORTS !== false ? 'active' : ''}`}
            onClick={() => toggleEdgeType('SUPPORTS')}
          >
            <div className="filter-card-left">
              <span className="layer-indicator" style={{ backgroundColor: '#10b981' }} />
              <span>Corroborates (Supports)</span>
            </div>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: `1px solid ${filterEdgeTypes.SUPPORTS !== false ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: filterEdgeTypes.SUPPORTS !== false ? 'var(--accent-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              {filterEdgeTypes.SUPPORTS !== false && <Check size={13} strokeWidth={3} />}
            </div>
          </div>

          {/* CONTRADICTS */}
          <div
            className={`filter-card-item ${filterEdgeTypes.CONTRADICTS !== false ? 'active' : ''}`}
            onClick={() => toggleEdgeType('CONTRADICTS')}
          >
            <div className="filter-card-left">
              <span className="layer-indicator" style={{ backgroundColor: '#f43f5e', borderTop: '2px dashed #f43f5e' }} />
              <span>Disputes (Contradicts)</span>
            </div>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: `1px solid ${filterEdgeTypes.CONTRADICTS !== false ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: filterEdgeTypes.CONTRADICTS !== false ? 'var(--accent-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              {filterEdgeTypes.CONTRADICTS !== false && <Check size={13} strokeWidth={3} />}
            </div>
          </div>

          {/* EXTENDS */}
          <div
            className={`filter-card-item ${filterEdgeTypes.EXTENDS !== false ? 'active' : ''}`}
            onClick={() => toggleEdgeType('EXTENDS')}
          >
            <div className="filter-card-left">
              <span className="layer-indicator" style={{ backgroundColor: '#a855f7' }} />
              <span>Extends Methodology</span>
            </div>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: `1px solid ${filterEdgeTypes.EXTENDS !== false ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: filterEdgeTypes.EXTENDS !== false ? 'var(--accent-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              {filterEdgeTypes.EXTENDS !== false && <Check size={13} strokeWidth={3} />}
            </div>
          </div>
        </div>

        {/* Thematic Communities */}
        <div className="filter-group">
          <label className="group-label">Research Topics & Communities</label>
          {clusters.map((cl, idx) => {
            const isChecked = filterClusters[cl.id] !== false;
            const clusterColor = CLUSTER_COLORS[cl.id % CLUSTER_COLORS.length];
            return (
              <div
                key={cl.id}
                className={`filter-card-item ${isChecked ? 'active' : ''}`}
                onClick={() => toggleCluster(cl.id)}
              >
                <div className="filter-card-left">
                  <span
                    className="cluster-dot"
                    style={{
                      backgroundColor: isChecked ? clusterColor : 'var(--text-muted)',
                      boxShadow: isChecked ? `0 0 8px ${clusterColor}66` : 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', opacity: isChecked ? 1 : 0.6 }}>
                    {cl.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="count-badge">{cl.paper_count}</span>
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: isChecked ? 'var(--accent-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    {isChecked && <Check size={11} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
