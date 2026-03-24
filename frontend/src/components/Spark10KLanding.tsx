import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { publicAPI, authAPI } from '../utils/api';
import { setAuthData } from '../utils/auth';
import { EventData } from '../types';
import {
  ArrowRight, ChevronRight, Users, Zap, Star, Globe, Sparkles,
  CheckCircle, Rocket, Target, Award, Lightbulb, GraduationCap,
  Calendar, MapPin, ExternalLink, BookOpen, Play, Monitor,
} from 'lucide-react';

const SPARK_BLUE = '#0077B5';

const Spark10KLanding: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loginError, setLoginError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    publicAPI.getEvents().then(setEvents).catch(() => {});
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

  const stats = [
    { value: '10,000', label: 'Students to Train', icon: Users },
    { value: '100%', label: 'Completely Free', icon: Star },
    { value: '50+', label: 'Workshops Planned', icon: Calendar },
    { value: 'Pan-India', label: 'Nationwide Reach', icon: Globe },
  ];

  const pillars = [
    {
      icon: Zap,
      title: 'Gen AI & LLM Training',
      desc: 'Hands-on workshops covering ChatGPT, LangChain, RAG pipelines, and autonomous agents.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Target,
      title: 'Project-Based Learning',
      desc: 'Build real AI applications — from ideation to deployment — solving genuine problems.',
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      icon: Users,
      title: 'Industry Mentorship',
      desc: 'Learn directly from AI professionals, researchers, and startup founders.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      icon: Lightbulb,
      title: 'Startup Incubation',
      desc: 'Transform your best AI projects into funded startups with our incubation support.',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  const audience = [
    { icon: GraduationCap, title: 'College Students', desc: 'UG & PG students eager to break into the world of AI and build real skills.' },
    { icon: Rocket, title: 'Recent Graduates', desc: 'Job-seekers who want a competitive edge with practical Gen AI experience.' },
    { icon: Lightbulb, title: 'Tech Enthusiasts', desc: 'Anyone curious about AI — no prior ML background required.' },
  ];

  const pastEvents = events.filter(e => !e.is_upcoming);
  const upcomingEvents = events.filter(e => e.is_upcoming);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-9" />
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#mission" className="text-sm text-slate-400 hover:text-white transition-colors">Mission</a>
            <a href="#pillars" className="text-sm text-slate-400 hover:text-white transition-colors">What We Do</a>
            <a href="#events" className="text-sm text-slate-400 hover:text-white transition-colors">Events</a>
            <a href="https://www.spark10k.com" target="_blank" rel="noopener noreferrer"
              className="text-sm text-slate-400 hover:text-white transition-colors">
              spark10k.com
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/lms')}
              className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-all hover:shadow-lg flex items-center gap-2"
              style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)` }}>
              <Monitor className="w-4 h-4" /> Open LMS
            </button>
            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-400 hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-slate-950/95 backdrop-blur-xl px-6 py-4 space-y-3">
            <a href="#mission" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-400 hover:text-white">Mission</a>
            <a href="#pillars" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-400 hover:text-white">What We Do</a>
            <a href="#events" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-400 hover:text-white">Events</a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-28 px-6 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] animate-pulse" style={{ background: `${SPARK_BLUE}12` }} />
        <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px]" style={{ background: `${SPARK_BLUE}08` }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8 border backdrop-blur-sm"
            style={{ background: `${SPARK_BLUE}12`, borderColor: `${SPARK_BLUE}25` }}>
            <Sparkles className="w-4 h-4" style={{ color: SPARK_BLUE }} />
            <span className="text-sm font-medium" style={{ color: SPARK_BLUE }}>India's Largest Free AI Training Initiative</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight">
            Empowering{' '}
            <span className="relative inline-block">
              <span style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #00a5ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                10,000
              </span>
            </span>
            <br />
            Students with{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Gen AI Skills
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Spark10K is a nationwide movement to bridge the gap between education and the AI future —
            through free workshops, mentorship, and hands-on training.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button onClick={() => navigate('/register')}
              className="text-base text-white font-semibold px-8 py-4 rounded-xl flex items-center gap-2 shadow-2xl transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)`, boxShadow: `0 8px 40px ${SPARK_BLUE}35` }}>
              Join Spark10K — It's Free <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/lms')}
              className="text-base text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl transition-all flex items-center gap-2">
              <Monitor className="w-5 h-5" /> Explore the LMS
            </button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-slate-500">Quick join with</span>
          </div>
          <div className="flex justify-center mt-3">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setLoginError('Google login failed')} text="signup_with" shape="pill" />
          </div>
          {loginError && <p className="text-rose-400 text-sm mt-3">{loginError}</p>}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center group">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-all group-hover:scale-110"
                style={{ background: `${SPARK_BLUE}12` }}>
                <stat.icon className="w-5 h-5" style={{ color: SPARK_BLUE }} />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission ── */}
      <section id="mission" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-10 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px]" style={{ background: `${SPARK_BLUE}08` }} />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px]" />

            <div className="relative z-10 md:flex md:items-center md:gap-14">
              <div className="md:flex-1">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
                  style={{ background: `${SPARK_BLUE}10`, borderColor: `${SPARK_BLUE}20` }}>
                  <Target className="w-4 h-4" style={{ color: SPARK_BLUE }} />
                  <span className="text-sm" style={{ color: SPARK_BLUE }}>Our Mission</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                  Bridging the Gap Between Education & the AI Future
                </h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  AI is reshaping every industry, yet most students don't know where to begin.
                  Traditional curricula lag years behind — they don't cover modern frameworks,
                  LLMs, or real-world AI workflows.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Spark10K exists to change that. We deliver <strong className="text-slate-200">free, hands-on training</strong> so
                  students from every background gain real experience with AI models, automation, and problem-solving —
                  and turn those skills into careers and startups.
                </p>
              </div>
              <div className="mt-10 md:mt-0 md:w-56 shrink-0 flex flex-col items-center">
                <img src="https://spark10k.com/logo.png" alt="Spark10K" className="w-36 mb-5 opacity-80" />
                <a href="https://www.spark10k.com" target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: SPARK_BLUE }}>
                  spark10k.com <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Four Pillars ── */}
      <section id="pillars" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Four Pillars of Spark10K</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              A comprehensive ecosystem — from learning to launching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((pillar, i) => (
              <div key={i} className="glass-card p-8 group hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${pillar.gradient}`}
                  style={{ opacity: 0.08 }} />
                <div className={`bg-gradient-to-br ${pillar.gradient} rounded-xl p-3 w-fit mb-5`}>
                  <pillar.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{pillar.title}</h3>
                <p className="text-slate-400 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LMS Spotlight ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-white/10"
            style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}08, transparent 60%, rgba(139,92,246,0.05))` }}>
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px]" style={{ background: `${SPARK_BLUE}10` }} />

            <div className="relative z-10 p-10 md:p-16 md:flex md:items-center md:gap-12">
              <div className="md:flex-1">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 bg-white/5 border border-white/10">
                  <Monitor className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-violet-300">Powered by Technology</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                  The Spark10K Learning Platform
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Our custom-built LMS accelerates the Spark10K mission — delivering interactive notebooks,
                  video courses, progress tracking, and certificates all in one place. It's the engine
                  that powers every student's learning journey.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Interactive Python notebooks — run code in your browser',
                    'Structured day-by-day learning paths',
                    'Progress tracking & completion certificates',
                    'Free curated courses from top instructors',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/lms')}
                  className="text-base text-white font-semibold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)`, boxShadow: `0 8px 32px ${SPARK_BLUE}30` }}>
                  Explore the LMS <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-10 md:mt-0 md:w-72 shrink-0">
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Interactive Notebooks</p>
                      <p className="text-xs text-slate-500">Run Python in-browser</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Play className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Video Courses</p>
                      <p className="text-xs text-slate-500">Curated AI content</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Certificates</p>
                      <p className="text-xs text-slate-500">Verifiable credentials</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Events ── */}
      {events.length > 0 && (
        <section id="events" className="py-24 px-6 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 border"
                style={{ background: `${SPARK_BLUE}10`, borderColor: `${SPARK_BLUE}20` }}>
                <Calendar className="w-4 h-4" style={{ color: SPARK_BLUE }} />
                <span className="text-sm" style={{ color: SPARK_BLUE }}>Workshops & Events</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Events We've Conducted</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Spark10K brings hands-on AI training directly to colleges and communities across India.
              </p>
            </div>

            {pastEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastEvents.map((event) => (
                  <div key={event.id} className="glass-card overflow-hidden group">
                    {event.image_url && (
                      <div className="h-52 overflow-hidden">
                        <img src={event.image_url} alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full capitalize"
                          style={{ background: `${SPARK_BLUE}15`, color: SPARK_BLUE }}>
                          {event.event_type}
                        </span>
                        {event.attendees && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="w-3 h-3" /> {event.attendees} attendees
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(event.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        {(event.city || event.location) && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.city}{event.location && event.city ? ', ' : ''}{event.location}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-400 leading-relaxed mb-3">{event.description}</p>
                      )}
                      {event.highlights && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {event.highlights.split(',').map((h, i) => (
                            <span key={i} className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded-lg">
                              {h.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {event.linkedin_url && (
                        <a href={event.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80" style={{ color: SPARK_BLUE }}>
                          <ExternalLink className="w-3.5 h-3.5" /> View on LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {upcomingEvents.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Upcoming Events
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="glass-card p-6 border-amber-500/20 hover:border-amber-500/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 capitalize">
                          {event.event_type} — Upcoming
                        </span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">{event.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(event.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        {event.city && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /> {event.city}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Who Should Join ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">Who Should Join?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audience.map((item, i) => (
              <div key={i} className="glass-card p-7 hover:bg-white/[0.06] transition-all">
                <div className="rounded-xl p-3 w-fit mx-auto mb-5" style={{ background: `${SPARK_BLUE}12` }}>
                  <item.icon className="w-6 h-6" style={{ color: SPARK_BLUE }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 p-10 md:p-16 text-center"
            style={{ background: `linear-gradient(180deg, ${SPARK_BLUE}06, transparent)` }}>
            <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-[100px]" style={{ background: `${SPARK_BLUE}08` }} />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Join the AI Revolution?
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Be part of India's largest free AI training initiative.
                Learn Gen AI, earn certificates, build projects, and launch your career.
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-slate-300">
                {['Free forever', 'Hands-on training', 'Industry mentorship', 'Certificates'].map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> {f}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => navigate('/register')}
                  className="text-base text-white font-semibold px-8 py-4 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)`, boxShadow: `0 8px 40px ${SPARK_BLUE}30` }}>
                  Join Spark10K Free <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => navigate('/lms')}
                  className="text-base text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl transition-all flex items-center gap-2">
                  <Monitor className="w-5 h-5" /> Open Learning Platform
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
            <div className="flex items-center gap-3">
              <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-7 opacity-70" />
              <span className="text-sm text-slate-600">Empowering 10,000 students with Gen AI skills</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <button onClick={() => navigate('/lms')} className="hover:text-slate-300 transition-colors">LMS Platform</button>
              <button onClick={() => navigate('/browse')} className="hover:text-slate-300 transition-colors">Courses</button>
              <a href="https://www.spark10k.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">spark10k.com</a>
              <a href="https://linkedin.com/company/spark10k" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">LinkedIn</a>
              <a href="mailto:contact@spark10k.com" className="hover:text-slate-300 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Spark10KLanding;
