import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../../utils/api';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

const SubscriptionManagement: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', price_cents: '', currency: 'inr',
    billing_period: 'monthly', stripe_price_id: '', package_id: '',
    features: '',
  });
  const [error, setError] = useState('');

  const fetchPlans = async () => {
    try { setPlans((await paymentsAPI.listPlans()).plans); }
    catch { setError('Failed to load plans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.price_cents) { setError('Name and price required'); return; }
    try {
      const payload = {
        ...form,
        price_cents: parseInt(form.price_cents) || 0,
        package_id: form.package_id ? parseInt(form.package_id) : null,
        features: form.features.split('\n').filter(f => f.trim()),
      };
      if (editingId) await paymentsAPI.updatePlan(editingId, payload);
      else await paymentsAPI.createPlan(payload);
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', description: '', price_cents: '', currency: 'inr', billing_period: 'monthly', stripe_price_id: '', package_id: '', features: '' });
      fetchPlans();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed'); }
  };

  const handleEdit = (p: any) => {
    setForm({
      name: p.name, description: p.description, price_cents: String(p.price_cents),
      currency: p.currency, billing_period: p.billing_period,
      stripe_price_id: p.stripe_price_id || '', package_id: p.package_id ? String(p.package_id) : '',
      features: (p.features || []).join('\n'),
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this plan?')) return;
    try { await paymentsAPI.deletePlan(id); fetchPlans(); } catch {}
  };

  if (loading) return <div className="text-slate-400 text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Subscription Plans</h2>
          <p className="text-xs text-slate-500 mt-1">Configure plans with Stripe price IDs for payments</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', price_cents: '', currency: 'inr', billing_period: 'monthly', stripe_price_id: '', package_id: '', features: '' }); }}
          className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Plan</button>
      </div>

      {error && <div className="error-banner text-sm mb-4">{error} <button onClick={() => setError('')}><X className="w-3.5 h-3.5 inline ml-2" /></button></div>}

      {showForm && (
        <div className="glass-card p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">{editingId ? 'Edit' : 'Create'} Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-field text-sm" placeholder="e.g. Pro Plan" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Price (paise/cents) *</label>
              <input type="number" value={form.price_cents} onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))}
                className="input-field text-sm" placeholder="e.g. 49900 = ₹499" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Billing</label>
              <select value={form.billing_period} onChange={e => setForm(f => ({ ...f, billing_period: e.target.value }))}
                className="input-field text-sm">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stripe Price ID</label>
              <input value={form.stripe_price_id} onChange={e => setForm(f => ({ ...f, stripe_price_id: e.target.value }))}
                className="input-field text-sm" placeholder="price_xxxxx" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Package ID (optional)</label>
              <input type="number" value={form.package_id} onChange={e => setForm(f => ({ ...f, package_id: e.target.value }))}
                className="input-field text-sm" placeholder="Link to course package" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field text-sm" placeholder="Plan description" />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Features (one per line)</label>
            <textarea value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
              className="input-field text-sm min-h-[80px]" placeholder="Access all courses&#10;Priority support&#10;Certificate included" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm px-5 py-2">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {plans.length === 0 && <p className="text-slate-500 text-center py-8">No plans created yet.</p>}
        {plans.map(p => (
          <div key={p.id} className="glass-card px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-white">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.price_display} {p.billing_period}
                  {p.stripe_price_id && ` · ${p.stripe_price_id}`}
                  {' · '}{p.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(p)} className="text-slate-400 hover:text-white p-1.5"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-rose-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionManagement;
