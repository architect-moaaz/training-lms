import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentAPI } from '../utils/api';
import { FreeResource } from '../types';
import { ArrowLeft, Check, Clock, User, ExternalLink } from 'lucide-react';

const getYouTubeEmbedUrl = (url: string): string | null => {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
  return null;
};

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  'no-code': 'bg-sky-500/10 text-sky-400',
};

const FreeResourceViewer: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<FreeResource | null>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resourceId) fetchResource();
  }, [resourceId]);

  const fetchResource = async () => {
    setLoading(true);
    try {
      const data = await enrollmentAPI.getResource(Number(resourceId));
      setResource(data.resource);
      setEnrollment(data.enrollment);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load resource.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!resource) return;
    try {
      const updated = await enrollmentAPI.markComplete(resource.id);
      setEnrollment(updated);
    } catch {}
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading course...</div>;

  if (error || !resource) {
    return (
      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="error-banner">{error || 'Resource not found'}</div>
        <button onClick={() => navigate('/dashboard')} className="btn-ghost mt-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(resource.url);

  return (
    <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
      <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-4 flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{resource.title}</h1>
            {resource.level && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEVEL_STYLES[resource.level] || ''}`}>
                {resource.level}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            {resource.instructor && (
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {resource.instructor}</span>
            )}
            {resource.duration && (
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {resource.duration}</span>
            )}
            {resource.category && (
              <span className="bg-indigo-500/10 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full">{resource.category}</span>
            )}
          </div>
        </div>
        <button onClick={handleMarkComplete}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 shrink-0
            ${enrollment?.completed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
          {enrollment?.completed && <Check className="w-4 h-4" />}
          {enrollment?.completed ? 'Completed' : 'Mark as Complete'}
        </button>
      </div>

      {resource.description && (
        <p className="text-slate-400 mb-6">{resource.description}</p>
      )}

      {embedUrl ? (
        <div className="relative w-full pb-[56.25%] bg-black rounded-2xl overflow-hidden">
          <iframe
            src={embedUrl}
            title={resource.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-300 mb-4">This course opens in a new tab.</p>
          <a href={resource.url} target="_blank" rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Open Course
          </a>
        </div>
      )}

      {enrollment && (
        <div className="mt-4 text-xs text-slate-500">
          Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
          {enrollment.last_accessed && ` · Last accessed: ${new Date(enrollment.last_accessed).toLocaleDateString()}`}
        </div>
      )}
    </div>
  );
};

export default FreeResourceViewer;
