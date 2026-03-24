import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { publicAPI, authAPI } from '../utils/api';
import { setAuthData } from '../utils/auth';
import { FreeResource } from '../types';
import {
  ArrowRight, ChevronRight, ChevronLeft, BookOpen, Play, Zap, Users, Star,
  CheckCircle, Rocket, Award, Clock, Monitor, Code2, FileText, BarChart3,
  Shield, Layers, ArrowUpRight,
} from 'lucide-react';

const SPARK_BLUE = '#0077B5';

const LMSLanding: React.FC = () => {
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

  const LEVEL_STYLES: Record<string, string> = {
    beginner: 'bg-emerald-500/10 text-emerald-400',
    intermediate: 'bg-amber-500/10 text-amber-400',
    'no-code': 'bg-sky-500/10 text-sky-400',
  };

  const platformFeatures = [
    {
      icon: Code2,
      title: 'Interactive Notebooks',
      desc: 'Write and execute Python code directly in your browser. No local setup needed — powered by Pyodide.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Play,
      title: 'Video Courses',
      desc: 'Curated courses from top AI instructors and practitioners, organized in structured learning paths.',
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      icon: FileText,
      title: 'PDF Resources & Notes',
      desc: 'Reference materials, cheat sheets, and study guides — all accessible within the platform.',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      desc: 'Track your completion across days and courses. Pick up exactly where you left off.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      icon: Award,
      title: 'Verifiable Certificates',
      desc: 'Earn certificates upon completing courses — each with a unique verification link you can share.',
      gradient: 'from-rose-500 to-pink-500',
    },
    {
      icon: Layers,
      title: 'Day-by-Day Structure',
      desc: 'Content organized in sequential days — each building on the last for structured, cumulative learning.',
      gradient: 'from-sky-500 to-blue-500',
    },
  ];

  const steps = [
    { num: '01', title: 'Sign Up', desc: 'Create your account with Google or email — takes under 10 seconds.' },
    { num: '02', title: 'Start Learning', desc: 'Jump into day-by-day content with notebooks, videos, and PDFs.' },
    { num: '03', title: 'Track Progress', desc: 'Your dashboard shows completion, time spent, and what\'s next.' },
    { num: '04', title: 'Get Certified', desc: 'Complete courses and earn verifiable Spark10K certificates.' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-8" />
            <div className="h-5 w-px bg-white/10" />
            <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Learning Platform
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#courses" className="text-sm text-slate-400 hover:text-white transition-colors">Courses</a>
            <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">How It Works</a>
            <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Spark10K
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="text-sm bg-white/5 hover:bg-white/10 text-slate-200 px-4 py-2 rounded-xl border border-white/10 transition-all">
              Sign In
            </button>
            <button onClick={() => navigate('/register')}
              className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-all hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)` }}>
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-28 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: 'rgba(139,92,246,0.08)' }} />
        <div className="absolute top-40 right-1/3 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: `${SPARK_BLUE}08` }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8 bg-violet-500/10 border border-violet-500/20 backdrop-blur-sm">
            <Monitor className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">The Spark10K Learning Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
            Learn{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Gen AI
            </span>
            .
            <br />
            Code{' '}
            <span style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #00a5ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              In-Browser
            </span>
            .
            <br />
            <span className="text-slate-400 text-4xl md:text-5xl">Get Certified.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            An interactive learning platform with executable Python notebooks, structured courses,
            video content, and verifiable certificates — all free, powered by{' '}
            <button onClick={() => navigate('/')} className="font-medium transition-colors hover:text-white" style={{ color: SPARK_BLUE }}>
              Spark10K
            </button>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button onClick={() => navigate('/register')}
              className="text-base text-white font-semibold px-8 py-4 rounded-xl flex items-center gap-2 shadow-2xl transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)`, boxShadow: `0 8px 40px ${SPARK_BLUE}35` }}>
              Start Learning Free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/browse')}
              className="text-base text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl transition-all flex items-center gap-2">
              Browse Courses <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-slate-500">Quick start with</span>
          </div>
          <div className="flex justify-center mt-3">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setLoginError('Google login failed')} text="signin_with" shape="pill" />
          </div>
          {loginError && <p className="text-rose-400 text-sm mt-3">{loginError}</p>}
        </div>
      </section>

      {/* ── Platform Demo Preview ── */}
      <section className="py-16 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-1 rounded-2xl overflow-hidden">
            <div className="bg-slate-900/80 rounded-xl p-6 md:p-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                <span className="ml-3 text-xs text-slate-500 font-mono">spark10k-lms / dashboard</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mock day cards */}
                {[
                  { day: 1, title: 'Introduction to Gen AI', progress: 100, status: 'Completed' },
                  { day: 2, title: 'Prompt Engineering', progress: 60, status: 'In Progress' },
                  { day: 3, title: 'LangChain & RAG', progress: 0, status: 'Locked' },
                ].map((d) => (
                  <div key={d.day} className="bg-slate-800/60 rounded-xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 text-slate-400">Day {d.day}</span>
                      <span className={`text-xs ${d.progress === 100 ? 'text-emerald-400' : d.progress > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white mb-3">{d.title}</p>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${d.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${d.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-4">A preview of your learning dashboard</p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need to Learn AI</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              A purpose-built platform — not a generic LMS. Designed specifically for hands-on AI education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feature, i) => (
              <div key={i} className="glass-card p-7 group hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className={`bg-gradient-to-br ${feature.gradient} rounded-xl p-3 w-fit mb-5`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400">From sign-up to certificate in four steps.</p>
          </div>

          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-6 group">
                <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold transition-all group-hover:scale-110"
                  style={{ background: `${SPARK_BLUE}12`, color: SPARK_BLUE }}>
                  {step.num}
                </div>
                <div className="pt-1">
                  <h3 className="text-xl font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-slate-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free Courses ── */}
      {freeResources.length > 0 && (
        <section id="courses" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-4">
                <Star className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-violet-300">Start learning today</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Featured Free Courses</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Curated courses from top instructors. Sign in to track progress and earn certificates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {freeResources.slice(0, 6).map((r) => (
                <div key={r.id} onClick={() => navigate('/browse')} className="glass-card-hover p-6 cursor-pointer group">
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
                  <h4 className="font-semibold text-slate-100 group-hover:text-white mb-2 transition-colors">{r.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    {r.instructor && <span>{r.instructor}</span>}
                    {r.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.duration}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <button onClick={() => navigate('/browse')}
                className="text-sm font-medium flex items-center gap-1 mx-auto transition-colors hover:opacity-80" style={{ color: SPARK_BLUE }}>
                View all courses <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Spark10K Badge ── */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto text-center">
          <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-12 mx-auto mb-6 opacity-70" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Part of the Spark10K Initiative
          </h2>
          <p className="text-slate-400 leading-relaxed mb-8 max-w-xl mx-auto">
            This learning platform is the engine behind Spark10K — India's mission to train
            10,000 students with Gen AI skills for free. Every course, notebook, and certificate
            on this platform serves that mission.
          </p>
          <button onClick={() => navigate('/')}
            className="text-sm font-medium flex items-center gap-2 mx-auto text-slate-400 hover:text-white transition-colors">
            <ArrowUpRight className="w-4 h-4" /> Learn more about Spark10K
          </button>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 p-10 md:p-16 text-center"
            style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.05), transparent 60%, ${SPARK_BLUE}05)` }}>
            <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-[100px]" style={{ background: 'rgba(139,92,246,0.06)' }} />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-[100px]" style={{ background: `${SPARK_BLUE}06` }} />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start Your AI Learning Journey
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Interactive notebooks, structured courses, verifiable certificates — completely free.
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-slate-300">
                {['No cost ever', 'Code in-browser', 'Earn certificates', 'Track progress'].map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> {f}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => navigate('/register')}
                  className="text-base text-white font-semibold px-8 py-4 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)`, boxShadow: `0 8px 40px ${SPARK_BLUE}30` }}>
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => navigate('/login')}
                  className="text-base text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl transition-all">
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-7 opacity-70" />
              <div className="h-4 w-px bg-white/10" />
              <span className="text-sm text-slate-600">Learning Platform</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <button onClick={() => navigate('/')} className="hover:text-slate-300 transition-colors">Spark10K</button>
              <button onClick={() => navigate('/browse')} className="hover:text-slate-300 transition-colors">Courses</button>
              <button onClick={() => navigate('/login')} className="hover:text-slate-300 transition-colors">Sign In</button>
              <a href="https://linkedin.com/company/spark10k" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">LinkedIn</a>
              <a href="mailto:contact@spark10k.com" className="hover:text-slate-300 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LMSLanding;
