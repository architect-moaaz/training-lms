import React, { useEffect, useState } from 'react';
import { certificatesAPI } from '../utils/api';
import { CertificateData } from '../types';
import { Award, Download, Share2, ExternalLink } from 'lucide-react';

const MyCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCerts, setNewCerts] = useState<CertificateData[]>([]);

  useEffect(() => { fetchCerts(); }, []);

  const fetchCerts = async () => {
    try {
      const certs = await certificatesAPI.getMy();
      setCertificates(certs);

      // Check for newly earned
      const result = await certificatesAPI.check();
      if (result.count > 0) {
        setNewCerts(result.newly_issued);
        // Refresh list
        const updated = await certificatesAPI.getMy();
        setCertificates(updated);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleDownload = async (certId: string) => {
    const token = localStorage.getItem('access_token');
    const url = certificatesAPI.getDownloadUrl(certId);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${certId}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleShare = (cert: CertificateData) => {
    const verifyUrl = `${window.location.origin}/verify/${cert.cert_id}`;
    navigator.clipboard.writeText(verifyUrl);
    alert('Verification link copied to clipboard!');
  };

  if (loading) return null;
  if (certificates.length === 0 && newCerts.length === 0) return null;

  return (
    <div className="mb-12">
      {/* New certificate celebration */}
      {newCerts.length > 0 && (
        <div className="glass-card p-6 mb-6 border-amber-500/30 bg-amber-500/5 animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-500/20 rounded-full p-2">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Congratulations!</h3>
              <p className="text-sm text-amber-300">You've earned {newCerts.length} new certificate{newCerts.length > 1 ? 's' : ''}!</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {newCerts.map(c => (
              <span key={c.id} className="bg-amber-500/10 text-amber-300 text-sm px-3 py-1.5 rounded-full font-medium">
                {c.certificate_title}
              </span>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-400" /> My Certificates
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certificates.map((cert) => (
          <div key={cert.id} className="glass-card p-5 border-amber-500/10">
            <div className="flex items-start justify-between mb-3">
              <div className="bg-gradient-to-br from-amber-500/20 to-violet-500/20 rounded-xl p-3">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-xs text-slate-500 font-mono">{cert.cert_id}</span>
            </div>
            <h3 className="font-semibold text-white mb-1">{cert.certificate_title}</h3>
            <p className="text-sm text-slate-400 mb-1">{cert.user_name}</p>
            <p className="text-xs text-slate-500 mb-4">
              Issued: {new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleDownload(cert.cert_id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl py-2 text-sm font-medium transition-all">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button onClick={() => handleShare(cert)}
                className="flex items-center justify-center gap-1 bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm transition-all"
                title="Copy verification link">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCertificates;
