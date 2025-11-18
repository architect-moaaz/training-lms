import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { daysAPI, progressAPI } from '../utils/api';
import { DayContent as DayContentType } from '../types';
import NotebookViewer from './NotebookViewer';
import PDFViewer from './PDFViewer';
import '../styles/DayContent.css';

const DayContent: React.FC = () => {
  const { dayNumber } = useParams<{ dayNumber: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<DayContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (dayNumber) {
      fetchContent();
      checkProgress();
    }
  }, [dayNumber]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const data = await daysAPI.getDayContent(Number(dayNumber));
      setContent(data);
    } catch (err: any) {
      setError('Failed to load content. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkProgress = async () => {
    try {
      const progressData = await progressAPI.getProgress();
      const dayProgress = progressData.find((p) => p.day_number === Number(dayNumber));
      setIsCompleted(dayProgress?.completed || false);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await progressAPI.updateProgress(Number(dayNumber), { completed: !isCompleted });
      setIsCompleted(!isCompleted);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleNotebookClick = (filename: string) => {
    setSelectedNotebook(filename);
    setSelectedPDF(null);
  };

  const handlePDFClick = (filename: string) => {
    setSelectedPDF(filename);
    setSelectedNotebook(null);
  };

  const handleClose = () => {
    setSelectedNotebook(null);
    setSelectedPDF(null);
  };

  if (loading) {
    return (
      <div className="day-content-container">
        <div className="loading">Loading content...</div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="day-content-container">
        <div className="error-message">{error || 'Content not found'}</div>
        <button onClick={() => navigate('/dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (selectedNotebook) {
    return (
      <NotebookViewer
        dayNumber={Number(dayNumber)}
        filename={selectedNotebook}
        onClose={handleClose}
      />
    );
  }

  if (selectedPDF) {
    return (
      <PDFViewer
        dayNumber={Number(dayNumber)}
        filename={selectedPDF}
        onClose={handleClose}
      />
    );
  }

  return (
    <div className="day-content-container">
      <div className="day-content-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back to Dashboard
        </button>
        <div className="day-content-title">
          <h1>Day {content.day_number}: {content.title}</h1>
          <button
            onClick={handleMarkComplete}
            className={`complete-button ${isCompleted ? 'completed' : ''}`}
          >
            {isCompleted ? '✓ Completed' : 'Mark as Complete'}
          </button>
        </div>
        {content.description && (
          <p className="day-content-description">{content.description}</p>
        )}
      </div>

      <div className="content-sections">
        {content.notebooks.length > 0 && (
          <div className="content-section">
            <h2>📓 Notebooks</h2>
            <div className="content-list">
              {content.notebooks.map((notebook) => (
                <div
                  key={notebook.filename}
                  className="content-item"
                  onClick={() => handleNotebookClick(notebook.filename)}
                >
                  <span className="content-icon">📓</span>
                  <span className="content-name">{notebook.name}</span>
                  <span className="content-arrow">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.pdfs.length > 0 && (
          <div className="content-section">
            <h2>📄 PDFs</h2>
            <div className="content-list">
              {content.pdfs.map((pdf) => (
                <div
                  key={pdf.filename}
                  className="content-item"
                  onClick={() => handlePDFClick(pdf.filename)}
                >
                  <span className="content-icon">📄</span>
                  <span className="content-name">{pdf.name}</span>
                  <span className="content-arrow">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.notebooks.length === 0 && content.pdfs.length === 0 && (
          <div className="no-content">
            <p>No content available for this day yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayContent;
