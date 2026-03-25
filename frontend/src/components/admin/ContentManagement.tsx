import React, { useState, useEffect, useRef } from 'react';
import { contentAPI } from '../../utils/api';
import { Upload, Trash2, FileText, Code2, Plus, Save, ChevronDown, ChevronUp, X, File } from 'lucide-react';

interface ContentFile {
  name: string;
  size: number;
  type: string;
}

interface DayContent {
  day_number: number;
  folder: string;
  title: string;
  description: string;
  files: ContentFile[];
  metadata: any;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ContentManagement: React.FC = () => {
  const [days, setDays] = useState<DayContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New day form
  const [showNewDay, setShowNewDay] = useState(false);
  const [newDayNumber, setNewDayNumber] = useState('');
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newDayDesc, setNewDayDesc] = useState('');

  // Edit metadata
  const [editingMeta, setEditingMeta] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDayNum, setUploadDayNum] = useState<number | null>(null);

  const fetchDays = async () => {
    try {
      const data = await contentAPI.getDays();
      setDays(data.days);
    } catch {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDays(); }, []);

  const handleUploadClick = (dayNumber: number) => {
    setUploadDayNum(dayNumber);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadDayNum === null) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'ipynb' && ext !== 'pdf') {
      setError('Only .ipynb and .pdf files are allowed');
      e.target.value = '';
      return;
    }

    setUploading(uploadDayNum);
    setError('');
    try {
      await contentAPI.uploadFile(uploadDayNum, file);
      setSuccess(`${file.name} uploaded successfully`);
      fetchDays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (dayNumber: number, filename: string) => {
    if (!window.confirm(`Delete "${filename}" from Day ${dayNumber}?`)) return;
    setError('');
    try {
      await contentAPI.deleteFile(dayNumber, filename);
      setSuccess(`${filename} deleted`);
      fetchDays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleSaveMetadata = async (dayNumber: number) => {
    setError('');
    try {
      await contentAPI.updateMetadata(dayNumber, { title: editTitle, description: editDesc });
      setSuccess(`Day ${dayNumber} metadata updated`);
      setEditingMeta(null);
      fetchDays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update metadata');
    }
  };

  const handleCreateDay = async () => {
    const num = parseInt(newDayNumber);
    if (!num || num < 1) { setError('Enter a valid day number'); return; }
    if (days.some(d => d.day_number === num)) { setError(`Day ${num} already exists`); return; }
    setError('');
    try {
      await contentAPI.updateMetadata(num, { title: newDayTitle || `Day ${num}`, description: newDayDesc });
      setSuccess(`Day ${num} created`);
      setShowNewDay(false);
      setNewDayNumber('');
      setNewDayTitle('');
      setNewDayDesc('');
      fetchDays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create day');
    }
  };

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  if (loading) return <div className="text-slate-400 text-center py-8">Loading content...</div>;

  return (
    <div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".ipynb,.pdf" onChange={handleFileChange} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Day Content Management</h2>
          <p className="text-sm text-slate-400 mt-1">Upload notebooks and PDFs to day folders</p>
        </div>
        <button onClick={() => setShowNewDay(true)}
          className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Day
        </button>
      </div>

      {error && <div className="error-banner text-sm mb-4">{error} <button onClick={() => setError('')} className="ml-2 text-rose-300"><X className="w-3.5 h-3.5 inline" /></button></div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-sm mb-4">{success}</div>}

      {/* New Day Form */}
      {showNewDay && (
        <div className="glass-card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Create New Day</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Day Number *</label>
              <input type="number" min="1" value={newDayNumber} onChange={e => setNewDayNumber(e.target.value)}
                className="input-field text-sm" placeholder="e.g. 7" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title</label>
              <input value={newDayTitle} onChange={e => setNewDayTitle(e.target.value)}
                className="input-field text-sm" placeholder="e.g. Advanced RAG" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <input value={newDayDesc} onChange={e => setNewDayDesc(e.target.value)}
                className="input-field text-sm" placeholder="Brief description" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateDay} className="btn-primary text-sm px-4 py-2">Create</button>
            <button onClick={() => setShowNewDay(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Day List */}
      <div className="space-y-3">
        {days.length === 0 && (
          <div className="glass-card p-8 text-center text-slate-400">
            No day content found. Click "New Day" to create one.
          </div>
        )}

        {days.map((day) => (
          <div key={day.day_number} className="glass-card overflow-hidden">
            {/* Day Header */}
            <button onClick={() => setExpandedDay(expandedDay === day.day_number ? null : day.day_number)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                  Day {day.day_number}
                </span>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{day.title}</p>
                  {day.description && <p className="text-xs text-slate-500 mt-0.5">{day.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{day.files.length} file{day.files.length !== 1 ? 's' : ''}</span>
                {expandedDay === day.day_number ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedDay === day.day_number && (
              <div className="border-t border-white/5 px-5 py-4">
                {/* Files */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-slate-300 uppercase tracking-wider">Files</h4>
                  <button onClick={() => handleUploadClick(day.day_number)}
                    disabled={uploading === day.day_number}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading === day.day_number ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>

                {day.files.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">No files yet. Upload a .ipynb or .pdf file.</p>
                ) : (
                  <div className="space-y-1.5 mb-4">
                    {day.files.map((file) => (
                      <div key={file.name} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {file.type === 'notebook' ? (
                            <Code2 className="w-4 h-4 text-blue-400" />
                          ) : file.type === 'pdf' ? (
                            <FileText className="w-4 h-4 text-rose-400" />
                          ) : (
                            <File className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-sm text-slate-200">{file.name}</span>
                          <span className="text-xs text-slate-600">{formatSize(file.size)}</span>
                        </div>
                        <button onClick={() => handleDeleteFile(day.day_number, file.name)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Metadata Edit */}
                <div className="border-t border-white/5 pt-4 mt-2">
                  {editingMeta === day.day_number ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Title</label>
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          className="input-field text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Description</label>
                        <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          className="input-field text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveMetadata(day.day_number)}
                          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditingMeta(null)} className="btn-ghost text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingMeta(day.day_number); setEditTitle(day.title); setEditDesc(day.description); }}
                      className="text-xs text-slate-400 hover:text-white transition-colors">
                      Edit metadata
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentManagement;
