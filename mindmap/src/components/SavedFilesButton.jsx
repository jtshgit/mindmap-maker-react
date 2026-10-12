import React, { useState, useCallback, useEffect } from 'react';
import { Save, FolderOpen, X, Trash2, Loader2, Check, Clock, List } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3010';

export default function SavedFilesButton({ getCurrentDiagramData, onLoadFile }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' | 'all'
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [currentFileId, setCurrentFileId] = useState(null);
  const [currentFileName, setCurrentFileName] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const fetchFiles = useCallback(async (tab = activeTab) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`${API_BASE}/api/files?filter=${tab}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load saved files');
      setFiles(await res.json());
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setLoadingFiles(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (panelOpen) fetchFiles(activeTab);
  }, [panelOpen, activeTab, fetchFiles]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const doSave = useCallback(async (name, fileIdOverride) => {
    setSaving(true);
    setSaveError(null);
    try {
      const data = getCurrentDiagramData ? getCurrentDiagramData() : {};
      const targetId = fileIdOverride !== undefined ? fileIdOverride : currentFileId;
      const res = await fetch(`${API_BASE}/api/files/save`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: targetId,
          name,
          data,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Save failed');
      }
      const saved = await res.json();
      setCurrentFileId(saved.file_id);
      setCurrentFileName(saved.name);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
      if (panelOpen) fetchFiles();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }, [getCurrentDiagramData, currentFileId, panelOpen, fetchFiles]);

  const handleSaveClick = () => {
    if (currentFileId) doSave(currentFileName);
    else { setNameInput('Untitled Diagram'); setNameModalOpen(true); }
  };

  const handleSaveAsNew = () => {
    setNameInput(currentFileName ? `${currentFileName} (Copy)` : 'Untitled Diagram');
    setNameModalOpen(true);
  };

  const confirmNameAndSave = () => {
    const name = nameInput.trim() || 'Untitled Diagram';
    setNameModalOpen(false);
    doSave(name, null);
  };

  const handleLoadClick = async (file) => {
    try {
      const res = await fetch(`${API_BASE}/api/files/${file.file_id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load file');
      const content = await res.json();
      if (onLoadFile) {
        onLoadFile(content.data);
      }
      setCurrentFileId(content.file_id);
      setCurrentFileName(content.name);
      setPanelOpen(false);
    } catch (err) {
      setSaveError(err.message);
    }
  };

  const handleDelete = async (file, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/files/${file.file_id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete file');
      if (currentFileId === file.file_id) { setCurrentFileId(null); setCurrentFileName(null); }
      fetchFiles();
    } catch (err) {
      setSaveError(err.message);
    }
  };

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
      {panelOpen && (
        <div style={{
          width: 340, maxHeight: 460, background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)', border: '1px solid #E1DFDD',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #E1DFDD', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#252423' }}>Saved Diagrams</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {currentFileId && (
                <button onClick={handleSaveAsNew} style={{ fontSize: 11, background: '#F3F2F1', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#252423' }}>
                  Save as new
                </button>
              )}
              <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#605E5C' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E1DFDD', background: '#FAF9F8', padding: '4px' }}>
            <button
              onClick={() => handleTabChange('recent')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 0', fontSize: 12, fontWeight: activeTab === 'recent' ? 600 : 400,
                border: 'none', borderRadius: 6, cursor: 'pointer',
                background: activeTab === 'recent' ? '#fff' : 'transparent',
                color: activeTab === 'recent' ? '#0078D4' : '#605E5C',
                boxShadow: activeTab === 'recent' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Clock size={13} /> Recent
            </button>
            <button
              onClick={() => handleTabChange('all')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 0', fontSize: 12, fontWeight: activeTab === 'all' ? 600 : 400,
                border: 'none', borderRadius: 6, cursor: 'pointer',
                background: activeTab === 'all' ? '#fff' : 'transparent',
                color: activeTab === 'all' ? '#0078D4' : '#605E5C',
                boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <List size={13} /> All Diagrams
            </button>
          </div>

          {/* File List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loadingFiles && (
              <div style={{ padding: 20, textAlign: 'center', color: '#605E5C', fontSize: 12 }}>Loading…</div>
            )}
            {!loadingFiles && files.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#8A8886' }}>
                {activeTab === 'recent' ? 'No recently opened diagrams.' : 'No saved diagrams yet.'}
              </div>
            )}
            {!loadingFiles && files.map(file => (
              <div
                key={file.file_id}
                onClick={() => handleLoadClick(file)}
                style={{
                  padding: '10px 14px', borderBottom: '1px solid #F3F2F1', cursor: 'pointer',
                  background: currentFileId === file.file_id ? '#F3F9FD' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#252423', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 230 }}>
                    {file.name}
                  </span>
                  <button onClick={(e) => handleDelete(file, e)} title="Delete"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a4262c', padding: 2 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#8A8886', marginTop: 2 }}>
                  {activeTab === 'recent' && file.opened_at
                    ? `opened ${new Date(file.opened_at).toLocaleString()}`
                    : `updated ${new Date(file.updated_at).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>

          {saveError && (
            <div style={{ padding: '8px 14px', fontSize: 11, color: '#a4262c', background: '#FDE7E9' }}>{saveError}</div>
          )}
        </div>
      )}

      {/* Name Input Modal */}
      {nameModalOpen && (
        <div style={{
          width: 280, background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          border: '1px solid #E1DFDD', padding: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#252423' }}>Name this diagram</div>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmNameAndSave();
              if (e.key === 'Escape') setNameModalOpen(false);
            }}
            style={{ width: '100%', padding: '6px 8px', fontSize: 13, border: '1px solid #D2D0CE', borderRadius: 6, marginBottom: 10, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setNameModalOpen(false)} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid #D2D0CE', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={confirmNameAndSave} style={{ fontSize: 12, padding: '5px 10px', border: 'none', borderRadius: 6, background: '#0078D4', color: '#fff', cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setPanelOpen(o => !o)}
          title="Saved diagrams"
          style={{
            width: 44, height: 44, borderRadius: '50%', border: '1px solid #E1DFDD',
            background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#252423',
          }}
        >
          <FolderOpen size={18} />
        </button>
        <button
          onClick={handleSaveClick}
          onContextMenu={(e) => { e.preventDefault(); handleSaveAsNew(); }}
          disabled={saving}
          title={currentFileId ? `Update "${currentFileName}" (right-click: save as new)` : 'Save current diagram'}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: justSaved ? '#107C10' : '#0078D4', boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : justSaved ? <Check size={18} /> : <Save size={18} />}
        </button>
      </div>
    </div>
  );
}
