import React, { useState, useEffect } from 'react';
import { Company, CompanyMember } from '../../types';
import { companiesAPI } from '../../utils/api';

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

  useEffect(() => {
    fetchMembers();
    setSelectedDays(company.accessible_days || []);
  }, [company.id]);

  const fetchMembers = async () => {
    try {
      const data = await companiesAPI.getMembers(company.id);
      setMembers(data);
    } catch (err: any) {
      setError('Failed to load members');
    }
  };

  const handleDayToggle = async (dayNum: number) => {
    const newDays = selectedDays.includes(dayNum)
      ? selectedDays.filter(d => d !== dayNum)
      : [...selectedDays, dayNum];
    setSelectedDays(newDays);

    try {
      await companiesAPI.setDayAccess(company.id, newDays);
      onUpdate();
    } catch (err: any) {
      setError('Failed to update day access');
      setSelectedDays(selectedDays); // revert
    }
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    setLoading(true);
    setError('');
    try {
      await companiesAPI.addMember(company.id, parseInt(addUserId));
      setAddUserId('');
      fetchMembers();
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm('Remove this user from the company?')) return;
    try {
      await companiesAPI.removeMember(company.id, userId);
      fetchMembers();
      onUpdate();
    } catch (err: any) {
      setError('Failed to remove member');
    }
  };

  // Filter out users already in this company
  const memberIds = new Set(members.map(m => m.user_id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

  return (
    <div className="company-detail">
      <div className="details-header">
        <h2>{company.name}</h2>
        <button className="close-btn" onClick={onClose}>x</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="details-section">
        <h3>Company Info</h3>
        <div className="info-grid">
          <div><strong>Invite Code:</strong> <code>{company.invite_code}</code></div>
          <div><strong>Status:</strong> {company.is_active ? 'Active' : 'Inactive'}</div>
          <div><strong>Email Domains:</strong> {company.email_domains.length > 0 ? company.email_domains.join(', ') : 'None'}</div>
          <div><strong>Members:</strong> {company.member_count}</div>
        </div>
      </div>

      <div className="details-section">
        <h3>Day Access</h3>
        <div className="day-access-grid">
          {availableDays.map(day => (
            <label key={day} className={`day-checkbox ${selectedDays.includes(day) ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={selectedDays.includes(day)}
                onChange={() => handleDayToggle(day)}
              />
              Day {day}
            </label>
          ))}
          {availableDays.length === 0 && <p>No days available in the system.</p>}
        </div>
      </div>

      <div className="details-section">
        <h3>Members ({members.length})</h3>
        <div className="add-member-row">
          <select value={addUserId} onChange={e => setAddUserId(e.target.value)}>
            <option value="">Select user to add...</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
            ))}
          </select>
          <button onClick={handleAddMember} disabled={!addUserId || loading} className="btn-primary">
            Add
          </button>
        </div>

        {members.length > 0 ? (
          <table className="members-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Joined Via</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id}>
                  <td>{m.username}</td>
                  <td>{m.email}</td>
                  <td><span className={`badge badge-${m.joined_via}`}>{m.joined_via.replace('_', ' ')}</span></td>
                  <td>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <button className="btn-remove" onClick={() => handleRemoveMember(m.user_id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No members yet.</p>
        )}
      </div>
    </div>
  );
};

export default CompanyDetail;
