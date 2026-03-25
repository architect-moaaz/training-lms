import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { analyticsAPI } from '../../utils/api';
import { Users, Clock, BookOpen, Building, Globe, BarChart3, TrendingUp, Sparkles, Download } from 'lucide-react';

const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try { setData(await analyticsAPI.get()); }
    catch { setError('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const BarChart: React.FC<{ data: Record<string, number>; color?: string }> = ({ data: chartData, color = 'indigo' }) => {
    const entries = Object.entries(chartData);
    if (!entries.length) return <p className="text-xs text-slate-500">No data yet</p>;
    const max = Math.max(...entries.map(([, v]) => v));
    return (
      <div className="space-y-2">
        {entries.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-28 truncate text-right" title={label}>{label}</span>
            <div className="flex-1 bg-slate-800/50 rounded-full h-6 overflow-hidden">
              <div className={`h-full bg-${color}-500/30 rounded-full flex items-center px-2 transition-all duration-500`}
                style={{ width: `${Math.max((value / max) * 100, 8)}%` }}>
                <span className="text-xs text-slate-200 font-medium">{value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-slate-400">Loading analytics...</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return null;

  const { overview, demographics, registrations_by_date, company_distribution } = data;

  const handleExportCSV = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/admin/analytics/export?format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spark10k_analytics.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  };

  return (
    <div className="space-y-8">
      {/* Export Button */}
      <div className="flex justify-end">
        <button onClick={handleExportCSV}
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-4 py-2 rounded-xl text-sm transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: overview.total_users, color: 'indigo' },
          { icon: TrendingUp, label: 'Onboarding Rate', value: `${overview.onboarding_rate}%`, color: 'emerald' },
          { icon: Clock, label: 'Total Learning Time', value: formatTime(overview.total_time_spent), color: 'amber' },
          { icon: BookOpen, label: 'Days Completed', value: overview.completed_days_total, color: 'violet' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
              <span className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Levels */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Experience Levels
          </h3>
          <BarChart data={demographics.experience_levels} color="indigo" />
        </div>

        {/* Countries */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" /> Top Countries
          </h3>
          <BarChart data={demographics.countries} color="emerald" />
        </div>

        {/* How Did You Hear */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> How Users Found Us
          </h3>
          <BarChart data={demographics.how_did_you_hear} color="violet" />
        </div>

        {/* Interests */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" /> Topic Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(demographics.interests || {}).map(([interest, count]) => (
              <span key={interest} className="bg-amber-500/10 text-amber-300 text-xs px-3 py-1.5 rounded-full">
                {interest} <span className="text-amber-500 ml-1">({count as number})</span>
              </span>
            ))}
            {Object.keys(demographics.interests || {}).length === 0 && (
              <p className="text-xs text-slate-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Company Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-400" /> Company Distribution
          </h3>
          <BarChart data={company_distribution} color="sky" />
        </div>

        {/* Organizations */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-rose-400" /> Top Organizations
          </h3>
          <BarChart data={demographics.organizations} color="rose" />
        </div>

        {/* Registrations Over Time */}
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Registrations (Last 30 Days)
          </h3>
          {Object.keys(registrations_by_date).length > 0 ? (
            <div className="flex items-end gap-1 h-32">
              {Object.entries(registrations_by_date).map(([date, count]) => {
                const max = Math.max(...Object.values(registrations_by_date) as number[]);
                const height = Math.max(((count as number) / max) * 100, 5);
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {date}: {count as number} user{(count as number) !== 1 ? 's' : ''}
                    </div>
                    <div className="w-full bg-indigo-500/30 rounded-t transition-all hover:bg-indigo-500/50"
                      style={{ height: `${height}%` }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No registrations in the last 30 days</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-slate-500">Onboarded:</span> <span className="text-white font-medium">{overview.onboarded_users} / {overview.total_users}</span></div>
          <div><span className="text-slate-500">Active Companies:</span> <span className="text-white font-medium">{overview.active_companies}</span></div>
          <div><span className="text-slate-500">Free Resources:</span> <span className="text-white font-medium">{overview.free_resources_count}</span></div>
          <div><span className="text-slate-500">Total Days Completed:</span> <span className="text-white font-medium">{overview.completed_days_total}</span></div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
