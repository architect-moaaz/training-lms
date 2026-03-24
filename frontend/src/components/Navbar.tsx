import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthData, clearAuthData } from '../utils/auth';
import { LogOut, Shield, LayoutDashboard } from 'lucide-react';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getAuthData();

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
  };

  const Brand = ({ onClick }: { onClick: () => void }) => (
    <div className="flex items-center gap-3 cursor-pointer" onClick={onClick}>
      <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-7" />
      <div className="h-5 w-px bg-white/10" />
      <span className="text-sm font-semibold text-slate-400">Learning Platform</span>
    </div>
  );

  if (!user) {
    if (location.pathname === '/browse') {
      return (
        <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between">
          <Brand onClick={() => navigate('/')} />
          <button onClick={() => navigate('/login')} className="btn-primary text-sm">
            Sign In
          </button>
        </nav>
      );
    }
    return null;
  }

  return (
    <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between">
      <Brand onClick={() => navigate('/dashboard')} />

      <div className="flex-1 text-center">
        {location.pathname.includes('/day/') && (
          <span className="text-sm text-slate-500">
            Dashboard <span className="mx-2">/</span>
            <span className="text-slate-300">Day {location.pathname.split('/day/')[1]}</span>
          </span>
        )}
        {location.pathname.includes('/resource/') && (
          <span className="text-sm text-slate-400">Free Course</span>
        )}
        {location.pathname === '/dashboard' && (
          <span className="text-sm text-slate-400">Dashboard</span>
        )}
        {location.pathname === '/admin' && (
          <span className="text-sm text-slate-400">Admin Dashboard</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user.is_admin && location.pathname !== '/admin' && (
          <button onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-full px-4 py-2 text-sm transition-all duration-200">
            <Shield className="w-4 h-4" /> Admin
          </button>
        )}
        {user.is_admin && location.pathname === '/admin' && (
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-full px-4 py-2 text-sm transition-all duration-200">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
        )}
        <span className="text-sm text-slate-400">{user.username}</span>
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 text-rose-400 hover:bg-rose-500/10 rounded-full px-3 py-2 text-sm transition-all duration-200">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
