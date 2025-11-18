import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daysAPI, progressAPI } from '../utils/api';
import { Day, UserProgress } from '../types';
import { getAuthData } from '../utils/auth';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<Day[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = getAuthData();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [daysData, progressData] = await Promise.all([
        daysAPI.getDays(),
        progressAPI.getProgress(),
      ]);

      setDays(daysData);
      setProgress(progressData);
    } catch (err: any) {
      setError('Failed to load content. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDayProgress = (dayNumber: number) => {
    return progress.find((p) => p.day_number === dayNumber);
  };

  const getCompletionPercentage = () => {
    if (days.length === 0) return 0;
    const completedDays = progress.filter((p) => p.completed).length;
    return Math.round((completedDays / days.length) * 100);
  };

  const handleDayClick = (dayNumber: number) => {
    navigate(`/day/${dayNumber}`);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
        <button onClick={fetchData} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {user?.username}!</h1>
        <div className="progress-summary">
          <div className="progress-stat">
            <span className="stat-label">Overall Progress</span>
            <span className="stat-value">{getCompletionPercentage()}%</span>
          </div>
          <div className="progress-stat">
            <span className="stat-label">Completed Days</span>
            <span className="stat-value">
              {progress.filter((p) => p.completed).length} / {days.length}
            </span>
          </div>
        </div>
      </div>

      <div className="days-grid">
        {days.length === 0 ? (
          <div className="no-content">
            <p>No learning content available yet.</p>
            <p>Check back later!</p>
          </div>
        ) : (
          days.map((day) => {
            const dayProgress = getDayProgress(day.day_number);
            const isCompleted = dayProgress?.completed || false;

            return (
              <div
                key={day.day_number}
                className={`day-card ${isCompleted ? 'completed' : ''}`}
                onClick={() => handleDayClick(day.day_number)}
              >
                <div className="day-card-header">
                  <h3>Day {day.day_number}</h3>
                  {isCompleted && <span className="completion-badge">✓</span>}
                </div>

                <h4 className="day-title">{day.title}</h4>

                {day.description && (
                  <p className="day-description">{day.description}</p>
                )}

                <div className="day-resources">
                  <div className="resource-count">
                    <span className="resource-icon">📓</span>
                    <span>{day.notebooks} Notebook{day.notebooks !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="resource-count">
                    <span className="resource-icon">📄</span>
                    <span>{day.pdfs} PDF{day.pdfs !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {dayProgress && (
                  <div className="day-footer">
                    <span className="last-accessed">
                      Last accessed: {new Date(dayProgress.last_accessed).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dashboard;
