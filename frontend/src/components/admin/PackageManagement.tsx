import React, { useState, useEffect } from 'react';
import { CoursePackage } from '../../types';
import { packagesAPI, daysAPI } from '../../utils/api';
import { Plus, Pencil, Trash2, ArrowLeft, BookOpen } from 'lucide-react';

const PackageManagement: React.FC = () => {
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [editing, setEditing] = useState<CoursePackage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', days: [] as number[], is_active: true });

  useEffect(() => { fetchPackages(); fetchDays(); }, []);

  const fetchPackages = async () => { try { setPackages(await packagesAPI.getAll()); } catch { setError('Failed to load courses'); } };
  const fetchDays = async () => { try { setAvailableDays((await daysAPI.getDays()).map(d => d.day_number).sort((a, b) => a - b)); } catch {} };

  const openCreate = () => { setForm({ name: '', description: '', days: [], is_active: true }); setEditing(null); setShowForm(true); };
  const openEdit = (p: CoursePackage) => { setForm({ name: p.name, description: p.description, days: p.days, is_active: p.is_active }); setEditing(p); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      if (editing) { await packagesAPI.update(editing.id, form); }
      else { await packagesAPI.create(form); }
      setShowForm(false); setEditing(null); fetchPackages();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete course "${name}"?`)) return;
    try { await packagesAPI.delete(id); fetchPackages(); } catch { setError('Failed to delete'); }
  };

  const toggleDay = (day: number) => {
    setForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }));
  };

  if (showForm) {
    return (
      <div className="max-w-lg">
        <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost text-sm flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-6">{editing ? 'Edit Course' : 'Create Course'}</h3>
          {error && <div className="error-banner text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Course Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input-field" placeholder="e.g. AI Foundations" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Days in Course</label>
              <div className="flex flex-wrap gap-2">
                {availableDays.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.days.includes(day) ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-white/5 hover:border-white/10'
                    }`}>
                    Day {day}
                  </button>
                ))}
                {availableDays.length === 0 && <p className="text-xs text-slate-500">No days available.</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-white/20 bg-slate-800 text-indigo-500" />
              <span className="text-sm text-slate-300">Active</span>
            </label>
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
        <h2 className="text-lg font-semibold text-slate-200">Courses ({packages.length})</h2>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map(p => (
          <div key={p.id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">{p.name}</h3>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(p.id, p.name)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {p.description && <p className="text-sm text-slate-400 mb-3">{p.description}</p>}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {p.days.map(d => (
                <span key={d} className="bg-indigo-500/10 text-indigo-300 text-xs px-2 py-0.5 rounded-full">Day {d}</span>
              ))}
              {p.days.length === 0 && <span className="text-xs text-slate-500">No days assigned</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{p.company_count} compan{p.company_count === 1 ? 'y' : 'ies'}</span>
              <span className={p.is_active ? 'text-emerald-400' : 'text-slate-500'}>{p.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8">No courses yet. Create one to bundle days together.</div>
        )}
      </div>
    </div>
  );
};

export default PackageManagement;
