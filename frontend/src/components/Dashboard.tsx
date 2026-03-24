import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daysAPI, progressAPI, publicAPI, enrollmentAPI } from '../utils/api';
import { Day, UserProgress, FreeResource } from '../types';
import { getAuthData } from '../utils/auth';
import { BookOpen, FileText, Play, Check, ChevronRight, Sparkles, Plus, Clock, User } from 'lucide-react';
import MyCertificates from './MyCertificates';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  'no-code': 'bg-sky-500/10 text-sky-400',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<Day[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [freeResources, setFreeResources] = useState<FreeResource[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = getAuthData();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [daysData, progressData, resourcesData, enrollData] = await Promise.all([
        daysAPI.getDays(), progressAPI.getProgress(), publicAPI.getFreeResources(),
        enrollmentAPI.getMyEnrollments().catch(() => []),
      ]);
      setDays(daysData);
      setProgress(progressData);
      setFreeResources(resourcesData);
      setEnrollments(enrollData);
    } catch {
      setError('Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getEnrollment = (resourceId: number) => enrollments.find(e => e.resource_id === resourceId);
  const isEnrolled = (resourceId: number) => !!getEnrollment(resourceId);
  const getDayProgress = (dayNumber: number) => progress.find((p) => p.day_number === dayNumber);

  const enrolledResources = freeResources.filter(r => isEnrolled(r.id));
  const unenrolledResources = freeResources.filter(r => !isEnrolled(r.id));

  // Combined stats: day completions + resource completions
  const completedDays = progress.filter(p => p.completed).length;
  const completedResources = enrollments.filter(e => e.completed).length;
  const totalLearning = days.length + enrolledResources.length;
  const totalCompleted = completedDays + completedResources;
  const overallPercent = totalLearning > 0 ? Math.round((totalCompleted / totalLearning) * 100) : 0;

  const handleAddToLearning = async (resourceId: number) => {
    try {
      await enrollmentAPI.getResource(resourceId); // auto-enrolls
      fetchData(); // refresh
    } catch {}
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
      {/* Header + Stats */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          Welcome, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user?.username}</span>
        </h1>
        <div className="flex gap-4">
          <div className="glass-card px-5 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Overall Progress</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              {overallPercent}%
            </p>
          </div>
          <div className="glass-card px-5 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-bold text-white">
              {totalCompleted}<span className="text-sm text-slate-500 font-normal"> / {totalLearning}</span>
            </p>
          </div>
          <div className="glass-card px-5 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Enrolled Courses</p>
            <p className="text-2xl font-bold text-white">{enrolledResources.length}</p>
          </div>
        </div>
      </div>

      {/* ========== CERTIFICATES ========== */}
      <MyCertificates />

      {/* ========== MY LEARNING ========== */}
      {(days.length > 0 || enrolledResources.length > 0) && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" /> My Learning
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Day content cards */}
            {days.map((day) => {
              const dayProgress = getDayProgress(day.day_number);
              const isCompleted = dayProgress?.completed || false;
              return (
                <div key={`day-${day.day_number}`}
                  className={`glass-card-hover p-6 cursor-pointer group ${isCompleted ? 'border-emerald-500/30' : ''}`}
                  onClick={() => navigate(`/day/${day.day_number}`)}>
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
                  <h4 className="text-lg font-semibold text-slate-100 group-hover:text-white mb-2 transition-colors">{day.title}</h4>
                  {day.description && <p className="text-sm text-slate-400 line-clamp-2 mb-4">{day.description}</p>}
                  <div className="flex items-center gap-4 pt-4 border-t border-white/5 text-sm text-slate-500">
                    {day.videos > 0 && <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5" />{day.videos}</span>}
                    {day.notebooks > 0 && <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{day.notebooks}</span>}
                    {day.pdfs > 0 && <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{day.pdfs}</span>}
                  </div>
                  {dayProgress && (
                    <p className="text-xs text-slate-600 mt-3">Last accessed: {new Date(dayProgress.last_accessed).toLocaleDateString()}</p>
                  )}
                </div>
              );
            })}

            {/* Enrolled free resource cards */}
            {enrolledResources.map((r) => {
              const enrollment = getEnrollment(r.id);
              return (
                <div key={`resource-${r.id}`}
                  className={`glass-card-hover p-6 cursor-pointer group ${enrollment?.completed ? 'border-emerald-500/30' : ''}`}
                  onClick={() => navigate(`/resource/${r.id}`)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-violet-400 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5" /> Free Course
                    </span>
                    <div className="flex items-center gap-2">
                      {r.level && (
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${LEVEL_STYLES[r.level] || 'bg-slate-700 text-slate-300'}`}>
                          {r.level}
                        </span>
                      )}
                      {enrollment?.completed && (
                        <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-100 group-hover:text-white mb-2 transition-colors">{r.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                    {r.instructor && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {r.instructor}</span>}
                    {r.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.duration}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-xs text-emerald-400">Enrolled</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>

          {days.length === 0 && enrolledResources.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p>No courses in your learning yet.</p>
              <p className="text-sm mt-1">Add courses from the explore section below.</p>
            </div>
          )}
        </div>
      )}

      {/* ========== EXPLORE / ADD TO LEARNING ========== */}
      {unenrolledResources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold text-white">Courses you might want to explore</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unenrolledResources.map((r) => (
              <div key={r.id} className="glass-card p-5 group">
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
                <h4 className="font-semibold text-slate-100 mb-1">{r.title}</h4>
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                  {r.instructor && <span>{r.instructor}</span>}
                  {r.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.duration}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAddToLearning(r.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl py-2 text-sm font-medium transition-all">
                    <Plus className="w-3.5 h-3.5" /> Add to My Learning
                  </button>
                  <button onClick={() => navigate(`/resource/${r.id}`)}
                    className="flex items-center justify-center gap-1 bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm transition-all">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
