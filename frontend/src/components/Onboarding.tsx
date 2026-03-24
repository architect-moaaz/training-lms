import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import { setAuthData, getAuthData } from '../utils/auth';
import { ArrowRight, ArrowLeft, User, Briefcase, Target } from 'lucide-react';

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to AI/ML' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience with AI tools' },
  { value: 'advanced', label: 'Advanced', desc: 'Building AI systems professionally' },
];

const HOW_HEARD_OPTIONS = [
  'Google Search', 'LinkedIn', 'Twitter/X', 'YouTube', 'Friend/Colleague',
  'Company Training', 'Conference/Event', 'Other',
];

const INTEREST_OPTIONS = [
  'Agentic AI', 'LangChain/LangGraph', 'RAG', 'Prompt Engineering',
  'No-Code AI', 'Multi-Agent Systems', 'AI Automation', 'Computer Vision',
  'NLP', 'MLOps',
];

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { user } = getAuthData();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: user?.username || '',
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

  const updateForm = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  };

  const toggleInterest = (interest: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError('Please enter your name'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await authAPI.submitOnboarding({
        ...form,
        interests: form.interests.join(', '),
      });
      // Update stored user data with onboarding_completed
      const { token } = getAuthData();
      if (token && result.user) {
        setAuthData(token, localStorage.getItem('refresh_token') || '', result.user);
      }
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 3;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />

      <div className="glass-card p-8 w-full max-w-lg animate-slide-up relative z-10">
        <div className="flex items-center justify-center mb-3">
          <img src="/spark10k-logo.png" alt="Spark10K" className="h-10" />
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-1">Welcome to Spark10K</h1>
        <p className="text-slate-400 text-center text-sm mb-6">Let's get you set up — just a few quick questions.</p>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-indigo-500' : 'bg-white/10'}`} />
          ))}
        </div>

        {error && <div className="error-banner text-sm mb-4">{error}</div>}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">About You</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => updateForm('full_name', e.target.value)}
                className="input-field" placeholder="Your full name" required />
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
        )}

        {/* Step 2: Professional Info */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Professional Background</h2>
            </div>
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
        )}

        {/* Step 3: Survey */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Your Learning Goals</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">How did you hear about us?</label>
              <select value={form.how_did_you_hear} onChange={e => updateForm('how_did_you_hear', e.target.value)}
                className="input-field">
                <option value="">Select an option</option>
                {HOW_HEARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">What do you hope to learn?</label>
              <textarea value={form.learning_goals} onChange={e => updateForm('learning_goals', e.target.value)}
                className="input-field min-h-[80px]" placeholder="Tell us about your learning goals..." />
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
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              className="btn-ghost text-sm flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < totalSteps ? (
            <button onClick={() => {
              if (step === 1 && !form.full_name.trim()) { setError('Please enter your name'); return; }
              setStep(s => s + 1);
            }}
              className="btn-primary flex items-center gap-1.5">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="btn-primary flex items-center gap-1.5">
              {loading ? 'Saving...' : 'Start Learning'} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
