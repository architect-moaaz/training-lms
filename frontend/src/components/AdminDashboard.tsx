import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { companiesAPI } from '../utils/api';
import { Company } from '../types';
import CompanyManagement from './admin/CompanyManagement';
import './AdminDashboard.css';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
  registration_ip: string;
  registration_country: string;
  registration_city: string;
  total_pages_visited: number;
  total_time_spent: number;
  total_days_progress: number;
  completed_days: number;
  companies?: { id: number; name: string; joined_via: string }[];
}

interface PageTracking {
  page_url: string;
  page_title: string;
  time_spent: number;
  visit_count: number;
  last_visited: string;
}

interface UserDetails extends User {
  page_tracking: PageTracking[];
  progress: any[];
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'companies'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Company filter state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompanyId, setFilterCompanyId] = useState<string>('');

  // Add member to company state
  const [showAddToCompany, setShowAddToCompany] = useState(false);
  const [addToCompanyId, setAddToCompanyId] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  const fetchUsers = async (companyId?: number) => {
    try {
      const params = companyId ? `?company_id=${companyId}` : '';
      const response = await api.get(`/admin/users${params}`);
      setUsers(response.data.users);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const data = await companiesAPI.getCompanies();
      setCompanies(data);
    } catch {
      // Non-critical
    }
  };

  const handleCompanyFilter = (companyId: string) => {
    setFilterCompanyId(companyId);
    setSelectedUser(null);
    fetchUsers(companyId ? parseInt(companyId) : undefined);
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setSelectedUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load user details');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      await api.post(`/admin/users/${selectedUser.id}/reset-password`, { new_password: newPassword });
      alert('Password reset successfully!');
      setShowResetPassword(false);
      setNewPassword('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      alert('User deleted successfully!');
      setSelectedUser(null);
      fetchUsers(filterCompanyId ? parseInt(filterCompanyId) : undefined);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleAddUserToCompany = async () => {
    if (!selectedUser || !addToCompanyId) return;
    try {
      await companiesAPI.addMember(parseInt(addToCompanyId), selectedUser.id);
      alert('User added to company!');
      setShowAddToCompany(false);
      setAddToCompanyId('');
      fetchUserDetails(selectedUser.id);
      fetchUsers(filterCompanyId ? parseInt(filterCompanyId) : undefined);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add user to company');
    }
  };

  const handleRemoveFromCompany = async (companyId: number) => {
    if (!selectedUser) return;
    if (!window.confirm('Remove user from this company?')) return;
    try {
      await companiesAPI.removeMember(companyId, selectedUser.id);
      fetchUserDetails(selectedUser.id);
      fetchUsers(filterCompanyId ? parseInt(filterCompanyId) : undefined);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove from company');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="admin-dashboard"><p>Loading admin dashboard...</p></div>;
  }

  if (error && users.length === 0 && activeTab === 'users') {
    return <div className="admin-dashboard"><p className="error">{error}</p></div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          Companies
        </button>
      </div>

      {activeTab === 'companies' ? (
        <CompanyManagement allUsers={users.map(u => ({ id: u.id, username: u.username, email: u.email }))} />
      ) : (
        <div>
          {/* Company filter */}
          <div className="filter-bar">
            <label>Filter by Company:</label>
            <select value={filterCompanyId} onChange={e => handleCompanyFilter(e.target.value)}>
              <option value="">All Users</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.member_count})</option>
              ))}
            </select>
          </div>

          <div className="admin-content">
            {/* Users List */}
            <div className="users-list">
              <h2>Users ({users.length})</h2>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Companies</th>
                      <th>Location</th>
                      <th>Time Spent</th>
                      <th>Days Completed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr
                        key={user.id}
                        className={selectedUser?.id === user.id ? 'selected' : ''}
                        onClick={() => fetchUserDetails(user.id)}
                      >
                        <td>{user.id}</td>
                        <td>
                          {user.username}
                          {user.is_admin && <span className="admin-badge">Admin</span>}
                        </td>
                        <td>{user.email}</td>
                        <td>
                          {user.companies && user.companies.length > 0 ? (
                            user.companies.map(c => (
                              <span key={c.id} className="company-badge">{c.name}</span>
                            ))
                          ) : (
                            <span className="no-company">None</span>
                          )}
                        </td>
                        <td>{user.registration_city}, {user.registration_country}</td>
                        <td>{formatTime(user.total_time_spent)}</td>
                        <td>{user.completed_days} / {user.total_days_progress}</td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); fetchUserDetails(user.id); }}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Details */}
            {selectedUser && (
              <div className="user-details">
                <div className="details-header">
                  <h2>User Details: {selectedUser.username}</h2>
                  <button className="close-btn" onClick={() => setSelectedUser(null)}>x</button>
                </div>

                <div className="details-section">
                  <h3>Basic Information</h3>
                  <div className="info-grid">
                    <div><strong>ID:</strong> {selectedUser.id}</div>
                    <div><strong>Username:</strong> {selectedUser.username}</div>
                    <div><strong>Email:</strong> {selectedUser.email}</div>
                    <div><strong>Is Admin:</strong> {selectedUser.is_admin ? 'Yes' : 'No'}</div>
                    <div><strong>Created:</strong> {formatDate(selectedUser.created_at)}</div>
                    <div><strong>Last Login:</strong> {formatDate(selectedUser.last_login)}</div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Company Memberships</h3>
                  {selectedUser.companies && selectedUser.companies.length > 0 ? (
                    <div className="membership-list">
                      {selectedUser.companies.map(c => (
                        <div key={c.id} className="membership-item">
                          <span className="company-badge">{c.name}</span>
                          <span className={`badge badge-${c.joined_via}`}>{c.joined_via.replace('_', ' ')}</span>
                          <button className="btn-remove" onClick={() => handleRemoveFromCompany(c.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No company memberships.</p>
                  )}
                  <div style={{ marginTop: '10px' }}>
                    {!showAddToCompany ? (
                      <button className="btn-primary" onClick={() => setShowAddToCompany(true)}>
                        + Add to Company
                      </button>
                    ) : (
                      <div className="add-member-row">
                        <select value={addToCompanyId} onChange={e => setAddToCompanyId(e.target.value)}>
                          <option value="">Select company...</option>
                          {companies
                            .filter(c => !selectedUser.companies?.some(uc => uc.id === c.id))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <button className="btn-primary" onClick={handleAddUserToCompany} disabled={!addToCompanyId}>Add</button>
                        <button className="btn-secondary" onClick={() => { setShowAddToCompany(false); setAddToCompanyId(''); }}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="details-section">
                  <h3>Location & Registration</h3>
                  <div className="info-grid">
                    <div><strong>IP Address:</strong> {selectedUser.registration_ip || 'N/A'}</div>
                    <div><strong>Country:</strong> {selectedUser.registration_country || 'N/A'}</div>
                    <div><strong>City:</strong> {selectedUser.registration_city || 'N/A'}</div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Activity Statistics</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{selectedUser.total_pages_visited}</div>
                      <div className="stat-label">Pages Visited</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{formatTime(selectedUser.total_time_spent)}</div>
                      <div className="stat-label">Total Time Spent</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{selectedUser.completed_days}</div>
                      <div className="stat-label">Days Completed</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{selectedUser.total_days_progress}</div>
                      <div className="stat-label">Days Started</div>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Page Tracking ({selectedUser.page_tracking.length} pages)</h3>
                  <div className="page-tracking-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Page</th>
                          <th>Title</th>
                          <th>Time Spent</th>
                          <th>Visits</th>
                          <th>Last Visit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.page_tracking.map((page, idx) => (
                          <tr key={idx}>
                            <td>{page.page_url}</td>
                            <td>{page.page_title || 'N/A'}</td>
                            <td>{formatTime(page.time_spent)}</td>
                            <td>{page.visit_count}</td>
                            <td>{formatDate(page.last_visited)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Actions</h3>
                  <div className="action-buttons">
                    <button
                      className="btn-reset"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                    >
                      Reset Password
                    </button>
                    {!selectedUser.is_admin && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteUser(selectedUser.id, selectedUser.username)}
                      >
                        Delete User
                      </button>
                    )}
                  </div>

                  {showResetPassword && (
                    <div className="reset-password-form">
                      <input
                        type="password"
                        placeholder="New password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button onClick={handleResetPassword}>Confirm Reset</button>
                      <button onClick={() => { setShowResetPassword(false); setNewPassword(''); }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
