import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authAPI } from '../utils/api';
import { setAuthData } from '../utils/auth';



const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/dashboard';
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', inviteCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.username || formData.username.length < 3) { setError('Username must be at least 3 characters'); return false; }
    if (!formData.email || !formData.email.includes('@')) { setError('Please enter a valid email address'); return false; }
    if (!formData.password || formData.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.register(formData.username, formData.email, formData.password, formData.inviteCode || undefined);
      setAuthData(response.access_token, response.refresh_token, response.user);
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) { setError('Google login failed.'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      setAuthData(response.access_token, response.refresh_token, response.user);
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />

      <div className="glass-card p-8 w-full max-w-md animate-slide-up relative z-10">
        <div className="flex items-center justify-center mb-3">
          <img src="/spark10k-logo.png" alt="Spark10K" className="h-10" />
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-1">Create Account</h1>
        <p className="text-slate-400 text-center text-sm mb-6">Join our Learning Management System</p>

        {error && <div className="error-banner text-sm mb-4">{error}</div>}

        <div className="flex justify-center mb-4">
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google login failed.')} text="signup_with" />
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Enter username" disabled={loading} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email" disabled={loading} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter password" disabled={loading} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" disabled={loading} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Invite Code</label>
            <input type="text" name="inviteCode" value={formData.inviteCode} onChange={handleChange} placeholder="Enter invite code (optional)" disabled={loading} className="input-field" />
            <span className="text-xs text-slate-500 mt-1 block">If you have a company invite code, enter it here.</span>
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
