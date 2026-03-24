import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { certificatesAPI } from '../utils/api';
import { Award, CheckCircle, XCircle, GraduationCap } from 'lucide-react';

const VerifyCertificate: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (certId) verify();
  }, [certId]);

  const verify = async () => {
    try {
      const result = await certificatesAPI.verify(certId!);
      setData(result);
      setValid(result.valid);
    } catch {
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Verifying certificate...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

      <div className="glass-card p-8 w-full max-w-md text-center relative z-10 animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="https://spark10k.com/logo.png" alt="Spark10K" className="h-8" />
          <div className="h-5 w-px bg-white/10" />
          <span className="text-sm font-semibold text-slate-400">Certificate Verification</span>
        </div>

        {valid && data ? (
          <>
            <div className="bg-emerald-500/10 rounded-full p-4 w-fit mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Certificate Verified</h1>
            <p className="text-sm text-emerald-400 mb-6">This is a valid certificate</p>

            <div className="glass-card p-6 text-left space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Certificate</p>
                  <p className="text-white font-semibold">{data.certificate_title}</p>
                </div>
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-slate-500">Awarded to</p>
                <p className="text-white font-medium">{data.user_name}</p>
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-slate-500">Issue Date</p>
                <p className="text-slate-300">
                  {new Date(data.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-slate-500">Certificate ID</p>
                <p className="text-indigo-400 font-mono text-sm">{data.cert_id}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-rose-500/10 rounded-full p-4 w-fit mx-auto mb-4">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Certificate Not Found</h1>
            <p className="text-sm text-slate-400">
              The certificate ID <span className="font-mono text-slate-300">{certId}</span> could not be verified.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificate;
