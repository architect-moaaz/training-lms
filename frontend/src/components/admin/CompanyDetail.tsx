import React, { useState, useEffect } from 'react';
import { Company, CompanyMember } from '../../types';
import { companiesAPI } from '../../utils/api';
import { X, Plus, Trash2 } from 'lucide-react';

interface CompanyDetailProps {
  company: Company;
  availableDays: number[];
  allUsers: { id: number; username: string; email: string }[];
  onUpdate: () => void;
  onClose: () => void;
}

const CompanyDetail: React.FC<CompanyDetailProps> = ({ company, availableDays, allUsers, onUpdate, onClose }) => {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>(company.accessible_days || []);
  const [addUserId, setAddUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchMembers(); setSelectedDays(company.accessible_days || []); }, [company.id]);

  const fetchMembers = async () => { try { setMembers(await companiesAPI.getMembers(company.id)); } catch { setError('Failed to load members'); } };

  const handleDayToggle = async (dayNum: number) => {
    const newDays = selectedDays.includes(dayNum) ? selectedDays.filter(d => d !== dayNum) : [...selectedDays, dayNum];
    setSelectedDays(newDays);
    try { await companiesAPI.setDayAccess(company.id, newDays); onUpdate(); }
    catch { setError('Failed to update'); setSelectedDays(selectedDays); }
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    setLoading(true); setError('');
    try { await companiesAPI.addMember(company.id, parseInt(addUserId)); setAddUserId(''); fetchMembers(); onUpdate(); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm('Remove from company?')) return;
    try { await companiesAPI.removeMember(company.id, userId); fetchMembers(); onUpdate(); }
    catch { setError('Failed'); }
  };

  const memberIds = new Set(members.map(m => m.user_id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

  return (
    <div className="w-96 shrink-0">
      <div className="glass-card p-6 sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{company.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {error && <div className="error-banner text-sm">{error}</div>}

        {/* Info */}
        <div className="space-y-2 text-sm mb-6">
          <p className="text-slate-400">Invite: <code className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded text-xs">{company.invite_code}</code></p>
          <p className="text-slate-400">Status: <span className={company.is_active ? 'text-emerald-400' : 'text-slate-500'}>{company.is_active ? 'Active' : 'Inactive'}</span></p>
          <p className="text-slate-400">Domains: <span className="text-slate-200">{company.email_domains.length ? company.email_domains.join(', ') : 'None'}</span></p>
        </div>

        {/* Day Access */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Day Access</h3>
          <div className="flex flex-wrap gap-2">
            {availableDays.map(day => (
              <button key={day} onClick={() => handleDayToggle(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedDays.includes(day) ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-white/5 hover:border-white/10'
                }`}>
                Day {day}
              </button>
            ))}
            {availableDays.length === 0 && <p className="text-xs text-slate-500">No days available.</p>}
          </div>
        </div>

        {/* Members */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Members ({members.length})</h3>
          <div className="flex gap-2 mb-3">
            <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
              className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
              <option value="">Add user...</option>
              {availableUsers.map(u => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
            </select>
            <button onClick={handleAddMember} disabled={!addUserId || loading} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          {members.length > 0 ? (
            <div className="space-y-1.5">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm text-slate-200">{m.username}</p>
                    <p className="text-xs text-slate-500">{m.email} &middot; {m.joined_via.replace('_', ' ')}</p>
                  </div>
                  <button onClick={() => handleRemoveMember(m.user_id)} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500">No members yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;
