import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationsAPI } from '../utils/api';
import { RecommendationData } from '../types';
import { Compass, ChevronRight, Sparkles } from 'lucide-react';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400',
  intermediate: 'bg-amber-500/10 text-amber-400',
  advanced: 'bg-rose-500/10 text-rose-400',
};

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const [recs, setRecs] = useState<RecommendationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recommendationsAPI.get()
      .then(data => setRecs(data.recommendations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || recs.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <Compass className="w-5 h-5 text-violet-400" /> What's Next
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {recs.slice(0, 6).map((rec, i) => (
          <div key={i}
            onClick={() => rec.type === 'resource' ? navigate(`/resource/${rec.id}`) : navigate(`/day/${rec.day_number}`)}
            className="glass-card-hover p-4 cursor-pointer group">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-violet-400">{rec.reason}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors truncate">
                  {rec.type === 'resource' ? rec.title : `Day ${rec.day_number}: ${rec.title}`}
                </p>
                {rec.level && (
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${LEVEL_STYLES[rec.level] || 'bg-slate-700 text-slate-300'}`}>
                    {rec.level}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;
