import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DayContent from './components/DayContent';
import AdminDashboard from './components/AdminDashboard';
import PublicDashboard from './components/PublicDashboard';
import Onboarding from './components/Onboarding';
import FreeResourceViewer from './components/FreeResourceViewer';
import VerifyCertificate from './components/VerifyCertificate';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated, getAuthData } from './utils/auth';
import { usePageTracking } from './hooks/usePageTracking';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = getAuthData();
  const [completed, setCompleted] = React.useState(user?.onboarding_completed ?? false);

  if (!completed && user && !user.is_admin) {
    return <Onboarding onComplete={() => setCompleted(true)} />;
  }
  return <>{children}</>;
};

// Pages that have their own navbar (landing page)
const PAGES_WITHOUT_NAVBAR = ['/', '/landing'];
const NAVBAR_HIDDEN_PREFIXES = ['/verify/'];

const AppContent: React.FC = () => {
  usePageTracking();
  const location = useLocation();
  const showNavbar = !PAGES_WITHOUT_NAVBAR.includes(location.pathname) && !NAVBAR_HIDDEN_PREFIXES.some(p => location.pathname.startsWith(p));

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LandingPage />
          }
        />
        <Route path="/browse" element={<PublicDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><OnboardingGate><Dashboard /></OnboardingGate></ProtectedRoute>}
        />
        <Route
          path="/day/:dayNumber"
          element={<ProtectedRoute><OnboardingGate><DayContent /></OnboardingGate></ProtectedRoute>}
        />
        <Route
          path="/resource/:resourceId"
          element={<ProtectedRoute><OnboardingGate><FreeResourceViewer /></OnboardingGate></ProtectedRoute>}
        />
        <Route path="/verify/:certId" element={<VerifyCertificate />} />
        <Route
          path="/admin"
          element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div className="min-h-screen flex flex-col">
          <AppContent />
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;
