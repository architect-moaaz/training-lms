import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { companiesAPI } from '../utils/api';
import { Company } from '../types';
import CompanyManagement from './admin/CompanyManagement';
import { Users, Building, Shield, Clock, BookOpen, MapPin, Trash2, KeyRound, X, Plus } from 'lucide-react';

interface User {
  id: number; username: string; email: string; is_admin: boolean; created_at: string; last_login: string | null;
  registration_ip: string; registration_country: string; registration_city: string;
  total_pages_visited: number; total_time_spent: number; total_days_progress: number; completed_days: number;
  companies?: { id: number; name: string; joined_via: string }[];
}

interface PageTracking { page_url: string; page_title: string; time_spent: number; visit_count: number; last_visited: string; }
interface UserDetails extends User { page_tracking: PageTracking[]; progress: any[]; }

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'companies'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompanyId, setFilterCompanyId] = useState<string>('');
  const [showAddToCompany, setShowAddToCompany] = useState(false);
  const [addToCompanyId, setAddToCompanyId] = useState('');

  useEffect(() => { fetchUsers(); fetchCompanies(); }, []);

  const fetchUsers = async (companyId?: number) => {
    try { const r = await api.get(`/admin/users${companyId ? `?company_id=${companyId}` : ''}`); setUsers(r.data.users); setLoading(false); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed to load users'); setLoading(false); }
  };
  const fetchCompanies = async () => { try { setCompanies(await companiesAPI.getCompanies()); } catch {} };
  const handleCompanyFilter = (cid: string) => { setFilterCompanyId(cid); setSelectedUser(null); fetchUsers(cid ? parseInt(cid) : undefined); };
  const fetchUserDetails = async (userId: number) => { try { const r = await api.get(`/admin/users/${userId}`); setSelectedUser(r.data); } catch (err: any) { setError(err.response?.data?.error || 'Failed to load user details'); } };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    try { await api.post(`/admin/users/${selectedUser.id}/reset-password`, { new_password: newPassword }); alert('Password reset successfully!'); setShowResetPassword(false); setNewPassword(''); }
    catch (err: any) { alert(err.response?.data?.error || 'Failed to reset password'); }
  };
  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try { await api.delete(`/admin/users/${userId}`); setSelectedUser(null); fetchUsers(filterCompanyId ? parseInt(filterCompanyId) : undefined); }
    catch (err: any) { alert(err.response?.data?.error || 'Failed to delete user'); }
  };
  const handleAddUserToCompany = async () => {
    if (!selectedUser || !addToCompanyId) return;
    try { await companiesAPI.addMember(parseInt(addToCompanyId), selectedUser.id); setShowAddToCompany(false); setAddToCompanyId(''); fetchUserDetails(selectedUser.id); fetchUsers(filterCompanyId ? parseInt(filterCompanyId) : undefined); }
    catch (err: any) { alert(err.response?.data?.error || 'Failed to add'); }
  };
  const handleRemoveFromCompany = async (companyId: number) => {
    if (!selectedUser || !window.confirm('Remove from company?')) return;
    try { await companiesAPI.removeMember(companyId, selectedUser.id); fetchUserDetails(selectedUser.id); fetchUsers(filterCompanyId ? parseInt(filterCompanyId) : undefined); }
    catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : 'Never';

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading admin dashboard...</div>;

  return (
    <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>

      <div className="flex gap-1 border-b border-white/10 mb-6">
        {(['users', 'companies'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-all flex items-center gap-2
              ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}>
            {tab === 'users' ? <Users className="w-4 h-4" /> : <Building className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      {error && <div className="error-banner mb-4">{error}</div>}

      {activeTab === 'companies' ? (
        <CompanyManagement allUsers={users.map(u => ({ id: u.id, username: u.username, email: u.email }))} />
      ) : (
        <>
          <div className="glass-card p-3 mb-6 flex items-center gap-3">
            <label className="text-sm text-slate-400">Filter:</label>
            <select value={filterCompanyId} onChange={e => handleCompanyFilter(e.target.value)}
              className="bg-slate-800 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
              <option value="">All Users</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.member_count})</option>)}
            </select>
          </div>

          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Users ({users.length})</h2>
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-3">ID</th><th className="text-left px-4 py-3">Username</th>
                        <th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Companies</th>
                        <th className="text-left px-4 py-3">Location</th><th className="text-left px-4 py-3">Time</th>
                        <th className="text-left px-4 py-3">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} onClick={() => fetchUserDetails(user.id)}
                          className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${selectedUser?.id === user.id ? 'bg-indigo-500/10' : ''}`}>
                          <td className="px-4 py-3 text-slate-500">{user.id}</td>
                          <td className="px-4 py-3 text-slate-200">
                            {user.username}
                            {user.is_admin && <span className="ml-2 bg-rose-500/20 text-rose-400 text-xs px-2 py-0.5 rounded-full">Admin</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{user.email}</td>
                          <td className="px-4 py-3">
                            {user.companies?.length ? user.companies.map(c => (
                              <span key={c.id} className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full mr-1">{c.name}</span>
                            )) : <span className="text-slate-600 text-xs">None</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{user.registration_city}, {user.registration_country}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{formatTime(user.total_time_spent)}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{user.completed_days}/{user.total_days_progress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {selectedUser && (
              <div className="w-96 shrink-0">
                <div className="glass-card p-6 sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">{selectedUser.username}</h2>
                    <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm mb-6">
                    <p className="text-slate-400">Email: <span className="text-slate-200">{selectedUser.email}</span></p>
                    <p className="text-slate-400">Admin: <span className="text-slate-200">{selectedUser.is_admin ? 'Yes' : 'No'}</span></p>
                    <p className="text-slate-400">Created: <span className="text-slate-200">{formatDate(selectedUser.created_at)}</span></p>
                    <p className="text-slate-400">Last Login: <span className="text-slate-200">{formatDate(selectedUser.last_login)}</span></p>
                  </div>

                  {/* Companies */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Companies</h3>
                    {selectedUser.companies?.length ? selectedUser.companies.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 mb-1.5">
                        <div>
                          <span className="text-sm text-slate-200">{c.name}</span>
                          <span className="text-xs text-slate-500 ml-2">{c.joined_via.replace('_', ' ')}</span>
                        </div>
                        <button onClick={() => handleRemoveFromCompany(c.id)} className="text-rose-400 hover:text-rose-300 text-xs">Remove</button>
                      </div>
                    )) : <p className="text-xs text-slate-500">No companies</p>}
                    {!showAddToCompany ? (
                      <button onClick={() => setShowAddToCompany(true)} className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add to Company
                      </button>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <select value={addToCompanyId} onChange={e => setAddToCompanyId(e.target.value)}
                          className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none">
                          <option value="">Select...</option>
                          {companies.filter(c => !selectedUser.companies?.some(uc => uc.id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={handleAddUserToCompany} disabled={!addToCompanyId} className="btn-primary text-xs px-3 py-1.5">Add</button>
                        <button onClick={() => { setShowAddToCompany(false); setAddToCompanyId(''); }} className="btn-ghost text-xs">Cancel</button>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</h3>
                    <p className="text-sm text-slate-400">IP: {selectedUser.registration_ip || 'N/A'}</p>
                    <p className="text-sm text-slate-400">{selectedUser.registration_city}, {selectedUser.registration_country}</p>
                  </div>

                  {/* Stats */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Activity</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: selectedUser.total_pages_visited, l: 'Pages' },
                        { v: formatTime(selectedUser.total_time_spent), l: 'Time' },
                        { v: selectedUser.completed_days, l: 'Completed' },
                        { v: selectedUser.total_days_progress, l: 'Started' },
                      ].map((s, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-white">{s.v}</p>
                          <p className="text-xs text-slate-500">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Page Tracking */}
                  {selectedUser.page_tracking.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Pages ({selectedUser.page_tracking.length})</h3>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {selectedUser.page_tracking.map((p, i) => (
                          <div key={i} className="bg-slate-800/30 rounded-lg px-3 py-2">
                            <p className="text-xs text-slate-300 truncate">{p.page_title || p.page_url}</p>
                            <p className="text-xs text-slate-500">{formatTime(p.time_spent)} &middot; {p.visit_count} visits</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => setShowResetPassword(!showResetPassword)}
                      className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-xl px-3 py-2 text-sm transition-all">
                      <KeyRound className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    {!selectedUser.is_admin && (
                      <button onClick={() => handleDeleteUser(selectedUser.id, selectedUser.username)}
                        className="btn-danger text-sm flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                  {showResetPassword && (
                    <div className="flex gap-2 mt-3">
                      <input type="password" placeholder="New password (min 6)" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="input-field text-sm flex-1" />
                      <button onClick={handleResetPassword} className="btn-primary text-xs px-3">Confirm</button>
                      <button onClick={() => { setShowResetPassword(false); setNewPassword(''); }} className="btn-ghost text-xs">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
