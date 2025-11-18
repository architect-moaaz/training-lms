import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuthData, clearAuthData } from '../utils/auth';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getAuthData();

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
        <h1>LMS</h1>
      </div>

      <div className="navbar-center">
        {location.pathname.includes('/day/') && (
          <span className="breadcrumb">Dashboard / Day {location.pathname.split('/day/')[1]}</span>
        )}
        {location.pathname === '/dashboard' && <span className="breadcrumb">Dashboard</span>}
      </div>

      <div className="navbar-menu">
        <span className="user-name">{user.username}</span>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
