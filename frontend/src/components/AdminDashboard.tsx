import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load user details');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/admin/users/${selectedUser.id}/reset-password`,
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('User deleted successfully!');
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
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

  if (error && users.length === 0) {
    return <div className="admin-dashboard"><p className="error">{error}</p></div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="admin-content">
        {/* Users List */}
        <div className="users-list">
          <h2>All Users ({users.length})</h2>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
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
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
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
  );
};

export default AdminDashboard;
