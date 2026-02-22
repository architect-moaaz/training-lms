import React, { useState, useEffect } from 'react';
import { Company } from '../../types';

interface CompanyFormProps {
  company?: Company | null;
  onSubmit: (data: {
    name: string;
    invite_code: string;
    email_domains: string[];
    is_active: boolean;
    accessible_days?: number[];
  }) => void;
  onCancel: () => void;
  availableDays: number[];
}

const CompanyForm: React.FC<CompanyFormProps> = ({ company, onSubmit, onCancel, availableDays }) => {
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [emailDomains, setEmailDomains] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setInviteCode(company.invite_code);
      setEmailDomains(company.email_domains.join(', '));
      setIsActive(company.is_active);
      setSelectedDays(company.accessible_days || []);
    }
  }, [company]);

  const handleDayToggle = (dayNum: number) => {
    setSelectedDays(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const domains = emailDomains
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0);

    onSubmit({
      name,
      invite_code: inviteCode,
      email_domains: domains,
      is_active: isActive,
      accessible_days: selectedDays,
    });
  };

  return (
    <form className="company-form" onSubmit={handleSubmit}>
      <h3>{company ? 'Edit Company' : 'Create Company'}</h3>

      <div className="form-field">
        <label>Company Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter company name"
          required
        />
      </div>

      <div className="form-field">
        <label>Invite Code</label>
        <input
          type="text"
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value)}
          placeholder="Enter unique invite code"
          required
        />
      </div>

      <div className="form-field">
        <label>Email Domains (comma-separated)</label>
        <input
          type="text"
          value={emailDomains}
          onChange={e => setEmailDomains(e.target.value)}
          placeholder="e.g. company.com, corp.org"
        />
        <span className="field-hint">Users with matching email domains are auto-assigned.</span>
      </div>

      <div className="form-field-checkbox">
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      {availableDays.length > 0 && (
        <div className="form-field">
          <label>Accessible Days</label>
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
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {company ? 'Update' : 'Create'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CompanyForm;
