import React, { useState, useEffect } from 'react';
import { Company } from '../../types';
import { companiesAPI, daysAPI } from '../../utils/api';
import CompanyForm from './CompanyForm';
import CompanyDetail from './CompanyDetail';

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

  useEffect(() => {
    fetchCompanies();
    fetchAvailableDays();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await companiesAPI.getCompanies();
      setCompanies(data);
    } catch (err: any) {
      setError('Failed to load companies');
    }
  };

  const fetchAvailableDays = async () => {
    try {
      const days = await daysAPI.getDays();
      setAvailableDays(days.map(d => d.day_number).sort((a, b) => a - b));
    } catch {
      // Non-critical - days may not be loaded
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await companiesAPI.createCompany(data);
      setShowForm(false);
      fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create company');
    }
  };

  const handleEdit = async (data: any) => {
    if (!editingCompany) return;
    try {
      await companiesAPI.updateCompany(editingCompany.id, data);
      if (data.accessible_days) {
        await companiesAPI.setDayAccess(editingCompany.id, data.accessible_days);
      }
      setEditingCompany(null);
      fetchCompanies();
      if (selectedCompany?.id === editingCompany.id) {
        const updated = await companiesAPI.getCompanies();
        const refreshed = updated.find(c => c.id === editingCompany.id);
        setSelectedCompany(refreshed || null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update company');
    }
  };

  const handleDelete = async (companyId: number, companyName: string) => {
    if (!window.confirm(`Delete company "${companyName}"? This will remove all memberships.`)) return;
    try {
      await companiesAPI.deleteCompany(companyId);
      if (selectedCompany?.id === companyId) setSelectedCompany(null);
      fetchCompanies();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete company');
    }
  };

  const handleCompanyUpdate = () => {
    fetchCompanies();
  };

  if (showForm || editingCompany) {
    return (
      <CompanyForm
        company={editingCompany}
        onSubmit={editingCompany ? handleEdit : handleCreate}
        onCancel={() => { setShowForm(false); setEditingCompany(null); }}
        availableDays={availableDays}
      />
    );
  }

  return (
    <div className="company-management">
      {error && <div className="error-banner">{error}</div>}

      <div className="admin-content">
        <div className="companies-list">
          <div className="list-header">
            <h2>Companies ({companies.length})</h2>
            <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Company</button>
          </div>

          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Invite Code</th>
                <th>Members</th>
                <th>Days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr
                  key={company.id}
                  className={selectedCompany?.id === company.id ? 'selected' : ''}
                  onClick={() => setSelectedCompany(company)}
                >
                  <td>{company.name}</td>
                  <td><code>{company.invite_code}</code></td>
                  <td>{company.member_count}</td>
                  <td>{company.accessible_days?.length || 0}</td>
                  <td>
                    <span className={`status-badge ${company.is_active ? 'active' : 'inactive'}`}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button onClick={(e) => { e.stopPropagation(); setEditingCompany(company); }}>Edit</button>
                    {' '}
                    <button className="btn-delete-sm" onClick={(e) => { e.stopPropagation(); handleDelete(company.id, company.name); }}>Delete</button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No companies yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedCompany && (
          <CompanyDetail
            company={selectedCompany}
            availableDays={availableDays}
            allUsers={allUsers}
            onUpdate={handleCompanyUpdate}
            onClose={() => setSelectedCompany(null)}
          />
        )}
      </div>
    </div>
  );
};

export default CompanyManagement;
