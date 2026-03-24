import React, { useState, useEffect } from 'react';
import { FreeResource } from '../../types';
import { freeResourcesAPI } from '../../utils/api';
import { Plus, Pencil, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'no-code'];

const FreeResourceManagement: React.FC = () => {
  const [resources, setResources] = useState<FreeResource[]>([]);
  const [editing, setEditing] = useState<FreeResource | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState({ title: '', description: '', url: '', duration: '', instructor: '', level: '', category: '', sort_order: 0, is_active: true });

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => { try { setResources(await freeResourcesAPI.getAll()); } catch { setError('Failed to load resources'); } };

  const openCreate = () => {
    setForm({ title: '', description: '', url: '', duration: '', instructor: '', level: '', category: '', sort_order: 0, is_active: true });
    setEditing(null); setShowForm(true);
  };

  const openEdit = (r: FreeResource) => {
    setForm({ title: r.title, description: r.description, url: r.url, duration: r.duration, instructor: r.instructor, level: r.level, category: r.category, sort_order: r.sort_order, is_active: r.is_active });
    setEditing(r); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      if (editing) { await freeResourcesAPI.update(editing.id, form); }
      else { await freeResourcesAPI.create(form); }
      setShowForm(false); setEditing(null); fetchResources();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try { await freeResourcesAPI.delete(id); fetchResources(); } catch { setError('Failed to delete'); }
  };

  if (showForm) {
    return (
      <div className="max-w-lg">
        <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost text-sm flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-6">{editing ? 'Edit Resource' : 'Add Free Resource'}</h3>
          {error && <div className="error-banner text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="input-field" placeholder="Course title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">URL *</label>
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required className="input-field" placeholder="https://youtu.be/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px]" placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Instructor</label>
                <input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Duration</label>
                <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className="input-field" placeholder="2 hrs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Level</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                  className="input-field">
                  <option value="">Select level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field" placeholder="e.g. Agentic AI" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="input-field w-24" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-white/20 bg-slate-800 text-indigo-500" />
                <span className="text-sm text-slate-300">Active</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Free Resources ({resources.length})</h2>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Resource
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Instructor</th>
                <th className="text-left px-4 py-3">Level</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(r => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium">{r.title}</span>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-400">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.instructor || '-'}</td>
                  <td className="px-4 py-3">
                    {r.level && <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.level === 'beginner' ? 'bg-emerald-500/20 text-emerald-400' :
                      r.level === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-sky-500/20 text-sky-400'
                    }`}>{r.level}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.category || '-'}</td>
                  <td className="px-4 py-3 text-slate-400">{r.duration || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(r.id, r.title)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {resources.length === 0 && (
                <tr><td colSpan={7} className="text-center text-slate-500 py-8">No free resources yet. Add one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FreeResourceManagement;
