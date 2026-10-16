import React, { useState } from 'react';
import { X, UploadCloud, FileText, Check, AlertCircle, Sparkles, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
      setError('');
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one PDF or .bib file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    const formData = new FormData();
    files.forEach(f => {
      formData.append('files', f);
    });

    try {
      const res = await axios.post('/api/papers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMsg(`Successfully processed ${res.data.uploaded} papers!`);
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload and parse papers.');
    } finally {
      setUploading(false);
    }
  };

  const handleSeedSample = async () => {
    setSeeding(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.post('/api/papers/seed-sample');
      setSuccessMsg('Sample Transformer & LLM literature graph loaded!');
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError('Failed to seed sample dataset.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <UploadCloud size={18} />
            </div>
            <div>
              <h3 className="modal-title">Import Research Literature</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Upload academic PDFs or Zotero/Mendeley BibTeX files</p>
            </div>
          </div>
          <button className="hud-btn" onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Quick Start Demo Option */}
          <div className="sample-corpus-banner">
            <div>
              <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                Try with Sample Research Corpus
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Instantly load 9 landmark Transformer, Attention, and Scaling papers
              </p>
            </div>
            <button
              className="btn btn-secondary"
              style={{ flexShrink: 0, padding: '7px 12px', fontSize: '0.8rem' }}
              disabled={seeding || uploading}
              onClick={handleSeedSample}
            >
              <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{seeding ? 'Loading...' : 'Load Sample'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              or upload your own files
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          </div>

          {/* Dropzone */}
          <label
            className="dropzone"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            style={{
              borderColor: isDragOver ? 'var(--accent-primary)' : undefined,
              backgroundColor: isDragOver ? 'var(--accent-primary-subtle)' : undefined
            }}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.bib"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <FileText size={36} style={{ color: 'var(--accent-primary)', opacity: 0.85 }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Click to browse or drop academic PDFs / .bib files here
              </p>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Supports research papers, preprint PDFs, and Zotero/Mendeley BibTeX exports
              </p>
            </div>
          </label>

          {/* Selected File List */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem'
                  }}
                >
                  <FileText size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: 4, width: 22, height: 22 }}
                    onClick={() => handleRemoveFile(i)}
                    title="Remove file"
                  >
                    <Trash2 size={12} style={{ color: 'var(--accent-rose)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              color: '#fda4af',
              fontSize: '0.82rem',
              border: '1px solid rgba(244, 63, 94, 0.25)'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontSize: '0.82rem',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              <Check size={15} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              disabled={uploading || files.length === 0}
              onClick={handleUpload}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing & Extracting Scientific Claims...</span>
                </>
              ) : (
                <span>Upload & Build Graph ({files.length} selected)</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
