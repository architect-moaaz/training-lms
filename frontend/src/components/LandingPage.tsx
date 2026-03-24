import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { publicAPI, authAPI } from '../utils/api';
import { setAuthData } from '../utils/auth';
import { FreeResource } from '../types';
import {
  Play, BookOpen, Users, Zap, ChevronRight, ArrowRight, Star, Clock,
  Globe, Sparkles, CheckCircle, Rocket, Target, Award, Lightbulb, GraduationCap,
} from 'lucide-react';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  'no-code': 'bg-sky-500/10 text-sky-400',
};

const SPARK_BLUE = '#0077B5';

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

  const journeySteps = [
    { step: '1', title: 'Register & Sign In', desc: 'One-click Google sign in — completely free', icon: Users },
    { step: '2', title: 'Learn & Build', desc: 'Hands-on workshops, video courses, and interactive notebooks', icon: BookOpen },
    { step: '3', title: 'Get Certified', desc: 'Earn Spark10K certificates upon completing courses', icon: Award },
    { step: '4', title: 'Launch & Grow', desc: 'Startup incubation support for promising AI solutions', icon: Rocket },
  ];

  const features = [
    { icon: Zap, title: 'Gen AI & LLM Training', desc: 'Master cutting-edge AI frameworks, LangChain, RAG, and autonomous agents', color: 'blue' },
    { icon: BookOpen, title: 'Interactive Notebooks', desc: 'Run Python code directly in your browser — no setup required', color: 'emerald' },
    { icon: Play, title: 'Video Courses', desc: 'Curated courses from top AI instructors and practitioners', color: 'violet' },
    { icon: Target, title: 'Project-Based Learning', desc: 'Build real AI applications and solve real-world problems', color: 'amber' },
    { icon: Users, title: 'Industry Mentorship', desc: 'Get guidance from AI professionals and researchers', color: 'sky' },
    { icon: Lightbulb, title: 'Startup Incubation', desc: 'Transform your AI solution into a funded business', color: 'rose' },
  ];

  const stats = [
    { value: '10,000', label: 'Students to Train' },
    { value: '100%', label: 'Free Forever' },
    { value: '₹0', label: 'Cost to You' },
    { value: 'India', label: 'Nationwide' },
  ];

  const testimonials = [
    { name: 'Rahul Patel', role: 'AI Research Assistant at Microsoft', quote: 'Spark10K gave me hands-on experience with LLMs that my college courses never covered. I built my first AI application and landed a research position!' },
    { name: 'Ananya Gupta', role: 'AI Engineer at Infosys', quote: 'The practical Gen AI skills I gained through Spark10K were exactly what employers were looking for. I received three job offers within a month!' },
    { name: 'Priya Sharma', role: 'Founder, MedAI Solutions', quote: 'My healthcare AI startup wouldn\'t exist without Spark10K. The mentorship and incubation support helped me transform my idea into a funded business.' },
  ];

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-9" />
            <div className="h-6 w-px bg-white/10" />
            <span className="text-sm font-semibold text-slate-400">Learning Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://www.spark10k.com" target="_blank" rel="noopener noreferrer"
              className="text-sm text-slate-400 hover:text-white transition-colors hidden md:block">
              About Spark10K
            </a>
            <button onClick={() => navigate('/browse')} className="text-sm text-slate-400 hover:text-white transition-colors">
              Browse Courses
            </button>
            <button onClick={() => navigate('/login')}
              className="text-sm bg-white/5 hover:bg-white/10 text-slate-200 px-4 py-2 rounded-xl border border-white/10 transition-all">
              Sign In
            </button>
            <button onClick={() => navigate('/register')}
              className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all"
              style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)` }}>
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: `${SPARK_BLUE}15` }} />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px]" style={{ background: `${SPARK_BLUE}10` }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border" style={{ background: `${SPARK_BLUE}15`, borderColor: `${SPARK_BLUE}30` }}>
            <Sparkles className="w-4 h-4" style={{ color: SPARK_BLUE }} />
            <span className="text-sm" style={{ color: SPARK_BLUE }}>100% Free — Empowering 10,000 Students Across India</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Master{' '}
            <span style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #00a5ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Gen AI
            </span>
            {' '}Skills.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Build Your Future.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Spark10K is on a mission to train 10,000 students with cutting-edge Gen AI skills —
            helping them build careers, create innovations, and launch AI-driven startups.
            All completely free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button onClick={() => navigate('/register')}
              className="text-base text-white font-semibold px-8 py-3.5 rounded-xl flex items-center gap-2 shadow-lg transition-all hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)`, boxShadow: `0 8px 32px ${SPARK_BLUE}40` }}>
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
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setLoginError('Google login failed')} text="signin_with" shape="pill" />
          </div>
          {loginError && <p className="text-rose-400 text-sm mt-2">{loginError}</p>}
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-10 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px]" style={{ background: `${SPARK_BLUE}10` }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px]" />

            <div className="relative z-10 md:flex md:items-center md:gap-12">
              <div className="md:flex-1">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Bridging the Gap Between Education & the AI Future
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  AI is reshaping industries, but students often don't know where to start.
                  Traditional education doesn't cover modern AI frameworks or LLMs.
                  Spark10K provides free, hands-on training so students from all backgrounds
                  gain real experience with AI models, automation, and problem-solving.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Our vision is to democratize access to AI education — ensuring that
                  financial constraints never prevent talented students from acquiring
                  cutting-edge AI skills. This isn't just a training program —
                  it's a career and AI startup accelerator.
                </p>
              </div>
              <div className="mt-8 md:mt-0 md:w-64 shrink-0 flex flex-col items-center">
                <img src="https://spark10k.com/logo.png" alt="Spark10K" className="w-32 mb-4 opacity-80" />
                <a href="https://www.spark10k.com" target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: SPARK_BLUE }}>
                  Learn more about Spark10K <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What You'll Get</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From beginner-friendly Gen AI workshops to advanced multi-agent systems and startup incubation.
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

      {/* Journey */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Learning Journey</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {journeySteps.map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white"
                  style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)` }}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
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
                <span className="text-sm text-violet-300">Free courses — start learning today</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Featured Courses</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Curated free courses from top instructors. Sign in with Google to track your progress and earn certificates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {freeResources.slice(0, 6).map((r) => (
                <div key={r.id} onClick={() => navigate('/browse')} className="glass-card-hover p-5 cursor-pointer group">
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
                  <h4 className="font-semibold text-slate-100 group-hover:text-white mb-1.5 transition-colors">{r.title}</h4>
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

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Success Stories</h2>
            <p className="text-slate-400">From students to AI professionals and startup founders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="glass-card p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <p className="text-white font-medium text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Should Join */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">Who Should Join?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, title: 'College Students', desc: 'Undergraduate and postgraduate students eager to enter the world of AI' },
              { icon: Rocket, title: 'Recent Graduates', desc: 'Looking to gain a competitive edge in the job market with practical AI skills' },
              { icon: Lightbulb, title: 'Tech Enthusiasts', desc: 'Anyone curious about AI and its applications across industries' },
            ].map((item, i) => (
              <div key={i} className="glass-card p-6">
                <div className="rounded-xl p-3 w-fit mx-auto mb-4" style={{ background: `${SPARK_BLUE}15` }}>
                  <item.icon className="w-6 h-6" style={{ color: SPARK_BLUE }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full blur-[80px]" style={{ background: `${SPARK_BLUE}10` }} />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Join the AI Movement
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Be part of India's largest free AI training initiative.
                Learn Gen AI, earn certificates, build projects, and launch your career.
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-slate-300">
                {['Hands-on AI training', 'Industry mentorship', 'Project-based certification', 'Startup incubation'].map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> {f}
                  </span>
                ))}
              </div>
              <button onClick={() => navigate('/register')}
                className="text-base text-white font-semibold px-8 py-3.5 rounded-xl flex items-center gap-2 mx-auto transition-all hover:shadow-xl"
                style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)`, boxShadow: `0 8px 32px ${SPARK_BLUE}40` }}>
                Start Learning Free <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-7 opacity-70" />
            <span className="text-sm text-slate-600">Empowering 10,000 students with Gen AI skills</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <button onClick={() => navigate('/browse')} className="hover:text-slate-300 transition-colors">Courses</button>
            <button onClick={() => navigate('/login')} className="hover:text-slate-300 transition-colors">Sign In</button>
            <a href="https://www.spark10k.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">Spark10K.com</a>
            <a href="https://linkedin.com/company/spark10k" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">LinkedIn</a>
            <a href="mailto:contact@spark10k.com" className="hover:text-slate-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
