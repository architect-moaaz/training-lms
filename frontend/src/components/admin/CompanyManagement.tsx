import React, { useState, useEffect } from 'react';
import { Company } from '../../types';
import { companiesAPI, daysAPI } from '../../utils/api';
import CompanyForm from './CompanyForm';
import CompanyDetail from './CompanyDetail';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface CompanyManagementProps {
  allUsers: { id: number; username: string; email: string }[];
}

const CompanyManagement: React.FC<CompanyManagementProps> = ({ allUsers }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { fetchCompanies(); fetchAvailableDays(); }, []);

  const fetchCompanies = async () => { try { setCompanies(await companiesAPI.getCompanies()); } catch { setError('Failed to load companies'); } };
  const fetchAvailableDays = async () => { try { setAvailableDays((await daysAPI.getDays()).map(d => d.day_number).sort((a, b) => a - b)); } catch {} };

  const handleCreate = async (data: any) => { try { await companiesAPI.createCompany(data); setShowForm(false); fetchCompanies(); } catch (err: any) { setError(err.response?.data?.error || 'Failed'); } };
  const handleEdit = async (data: any) => {
    if (!editingCompany) return;
    try {
      await companiesAPI.updateCompany(editingCompany.id, data);
      if (data.accessible_days) await companiesAPI.setDayAccess(editingCompany.id, data.accessible_days);
      setEditingCompany(null); fetchCompanies();
      if (selectedCompany?.id === editingCompany.id) { const u = await companiesAPI.getCompanies(); setSelectedCompany(u.find(c => c.id === editingCompany.id) || null); }
    } catch (err: any) { setError(err.response?.data?.error || 'Failed'); }
  };
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await companiesAPI.deleteCompany(id); if (selectedCompany?.id === id) setSelectedCompany(null); fetchCompanies(); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed'); }
  };

  if (showForm || editingCompany) {
    return <CompanyForm company={editingCompany} onSubmit={editingCompany ? handleEdit : handleCreate}
      onCancel={() => { setShowForm(false); setEditingCompany(null); }} availableDays={availableDays} />;
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Companies ({companies.length})</h2>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Company
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Invite Code</th>
                    <th className="text-left px-4 py-3">Members</th><th className="text-left px-4 py-3">Days</th>
                    <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id} onClick={() => setSelectedCompany(c)}
                      className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${selectedCompany?.id === c.id ? 'bg-indigo-500/10' : ''}`}>
                      <td className="px-4 py-3 text-slate-200 font-medium">{c.name}</td>
                      <td className="px-4 py-3"><code className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded text-xs">{c.invite_code}</code></td>
                      <td className="px-4 py-3 text-slate-400">{c.member_count}</td>
                      <td className="px-4 py-3 text-slate-400">{c.accessible_days?.length || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {c.is_public && <span className="ml-1.5 text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400">Public</span>}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={e => { e.stopPropagation(); setEditingCompany(c); }}
                          className="text-slate-400 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                          className="text-rose-400 hover:text-rose-300 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-slate-500 py-8">No companies yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedCompany && (
          <CompanyDetail company={selectedCompany} availableDays={availableDays} allUsers={allUsers}
            onUpdate={fetchCompanies} onClose={() => setSelectedCompany(null)} />
        )}
      </div>
    </div>
  );
};

export default CompanyManagement;
