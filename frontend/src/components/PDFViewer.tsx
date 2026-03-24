import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { daysAPI } from '../utils/api';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  dayNumber: number;
  filename: string;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ dayNumber, filename, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPDF();
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [dayNumber, filename]);

  const fetchPDF = async () => {
    setLoading(true);
    try { setPdfUrl(await daysAPI.getPDF(dayNumber, filename)); }
    catch { setError('Failed to load PDF.'); }
    finally { setLoading(false); }
  };

  const ToolbarButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; title?: string }> =
    ({ onClick, disabled, children, title }) => (
      <button onClick={onClick} disabled={disabled} title={title}
        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-1.5">
        {children}
      </button>
    );

  if (loading) return (
    <div className="flex-1 flex flex-col bg-slate-950 h-screen">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-end">
        <button onClick={onClose} className="btn-ghost text-sm flex items-center gap-1.5"><X className="w-4 h-4" /> Close</button>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400">Loading PDF...</div>
    </div>
  );

  if (error || !pdfUrl) return (
    <div className="flex-1 flex flex-col bg-slate-950 h-screen">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-end">
        <button onClick={onClose} className="btn-ghost text-sm flex items-center gap-1.5"><X className="w-4 h-4" /> Close</button>
      </div>
      <div className="p-6"><div className="error-banner">{error || 'PDF not found'}</div></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-screen">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-white truncate max-w-xs">{filename.replace('.pdf', '')}</h2>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <ToolbarButton onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))} disabled={scale <= 0.5} title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </ToolbarButton>
            <span className="text-sm text-slate-400 px-2 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <ToolbarButton onClick={() => setScale((s) => Math.min(s + 0.2, 3.0))} disabled={scale >= 3.0} title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => setScale(1.0)} title="Reset">
              <RotateCcw className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <ToolbarButton onClick={() => setPageNumber((p) => Math.max(p - 1, 1))} disabled={pageNumber <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </ToolbarButton>
            <span className="text-sm text-slate-400 px-2 min-w-[5rem] text-center">
              {pageNumber} / {numPages || '?'}
            </span>
            <ToolbarButton onClick={() => setPageNumber((p) => numPages ? Math.min(p + 1, numPages) : p)} disabled={!numPages || pageNumber >= numPages}>
              <ChevronRight className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <button onClick={onClose} className="btn-ghost text-sm flex items-center gap-1.5 ml-2">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-900/50 flex justify-center py-6">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
          onLoadError={() => setError('Failed to load PDF document')}
          loading={<div className="text-slate-400 py-12">Loading PDF document...</div>}
        >
          <Page pageNumber={pageNumber} scale={scale}
            loading={<div className="text-slate-400 py-12">Loading page...</div>}
            renderTextLayer={true} renderAnnotationLayer={true} />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;
