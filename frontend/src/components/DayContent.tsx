import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { daysAPI, progressAPI } from '../utils/api';
import { DayContent as DayContentType, VideoContent } from '../types';
import NotebookViewer from './NotebookViewer';
import PDFViewer from './PDFViewer';
import { ArrowLeft, Play, BookOpen, FileText, ChevronRight, Check } from 'lucide-react';

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

const DayContent: React.FC = () => {
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<DayContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => { if (dayNumber) { fetchContent(); checkProgress(); } }, [dayNumber]);

  const fetchContent = async () => {
    setLoading(true);
    try { setContent(await daysAPI.getDayContent(Number(dayNumber))); }
    catch (err: any) { setError(err.response?.status === 403 ? 'Access denied.' : 'Failed to load content.'); }
    finally { setLoading(false); }
  };

  const checkProgress = async () => {
    try {
      const progressData = await progressAPI.getProgress();
      setIsCompleted(progressData.find((p) => p.day_number === Number(dayNumber))?.completed || false);
    } catch {}
  };

  const handleMarkComplete = async () => {
    try {
      await progressAPI.updateProgress(Number(dayNumber), { completed: !isCompleted });
      setIsCompleted(!isCompleted);
    } catch {}
  };

  const handleVideoClick = (video: VideoContent) => {
    if (getYouTubeEmbedUrl(video.url)) {
      setSelectedVideo(video); setSelectedNotebook(null); setSelectedPDF(null);
    } else {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = () => { setSelectedNotebook(null); setSelectedPDF(null); setSelectedVideo(null); };

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading content...</div>;

  if (error || !content) {
    return (
      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="error-banner">{error || 'Content not found'}</div>
        <button onClick={() => navigate('/dashboard')} className="btn-ghost mt-4 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</button>
      </div>
    );
  }

  if (selectedNotebook) return <NotebookViewer dayNumber={Number(dayNumber)} filename={selectedNotebook} onClose={handleClose} />;
  if (selectedPDF) return <PDFViewer dayNumber={Number(dayNumber)} filename={selectedPDF} onClose={handleClose} />;

  if (selectedVideo) {
    const embedUrl = getYouTubeEmbedUrl(selectedVideo.url);
    return (
      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <button onClick={handleClose} className="btn-ghost mb-4 flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Content
        </button>
        <h1 className="text-2xl font-bold text-white mb-2">{selectedVideo.title}</h1>
        {selectedVideo.instructor && (
          <p className="text-slate-400 text-sm mb-4">{selectedVideo.instructor} &middot; {selectedVideo.duration}</p>
        )}
        <div className="relative w-full pb-[56.25%] bg-black rounded-2xl overflow-hidden">
          <iframe src={embedUrl || ''} title={selectedVideo.title} frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
            className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
      <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-4 flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">Day {content.day_number}: {content.title}</h1>
            {content.level && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEVEL_STYLES[content.level] || ''}`}>
                {content.level}
              </span>
            )}
          </div>
          {content.description && <p className="text-slate-400">{content.description}</p>}
        </div>
        <button onClick={handleMarkComplete}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 shrink-0
            ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          {isCompleted && <Check className="w-4 h-4" />}
          {isCompleted ? 'Completed' : 'Mark as Complete'}
        </button>
      </div>

      <div className="space-y-8">
        {content.videos && content.videos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-400" /> Video Courses
            </h2>
            <div className="space-y-3">
              {content.videos.map((video, i) => (
                <div key={i} onClick={() => handleVideoClick(video)}
                  className="glass-card-hover p-4 flex items-center gap-4 cursor-pointer group">
                  <div className="bg-indigo-500/10 rounded-xl p-3">
                    <Play className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 group-hover:text-white transition-colors">{video.title}</p>
                    <p className="text-sm text-slate-500">{video.instructor && `${video.instructor} · `}{video.duration}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
              ))}
            </div>
          </section>
        )}

        {content.notebooks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" /> Notebooks
            </h2>
            <div className="space-y-3">
              {content.notebooks.map((nb) => (
                <div key={nb.filename} onClick={() => { setSelectedNotebook(nb.filename); setSelectedPDF(null); setSelectedVideo(null); }}
                  className="glass-card-hover p-4 flex items-center gap-4 cursor-pointer group">
                  <div className="bg-emerald-500/10 rounded-xl p-3">
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="flex-1 font-medium text-slate-100 group-hover:text-white transition-colors">{nb.name}</p>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
              ))}
            </div>
          </section>
        )}

        {content.pdfs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> PDFs
            </h2>
            <div className="space-y-3">
              {content.pdfs.map((pdf) => (
                <div key={pdf.filename} onClick={() => { setSelectedPDF(pdf.filename); setSelectedNotebook(null); setSelectedVideo(null); }}
                  className="glass-card-hover p-4 flex items-center gap-4 cursor-pointer group">
                  <div className="bg-amber-500/10 rounded-xl p-3">
                    <FileText className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="flex-1 font-medium text-slate-100 group-hover:text-white transition-colors">{pdf.name}</p>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
              ))}
            </div>
          </section>
        )}

        {content.notebooks.length === 0 && content.pdfs.length === 0 && (!content.videos || content.videos.length === 0) && (
          <div className="text-center py-12 text-slate-400">No content available for this day yet.</div>
        )}
      </div>
    </div>
  );
};

export default DayContent;
