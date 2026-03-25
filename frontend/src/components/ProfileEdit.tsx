import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { getAuthData, setAuthData } from '../utils/auth';
import { ArrowLeft, Save, User, Briefcase, Target } from 'lucide-react';

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to AI/ML' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience with AI tools' },
  { value: 'advanced', label: 'Advanced', desc: 'Building AI systems professionally' },
];

const INTEREST_OPTIONS = [
  'Agentic AI', 'LangChain/LangGraph', 'RAG', 'Prompt Engineering',
  'No-Code AI', 'Multi-Agent Systems', 'AI Automation', 'Computer Vision',
  'NLP', 'MLOps',
];

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const { user } = getAuthData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    organization: '',
    job_title: '',
    country: '',
    city: '',
    experience_level: '',
    how_did_you_hear: '',
    learning_goals: '',
    interests: [] as string[],
  });

  useEffect(() => {
    authAPI.getCurrentUser().then((u) => {
      if (u.profile) {
        setForm({
          full_name: u.profile.full_name || '',
          phone: u.profile.phone || '',
          organization: u.profile.organization || '',
          job_title: u.profile.job_title || '',
          country: u.profile.country || '',
          city: u.profile.city || '',
          experience_level: u.profile.experience_level || '',
          how_did_you_hear: u.profile.how_did_you_hear || '',
          learning_goals: u.profile.learning_goals || '',
          interests: u.profile.interests ? u.profile.interests.split(', ').filter(Boolean) : [],
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateForm = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
    setSuccess('');
  };

  const toggleInterest = (interest: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest],
    }));
    setSuccess('');
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await authAPI.updateProfile({
        ...form,
        interests: form.interests.join(', '),
      });
      if (result.user) {
        const token = localStorage.getItem('access_token') || '';
        const refresh = localStorage.getItem('refresh_token') || '';
        setAuthData(token, refresh, result.user);
      }
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Loading profile...</div>;
  }

  return (
    <div className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
      <button onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">Edit Profile</h1>
      <p className="text-slate-400 text-sm mb-8">Update your personal and professional information</p>

      {error && <div className="error-banner text-sm mb-4">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-sm mb-4">{success}</div>}

      <div className="space-y-8">
        {/* Personal Info */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Personal Info</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => updateForm('full_name', e.target.value)}
                className="input-field" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => updateForm('phone', e.target.value)}
                className="input-field" placeholder="+1 234 567 8900" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Country</label>
                <input value={form.country} onChange={e => updateForm('country', e.target.value)}
                  className="input-field" placeholder="Country" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                <input value={form.city} onChange={e => updateForm('city', e.target.value)}
                  className="input-field" placeholder="City" />
              </div>
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Professional Background</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization</label>
              <input value={form.organization} onChange={e => updateForm('organization', e.target.value)}
                className="input-field" placeholder="Company or institution" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Job Title</label>
              <input value={form.job_title} onChange={e => updateForm('job_title', e.target.value)}
                className="input-field" placeholder="e.g. Software Engineer, Student" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Experience Level</label>
              <div className="space-y-2">
                {EXPERIENCE_LEVELS.map(level => (
                  <button key={level.value} type="button"
                    onClick={() => updateForm('experience_level', level.value)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      form.experience_level === level.value
                        ? 'bg-indigo-500/20 border-indigo-500/30 text-white'
                        : 'bg-slate-800/50 border-white/5 text-slate-300 hover:border-white/10'
                    }`}>
                    <span className="font-medium">{level.label}</span>
                    <span className="text-sm text-slate-500 ml-2">— {level.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Interests</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Learning Goals</label>
              <textarea value={form.learning_goals} onChange={e => updateForm('learning_goals', e.target.value)}
                className="input-field min-h-[80px]" placeholder="What do you hope to learn?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Topics of Interest</label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(interest => (
                  <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      form.interests.includes(interest)
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 border border-white/5 hover:border-white/10'
                    }`}>
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 px-6 py-3">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;
