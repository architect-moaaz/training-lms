import React, { useEffect, useState } from 'react';
import { badgesAPI } from '../utils/api';
import { BadgeData } from '../types';
import { Award, Trophy, Zap, Clock, Star, Target, Flame } from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  award: Award,
  trophy: Trophy,
  zap: Zap,
  clock: Clock,
  star: Star,
  target: Target,
  flame: Flame,
};

const BadgeDisplay: React.FC = () => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [newBadges, setNewBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    badgesAPI.getMyBadges()
      .then(data => {
        setBadges(data.badges);
        setNewBadges(data.new_badges);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || badges.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" /> Your Badges
        <span className="text-sm font-normal text-slate-500">({badges.length})</span>
      </h2>

      {newBadges.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-amber-300 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          New badge{newBadges.length > 1 ? 's' : ''} earned: {newBadges.map(b => b.name).join(', ')}!
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {badges.map(badge => {
          const Icon = ICON_MAP[badge.badge_icon] || Award;
          return (
            <div key={badge.id}
              className="glass-card px-4 py-3 flex items-center gap-3 group hover:bg-white/[0.06] transition-all"
              title={badge.badge_description}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{badge.badge_name}</p>
                <p className="text-xs text-slate-500">
                  {new Date(badge.earned_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeDisplay;
