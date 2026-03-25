import React, { useState, useEffect } from 'react';
import { badgesAPI } from '../../utils/api';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

const CRITERIA_TYPES = [
  { value: 'days_completed', label: 'Days Completed', hint: 'Number of days marked complete' },
  { value: 'quizzes_passed', label: 'Quizzes Passed', hint: 'Number of unique quizzes passed' },
  { value: 'time_spent', label: 'Time Spent (min)', hint: 'Total platform time in minutes' },
  { value: 'first_login', label: 'First Login', hint: 'Awarded on first login (value ignored)' },
];

const ICONS = ['award', 'trophy', 'zap', 'clock', 'star', 'target', 'flame'];

const BadgeManagement: React.FC = () => {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: 'award', criteria_type: 'days_completed', criteria_value: '1' });
  const [error, setError] = useState('');

  const fetchBadges = async () => {
    try { setBadges((await badgesAPI.listBadges()).badges); }
    catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBadges(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.criteria_type) { setError('Name and criteria required'); return; }
    try {
      const payload = { ...form, criteria_value: parseInt(form.criteria_value) || 1 };
      if (editingId) await badgesAPI.updateBadge(editingId, payload);
      else await badgesAPI.createBadge(payload);
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', description: '', icon: 'award', criteria_type: 'days_completed', criteria_value: '1' });
      fetchBadges();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed'); }
  };

  const handleEdit = (b: any) => {
    setForm({ name: b.name, description: b.description, icon: b.icon, criteria_type: b.criteria_type, criteria_value: String(b.criteria_value) });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this badge?')) return;
    try { await badgesAPI.deleteBadge(id); fetchBadges(); } catch {}
  };

  if (loading) return <div className="text-slate-400 text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Badge Management</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', icon: 'award', criteria_type: 'days_completed', criteria_value: '1' }); }}
          className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Badge</button>
      </div>

      {error && <div className="error-banner text-sm mb-4">{error} <button onClick={() => setError('')}><X className="w-3.5 h-3.5 inline ml-2" /></button></div>}

      {showForm && (
        <div className="glass-card p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">{editingId ? 'Edit' : 'Create'} Badge</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-field text-sm" placeholder="e.g. First Steps" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Icon</label>
              <div className="flex gap-1.5">
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                      form.icon === icon ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'
                    }`}>{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Criteria Type *</label>
              <select value={form.criteria_type} onChange={e => setForm(f => ({ ...f, criteria_type: e.target.value }))}
                className="input-field text-sm">
                {CRITERIA_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
              </select>
              <p className="text-xs text-slate-600 mt-1">
                {CRITERIA_TYPES.find(ct => ct.value === form.criteria_type)?.hint}
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Criteria Value</label>
              <input type="number" min="1" value={form.criteria_value}
                onChange={e => setForm(f => ({ ...f, criteria_value: e.target.value }))}
                className="input-field text-sm" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field text-sm" placeholder="What does this badge reward?" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm px-5 py-2">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {badges.length === 0 && <p className="text-slate-500 text-center py-8">No badges defined yet.</p>}
        {badges.map(b => (
          <div key={b.id} className="glass-card px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-400 capitalize">
                {b.icon.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{b.name}</p>
                <p className="text-xs text-slate-500">
                  {CRITERIA_TYPES.find(ct => ct.value === b.criteria_type)?.label}: {b.criteria_value}
                  {' · '}{b.earned_count} earned
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(b)} className="text-slate-400 hover:text-white p-1.5"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(b.id)} className="text-slate-400 hover:text-rose-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeManagement;
