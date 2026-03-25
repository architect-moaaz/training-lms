import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Spark10KLanding from './components/Spark10KLanding';
import LMSLanding from './components/LMSLanding';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import VerifyEmail from './components/VerifyEmail';
import Dashboard from './components/Dashboard';
import ProfileEdit from './components/ProfileEdit';
import DayContent from './components/DayContent';
import AdminDashboard from './components/AdminDashboard';
import PublicDashboard from './components/PublicDashboard';
import Onboarding from './components/Onboarding';
import FreeResourceViewer from './components/FreeResourceViewer';
import VerifyCertificate from './components/VerifyCertificate';
import EmailVerificationBanner from './components/EmailVerificationBanner';
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

// Pages that have their own navbar — hide the app-level Navbar on these
const PAGES_WITHOUT_NAVBAR = ['/', '/lms'];
const NAVBAR_HIDDEN_PREFIXES = ['/verify/', '/verify-email', '/reset-password', '/forgot-password'];

const AppContent: React.FC = () => {
  usePageTracking();
  const location = useLocation();
  const { user } = getAuthData();
  const showNavbar = !PAGES_WITHOUT_NAVBAR.includes(location.pathname)
    && !NAVBAR_HIDDEN_PREFIXES.some(p => location.pathname.startsWith(p));
  const showVerificationBanner = isAuthenticated() && user && !user.email_verified && !user.is_admin
    && showNavbar;

  return (
    <>
      {showNavbar && <Navbar />}
      {showVerificationBanner && <EmailVerificationBanner />}
      <Routes>
        {/* ── Public landing pages ── */}
        <Route
          path="/"
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Spark10KLanding />
          }
        />
        <Route
          path="/lms"
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LMSLanding />
          }
        />

        {/* ── Auth ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* ── Public ── */}
        <Route path="/browse" element={<PublicDashboard />} />
        <Route path="/verify/:certId" element={<VerifyCertificate />} />

        {/* ── Protected ── */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><OnboardingGate><Dashboard /></OnboardingGate></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><OnboardingGate><ProfileEdit /></OnboardingGate></ProtectedRoute>}
        />
        <Route
          path="/day/:dayNumber"
          element={<ProtectedRoute><OnboardingGate><DayContent /></OnboardingGate></ProtectedRoute>}
        />
        <Route
          path="/resource/:resourceId"
          element={<ProtectedRoute><OnboardingGate><FreeResourceViewer /></OnboardingGate></ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
        />

        {/* ── Catch-all ── */}
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
