import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authAPI } from '../utils/api';
import { setAuthData } from '../utils/auth';



const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/dashboard';
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.emailOrUsername || !formData.password) {
      setError('Please enter both email/username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(formData.emailOrUsername, formData.password);
      setAuthData(response.access_token, response.refresh_token, response.user);
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google login failed. No credential received.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      setAuthData(response.access_token, response.refresh_token, response.user);
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />

      <div className="glass-card p-8 w-full max-w-md animate-slide-up relative z-10">
        <div className="flex items-center justify-center mb-3">
          <img src="/spark10k-logo.png" alt="Spark10K" className="h-10" />
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-1">Welcome Back</h1>
        <p className="text-slate-400 text-center text-sm mb-6">Login to continue your learning journey</p>

        {error && <div className="error-banner text-sm mb-4">{error}</div>}

        <div className="flex justify-center mb-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed.')}
            text="signin_with"
          />
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email or Username</label>
            <input
              type="text"
              name="emailOrUsername"
              value={formData.emailOrUsername}
              onChange={handleChange}
              placeholder="Enter email or username"
              disabled={loading}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              disabled={loading}
              required
              className="input-field"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={loading}
                className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-500/20"
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-400">Remember me</label>
            </div>
            <Link to="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Register here
          </Link>
        </p>
        <p className="text-center text-sm text-slate-600 mt-2">
          <Link to="/lms" className="hover:text-slate-400 transition-colors">
            Back to LMS
          </Link>
          {' · '}
          <Link to="/" className="hover:text-slate-400 transition-colors">
            Spark10K Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
