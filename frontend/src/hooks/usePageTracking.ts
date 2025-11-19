import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const usePageTracking = () => {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>(location.pathname);

  useEffect(() => {
    // When component mounts or location changes
    const currentPath = location.pathname;
    const currentTime = Date.now();

    // If path changed, send tracking data for previous page
    if (lastPathRef.current !== currentPath && lastPathRef.current !== '') {
      const timeSpent = Math.floor((currentTime - startTimeRef.current) / 1000); // in seconds

      // Only track if user spent at least 1 second on the page
      if (timeSpent >= 1) {
        trackPage(lastPathRef.current, document.title, timeSpent);
      }
    }

    // Update refs for new page
    lastPathRef.current = currentPath;
    startTimeRef.current = currentTime;

    // Send tracking data when user leaves the page
    const handleBeforeUnload = () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (timeSpent >= 1) {
        // Use sendBeacon for reliable tracking on page unload
        const token = localStorage.getItem('access_token');
        if (token) {
          const data = JSON.stringify({
            page_url: currentPath,
            page_title: document.title,
            time_spent: timeSpent
          });

          navigator.sendBeacon(
            `${API_BASE_URL}/track/page`,
            new Blob([data], { type: 'application/json' })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Track time when component unmounts (route change)
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (timeSpent >= 1) {
        trackPage(currentPath, document.title, timeSpent);
      }
    };
  }, [location]);
};

const trackPage = async (pageUrl: string, pageTitle: string, timeSpent: number) => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    await axios.post(
      `${API_BASE_URL}/track/page`,
      {
        page_url: pageUrl,
        page_title: pageTitle,
        time_spent: timeSpent
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  } catch (error) {
    // Silently fail - don't interrupt user experience for tracking errors
    console.debug('Page tracking error:', error);
  }
};
