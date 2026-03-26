import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const CheckoutSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="glass-card p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-slate-400 text-sm mb-6">
          Thank you for subscribing! Your account has been upgraded and you now have
          access to premium content.
        </p>
        <button onClick={() => navigate('/dashboard')}
          className="btn-primary px-6 py-3 w-full">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
