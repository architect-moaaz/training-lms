import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { publicAPI, authAPI } from '../utils/api';
import { setAuthData } from '../utils/auth';
import { FreeResource } from '../types';
import {
  GraduationCap, Play, BookOpen, Users, Zap, Shield, ChevronRight,
  ArrowRight, Star, Clock, Globe, Sparkles, CheckCircle,
} from 'lucide-react';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  'no-code': 'bg-sky-500/10 text-sky-400',
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [freeResources, setFreeResources] = useState<FreeResource[]>([]);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    publicAPI.getFreeResources().then(setFreeResources).catch(() => {});
  }, []);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      setAuthData(response.access_token, response.refresh_token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Login failed');
    }
  };

  const features = [
    { icon: Play, title: 'Video Courses', desc: 'Learn from curated YouTube courses by top instructors', color: 'indigo' },
    { icon: BookOpen, title: 'Interactive Notebooks', desc: 'Run Python code directly in your browser with Pyodide', color: 'emerald' },
    { icon: Zap, title: 'AI-Powered Content', desc: 'Courses on Agentic AI, LangChain, RAG, and more', color: 'amber' },
    { icon: Users, title: 'Team Learning', desc: 'Company packages with progress tracking for your team', color: 'violet' },
    { icon: Shield, title: 'Track Progress', desc: 'Monitor your learning journey with detailed analytics', color: 'sky' },
    { icon: Globe, title: 'Learn Anywhere', desc: 'Access courses on any device, anytime', color: 'rose' },
  ];

  const stats = [
    { value: '10+', label: 'Courses' },
    { value: '20+', label: 'Hours of Content' },
    { value: 'Free', label: 'To Get Started' },
    { value: '100%', label: 'Browser-Based' },
  ];

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              LMS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/browse')} className="text-sm text-slate-400 hover:text-white transition-colors">
              Browse Courses
            </button>
            <button onClick={() => navigate('/login')}
              className="text-sm bg-white/5 hover:bg-white/10 text-slate-200 px-4 py-2 rounded-xl border border-white/10 transition-all">
              Sign In
            </button>
            <button onClick={() => navigate('/register')}
              className="text-sm btn-primary">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-violet-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px]" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">Free courses available — no credit card needed</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Master{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              AI & Agentic
            </span>
            <br />
            Workflows
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Learn to build autonomous AI agents, RAG systems, and multi-agent workflows.
            Interactive notebooks, video courses, and hands-on projects — all in your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button onClick={() => navigate('/register')}
              className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 shadow-lg shadow-indigo-500/25">
              Start Learning Free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/browse')}
              className="text-base text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-3.5 rounded-xl transition-all flex items-center gap-2">
              Browse Courses <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-sm text-slate-500">Or sign in instantly with</span>
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setLoginError('Google login failed')}
              text="signin_with"
              shape="pill"
            />
          </div>
          {loginError && <p className="text-rose-400 text-sm mt-2">{loginError}</p>}
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to learn AI</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From beginner-friendly tutorials to advanced multi-agent systems — we've got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="glass-card p-6 group hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <div className={`bg-${feature.color}-500/10 rounded-xl p-3 w-fit mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Courses Preview */}
      {freeResources.length > 0 && (
        <section className="py-20 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-4">
                <Star className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300">Free — no sign up required to browse</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Courses you can start today</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Curated free courses from top instructors. Sign in with Google to track your progress.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {freeResources.slice(0, 6).map((r) => (
                <div key={r.id} onClick={() => navigate('/browse')}
                  className="glass-card-hover p-5 cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 text-xs text-violet-400">
                      <Play className="w-3 h-3" /> Free Course
                    </span>
                    {r.level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LEVEL_STYLES[r.level] || 'bg-slate-700 text-slate-300'}`}>
                        {r.level}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-100 group-hover:text-white mb-1.5 transition-colors">
                    {r.title}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    {r.instructor && <span>{r.instructor}</span>}
                    {r.duration && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.duration}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <button onClick={() => navigate('/browse')}
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 mx-auto transition-colors">
                View all courses <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Get started in 3 steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Sign in with Google', desc: 'One click — no passwords to remember' },
              { step: '2', title: 'Choose a course', desc: 'Browse free courses or access company training' },
              { step: '3', title: 'Start learning', desc: 'Watch videos, run notebooks, track your progress' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Teams */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Training for your team?</h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Create custom course packages, track team progress, and manage access with company invite codes.
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-slate-300">
                {['Custom course packages', 'Team progress analytics', 'Company invite codes', 'Admin dashboard'].map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> {f}
                  </span>
                ))}
              </div>
              <button onClick={() => navigate('/register')}
                className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 mx-auto">
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-semibold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              LMS
            </span>
            <span className="text-sm text-slate-600 ml-2">Learn. Build. Ship.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <button onClick={() => navigate('/browse')} className="hover:text-slate-300 transition-colors">Courses</button>
            <button onClick={() => navigate('/login')} className="hover:text-slate-300 transition-colors">Sign In</button>
            <button onClick={() => navigate('/register')} className="hover:text-slate-300 transition-colors">Register</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
