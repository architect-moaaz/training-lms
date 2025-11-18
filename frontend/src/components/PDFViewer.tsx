import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { daysAPI } from '../utils/api';
import '../styles/PDFViewer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
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

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [dayNumber, filename]);

  const fetchPDF = async () => {
    setLoading(true);
    try {
      const url = await daysAPI.getPDF(dayNumber, filename);
      setPdfUrl(url);
    } catch (err: any) {
      setError('Failed to load PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber < 1) return 1;
      if (numPages && newPageNumber > numPages) return numPages;
      return newPageNumber;
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale((prevScale) => Math.min(prevScale + 0.2, 3.0));
  const zoomOut = () => setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);

  if (loading) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-header">
          <button onClick={onClose} className="close-button">
            ✕ Close
          </button>
        </div>
        <div className="loading">Loading PDF...</div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-header">
          <button onClick={onClose} className="close-button">
            ✕ Close
          </button>
        </div>
        <div className="error-message">{error || 'PDF not found'}</div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-header">
        <div className="pdf-title">
          <h2>{filename.replace('.pdf', '')}</h2>
        </div>
        <div className="pdf-controls">
          <div className="zoom-controls">
            <button onClick={zoomOut} disabled={scale <= 0.5} title="Zoom Out">
              −
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} disabled={scale >= 3.0} title="Zoom In">
              +
            </button>
            <button onClick={resetZoom} title="Reset Zoom">
              Reset
            </button>
          </div>

          <div className="page-controls">
            <button onClick={previousPage} disabled={pageNumber <= 1}>
              ← Prev
            </button>
            <span className="page-info">
              Page {pageNumber} of {numPages || '?'}
            </span>
            <button onClick={nextPage} disabled={!numPages || pageNumber >= numPages}>
              Next →
            </button>
          </div>

          <button onClick={onClose} className="close-button">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="pdf-content">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => {
            console.error('Error loading PDF:', error);
            setError('Failed to load PDF document');
          }}
          loading={<div className="loading">Loading PDF document...</div>}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            loading={<div className="loading">Loading page...</div>}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;
