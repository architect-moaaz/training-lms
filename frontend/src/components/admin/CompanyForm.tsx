import React, { useState, useEffect } from 'react';
import { Company } from '../../types';
import { ArrowLeft } from 'lucide-react';

interface CompanyFormProps {
  company?: Company | null;
  onSubmit: (data: {
    name: string; invite_code: string; email_domains: string[];
    is_active: boolean; is_public: boolean; accessible_days?: number[];
  }) => void;
  onCancel: () => void;
  availableDays: number[];
}

const CompanyForm: React.FC<CompanyFormProps> = ({ company, onSubmit, onCancel, availableDays }) => {
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [emailDomains, setEmailDomains] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    if (company) {
      setName(company.name); setInviteCode(company.invite_code);
      setEmailDomains(company.email_domains.join(', ')); setIsActive(company.is_active);
      setIsPublic(company.is_public || false); setSelectedDays(company.accessible_days || []);
    }
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name, invite_code: inviteCode,
      email_domains: emailDomains.split(',').map(d => d.trim().toLowerCase()).filter(d => d.length > 0),
      is_active: isActive, is_public: isPublic, accessible_days: selectedDays,
    });
  };

  return (
    <div className="max-w-lg">
      <button onClick={onCancel} className="btn-ghost text-sm flex items-center gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6">{company ? 'Edit Company' : 'Create Company'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter company name" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Invite Code</label>
            <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Unique invite code" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Domains</label>
            <input type="text" value={emailDomains} onChange={e => setEmailDomains(e.target.value)} placeholder="e.g. company.com, corp.org" className="input-field" />
            <p className="text-xs text-slate-500 mt-1">Comma-separated. Users with matching domains are auto-assigned.</p>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20" />
              <span className="text-sm text-slate-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
                className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20" />
              <span className="text-sm text-slate-300">Public</span>
            </label>
          </div>

          {availableDays.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Accessible Days</label>
              <div className="flex flex-wrap gap-2">
                {availableDays.map(day => (
                  <button key={day} type="button" onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedDays.includes(day) ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-white/5 hover:border-white/10'
                    }`}>
                    Day {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">{company ? 'Update' : 'Create'}</button>
            <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;
