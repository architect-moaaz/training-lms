import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DayContent from './components/DayContent';
import AdminDashboard from './components/AdminDashboard';
import PublicDashboard from './components/PublicDashboard';
import Onboarding from './components/Onboarding';
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

const AppContent: React.FC = () => {
  usePageTracking();

  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/browse" replace />
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
