import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link — no token provided.');
      return;
    }

    fetch(`${API_URL}/auth/verify-email/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified!');
          // Update localStorage user if present
          const stored = localStorage.getItem('user');
          if (stored) {
            try {
              const user = JSON.parse(stored);
              user.email_verified = true;
              localStorage.setItem('user', JSON.stringify(user));
            } catch {}
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />

      <div className="glass-card p-8 w-full max-w-md text-center animate-slide-up relative z-10">
        <div className="flex items-center justify-center mb-4">
          <img src="/spark10k-logo.png" alt="Spark10K" className="h-10" />
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Verifying your email...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <Link to="/dashboard" className="btn-primary px-6 py-2.5 inline-block">
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
