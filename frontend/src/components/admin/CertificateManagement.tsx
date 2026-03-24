import React, { useState, useEffect } from 'react';
import { CertificateTemplate, CertificateData, CoursePackage } from '../../types';
import { certTemplatesAPI, packagesAPI } from '../../utils/api';
import { Plus, Pencil, Trash2, ArrowLeft, Award, Download } from 'lucide-react';

const CertificateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CertificateTemplate | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'templates' | 'issued'>('templates');
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'package', trigger_value: '', is_active: true });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [t, c, p] = await Promise.all([
        certTemplatesAPI.getAll(), certTemplatesAPI.getAllCertificates(), packagesAPI.getAll().catch(() => []),
      ]);
      setTemplates(t); setCertificates(c); setPackages(p);
    } catch { setError('Failed to load data'); }
  };

  const openCreate = () => {
    setForm({ name: '', description: '', trigger_type: 'package', trigger_value: '', is_active: true });
    setEditing(null); setShowForm(true);
  };
  const openEdit = (t: CertificateTemplate) => {
    setForm({ name: t.name, description: t.description, trigger_type: t.trigger_type, trigger_value: t.trigger_value, is_active: t.is_active });
    setEditing(t); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      if (editing) { await certTemplatesAPI.update(editing.id, form); }
      else { await certTemplatesAPI.create(form); }
      setShowForm(false); setEditing(null); fetchAll();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete template "${name}"? This will also delete all issued certificates for this template.`)) return;
    try { await certTemplatesAPI.delete(id); fetchAll(); } catch { setError('Failed to delete'); }
  };

  if (showForm) {
    return (
      <div className="max-w-lg">
        <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost text-sm flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-6">{editing ? 'Edit Template' : 'Create Certificate Template'}</h3>
          {error && <div className="error-banner text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Certificate Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input-field" placeholder="e.g. AI Foundations Certificate" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px]" placeholder="Shown on the certificate PDF" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Trigger Type *</label>
              <select value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value, trigger_value: '' })} className="input-field">
                <option value="package">Complete a Course</option>
                <option value="category">Complete all resources in a category</option>
                <option value="level">Complete all resources at a level</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Trigger Value *</label>
              {form.trigger_type === 'package' ? (
                <select value={form.trigger_value} onChange={e => setForm({ ...form, trigger_value: e.target.value })} className="input-field" required>
                  <option value="">Select a course</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} (Days: {p.days.join(', ')})</option>)}
                </select>
              ) : form.trigger_type === 'level' ? (
                <select value={form.trigger_value} onChange={e => setForm({ ...form, trigger_value: e.target.value })} className="input-field" required>
                  <option value="">Select a level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="no-code">No-Code</option>
                </select>
              ) : (
                <input value={form.trigger_value} onChange={e => setForm({ ...form, trigger_value: e.target.value })} className="input-field" placeholder="Category name (e.g. Agentic AI)" required />
              )}
              <p className="text-xs text-slate-500 mt-1">
                {form.trigger_type === 'package' && 'Certificate issued when all days in the course are completed.'}
                {form.trigger_type === 'category' && 'Certificate issued when all free resources in this category are completed.'}
                {form.trigger_type === 'level' && 'Certificate issued when all free resources at this level are completed.'}
              </p>
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

      <div className="flex gap-1 border-b border-white/10 mb-6">
        {(['templates', 'issued'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-all ${tab === t ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}>
            {t === 'templates' ? 'Templates' : `Issued Certificates (${certificates.length})`}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Certificate Templates ({templates.length})</h2>
            <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(t => (
              <div key={t.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white">{t.name}</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(t.id, t.name)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {t.description && <p className="text-sm text-slate-400 mb-3">{t.description}</p>}
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-full">
                    {t.trigger_type}: {t.trigger_type === 'package' ? packages.find(p => p.id === Number(t.trigger_value))?.name || t.trigger_value : t.trigger_value}
                  </span>
                  <span className={t.is_active ? 'text-emerald-400' : 'text-slate-500'}>{t.is_active ? 'Active' : 'Inactive'}</span>
                  <span className="text-slate-500">{t.issued_count} issued</span>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-8">No templates yet. Create one to start issuing certificates.</div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Cert ID</th>
                    <th className="text-left px-4 py-3">Certificate</th>
                    <th className="text-left px-4 py-3">Recipient</th>
                    <th className="text-left px-4 py-3">Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map(c => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{c.cert_id}</td>
                      <td className="px-4 py-3 text-slate-200">{c.certificate_title}</td>
                      <td className="px-4 py-3 text-slate-400">{c.user_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(c.issued_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {certificates.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-slate-500 py-8">No certificates issued yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CertificateManagement;
