import React, { useState } from 'react';
import { authAPI } from '../utils/api';
import { AlertTriangle, Mail, X } from 'lucide-react';

const EmailVerificationBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      await authAPI.resendVerification();
      setSent(true);
    } catch {
      // silently fail — rate limited or SMTP not configured
    } finally {
      setSending(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-amber-200">
          Please verify your email address.
        </span>
        {sent ? (
          <span className="text-emerald-400 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Verification email sent!
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2"
          >
            {sending ? 'Sending...' : 'Resend email'}
          </button>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-500/60 hover:text-amber-400 p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default EmailVerificationBanner;
