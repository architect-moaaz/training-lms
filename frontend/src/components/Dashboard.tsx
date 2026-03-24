import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daysAPI, progressAPI } from '../utils/api';
import { Day, UserProgress } from '../types';
import { getAuthData } from '../utils/auth';
import { BookOpen, FileText, Play, Check } from 'lucide-react';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  'no-code': 'bg-sky-500/10 text-sky-400',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<Day[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = getAuthData();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [daysData, progressData] = await Promise.all([daysAPI.getDays(), progressAPI.getProgress()]);
      setDays(daysData);
      setProgress(progressData);
    } catch (err: any) {
      setError('Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDayProgress = (dayNumber: number) => progress.find((p) => p.day_number === dayNumber);
  const getCompletionPercentage = () => {
    if (days.length === 0) return 0;
    return Math.round((progress.filter((p) => p.completed).length / days.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-slate-700/50 rounded w-20 mb-4" />
              <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-700/50 rounded w-full mb-2" />
              <div className="h-4 bg-slate-700/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full text-center">
        <div className="error-banner">{error}</div>
        <button onClick={fetchData} className="btn-primary mt-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          Welcome, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user?.username}</span>
        </h1>
        <div className="flex gap-4">
          <div className="glass-card px-5 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Overall Progress</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              {getCompletionPercentage()}%
            </p>
          </div>
          <div className="glass-card px-5 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-bold text-white">
              {progress.filter((p) => p.completed).length}
              <span className="text-sm text-slate-500 font-normal"> / {days.length}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {days.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            {user?.companies && user.companies.length === 0 && !user.is_admin ? (
              <><p>You are not assigned to any company.</p><p className="text-sm mt-1">Contact your administrator or register with a valid invite code to access content.</p></>
            ) : (
              <><p>No learning content available yet.</p><p className="text-sm mt-1">Check back later!</p></>
            )}
          </div>
        ) : (
          days.map((day) => {
            const dayProgress = getDayProgress(day.day_number);
            const isCompleted = dayProgress?.completed || false;

            return (
              <div
                key={day.day_number}
                className={`glass-card-hover p-6 cursor-pointer group ${isCompleted ? 'border-emerald-500/30' : ''}`}
                onClick={() => navigate(`/day/${day.day_number}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-indigo-400">Day {day.day_number}</span>
                  <div className="flex items-center gap-2">
                    {day.level && (
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${LEVEL_STYLES[day.level] || 'bg-slate-700 text-slate-300'}`}>
                        {day.level}
                      </span>
                    )}
                    {isCompleted && (
                      <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-lg font-semibold text-slate-100 group-hover:text-white mb-2 transition-colors">
                  {day.title}
                </h4>

                {day.description && (
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{day.description}</p>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-white/5 text-sm text-slate-500">
                  {day.videos > 0 && (
                    <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5" />{day.videos}</span>
                  )}
                  {day.notebooks > 0 && (
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{day.notebooks}</span>
                  )}
                  {day.pdfs > 0 && (
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{day.pdfs}</span>
                  )}
                </div>

                {dayProgress && (
                  <p className="text-xs text-slate-600 mt-3">
                    Last accessed: {new Date(dayProgress.last_accessed).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dashboard;
