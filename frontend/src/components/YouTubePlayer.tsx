import React, { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface Props {
  videoId: string;
  title: string;
  onEnded?: () => void;
}

let apiLoaded = false;
let apiReady = false;
const readyCallbacks: (() => void)[] = [];

const loadYTApi = () => {
  if (apiLoaded) return;
  apiLoaded = true;

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    readyCallbacks.forEach(cb => cb());
    readyCallbacks.length = 0;
  };
};

const whenApiReady = (cb: () => void) => {
  if (apiReady) { cb(); return; }
  readyCallbacks.push(cb);
  loadYTApi();
};

const YouTubePlayer: React.FC<Props> = ({ videoId, title, onEnded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const handleStateChange = useCallback((event: any) => {
    // YT.PlayerState.ENDED === 0
    if (event.data === 0 && onEnded) {
      onEnded();
    }
  }, [onEnded]);

  useEffect(() => {
    whenApiReady(() => {
      if (!containerRef.current) return;

      // Clear any existing player
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: handleStateChange,
        },
      });
    });

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId, handleStateChange]);

  return (
    <div className="relative w-full pb-[56.25%] bg-black rounded-2xl overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" title={title} />
    </div>
  );
};

export default YouTubePlayer;
