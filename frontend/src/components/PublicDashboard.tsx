import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { publicAPI, authAPI } from '../utils/api';
import { setAuthData } from '../utils/auth';
import { Day, FreeResource } from '../types';
import { Play, BookOpen, FileText, X, Lock, ExternalLink, Sparkles } from 'lucide-react';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  'no-code': 'bg-sky-500/10 text-sky-400',
};

const PublicDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [freeResources, setFreeResources] = useState<FreeResource[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [daysData, resourcesData] = await Promise.all([
        publicAPI.getDays(), publicAPI.getFreeResources()
      ]);
      setDays(daysData);
      setFreeResources(resourcesData);
    } catch {
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDays = fetchData;

  const handleDayClick = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setSelectedResourceId(null);
    setShowLoginModal(true);
    setLoginError('');
  };

  const handleResourceClick = (resourceId: number) => {
    setSelectedResourceId(resourceId);
    setSelectedDay(null);
    setShowLoginModal(true);
    setLoginError('');
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) { setLoginError('Google login failed.'); return; }
    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      setAuthData(response.access_token, response.refresh_token, response.user);
      if (selectedResourceId) {
        navigate(`/resource/${selectedResourceId}`);
      } else if (selectedDay) {
        navigate(`/day/${selectedDay}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Google login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-slate-700/50 rounded w-20 mb-4" />
              <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-700/50 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Explore Courses</h1>
        <p className="text-slate-400">
          Browse our free courses below. Sign in with Google to start learning and track your progress.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {days.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <p>No public courses available yet.</p>
          </div>
        ) : (
          days.map((day) => (
            <div
              key={day.day_number}
              className="glass-card-hover p-6 cursor-pointer group"
              onClick={() => handleDayClick(day.day_number)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-indigo-400">Day {day.day_number}</span>
                {day.level && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${LEVEL_STYLES[day.level] || 'bg-slate-700 text-slate-300'}`}>
                    {day.level}
                  </span>
                )}
              </div>

              <h4 className="text-lg font-semibold text-slate-100 group-hover:text-white mb-2 transition-colors">
                {day.title}
              </h4>

              {day.description && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">{day.description}</p>
              )}

              <div className="flex items-center gap-4 pt-4 border-t border-white/5 text-sm text-slate-500">
                {day.videos > 0 && <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5" />{day.videos}</span>}
                {day.notebooks > 0 && <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{day.notebooks}</span>}
                {day.pdfs > 0 && <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{day.pdfs}</span>}
                <span className="ml-auto flex items-center gap-1 text-indigo-400 text-xs">
                  <Lock className="w-3 h-3" /> Sign in to access
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Free Resources - No login required */}
      {freeResources.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold text-white">Courses you might want to explore</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freeResources.map((r) => (
              <div key={r.id} onClick={() => handleResourceClick(r.id)}
                className="glass-card-hover p-5 group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs text-violet-400">
                    <Play className="w-3 h-3" /> Free Course
                  </span>
                  {r.level && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_STYLES[r.level] || 'bg-slate-700 text-slate-300'}`}>
                      {r.level}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-slate-100 group-hover:text-white mb-1 transition-colors">{r.title}</h4>
                <p className="text-sm text-slate-500">{r.instructor && `${r.instructor} · `}{r.duration}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-indigo-400">
                  <Lock className="w-3 h-3" /> Sign in to start learning
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => !loginLoading && setShowLoginModal(false)}>
          <div className="glass-card p-8 w-full max-w-md mx-4 animate-slide-up relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors" onClick={() => !loginLoading && setShowLoginModal(false)}>
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white text-center mb-2">Sign in to access this course</h2>
            <p className="text-slate-400 text-sm text-center mb-6">
              Use your Google account to start learning and track your progress.
            </p>

            {loginError && <div className="error-banner text-sm mb-4">{loginError}</div>}

            <div className="flex justify-center mb-4">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setLoginError('Google login failed.')} text="signin_with" size="large" />
            </div>

            {loginLoading && <p className="text-indigo-400 text-sm text-center">Signing you in...</p>}

            <p className="text-slate-500 text-xs text-center mt-6">
              Have a company account?{' '}
              <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Login here</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicDashboard;
