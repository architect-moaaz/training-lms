import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { paymentsAPI } from '../utils/api';
import { isAuthenticated } from '../utils/auth';
import { SubscriptionPlanData } from '../types';
import { Check, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

const SPARK_BLUE = '#0077B5';

const PERIOD_LABELS: Record<string, string> = {
  monthly: '/month',
  yearly: '/year',
  one_time: 'one-time',
};

const PricingPage: React.FC = () => {
  // @ts-ignore - i18next type depth issue with TS 4.9
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsAPI.getPlans()
      .then(data => setPlans(data.plans))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: number) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    setCheckoutLoading(planId);
    setError('');
    try {
      const data = await paymentsAPI.createCheckout(planId);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
      <button onClick={() => navigate('/dashboard')}
        className="btn-ghost mb-6 flex items-center gap-2 text-sm" aria-label={String(t('nav.backToDashboard'))}>
        <ArrowLeft className="w-4 h-4" /> {String(t('nav.backToDashboard'))}
      </button>

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 bg-violet-500/10 border border-violet-500/20">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm text-violet-300">Premium</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('pricing.title')}</h1>
        <p className="text-slate-400 max-w-xl mx-auto">{t('pricing.subtitle')}</p>
      </div>

      {error && <div className="error-banner text-sm mb-6 text-center" role="alert">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-2">No subscription plans available yet.</p>
          <p className="text-slate-500 text-sm">All current content is free!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Free tier card */}
          <div className="glass-card p-6 flex flex-col">
            <h3 className="text-xl font-bold text-white mb-1">{t('pricing.freePlanTitle')}</h3>
            <p className="text-sm text-slate-400 mb-4">{t('pricing.freePlanDesc')}</p>
            <p className="text-3xl font-bold text-white mb-6">{t('pricing.free')}</p>
            <ul className="space-y-2 mb-8 flex-1">
              {['Access free courses', 'Interactive notebooks', 'Community discussion', 'Badges & certificates'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/dashboard')}
              className="w-full py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-slate-300">
              {t('pricing.currentPlan')}
            </button>
          </div>

          {/* Paid plans */}
          {plans.map(plan => (
            <div key={plan.id} className="glass-card p-6 flex flex-col border-indigo-500/20 relative overflow-hidden">
              {plan.price_cents > 0 && (
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[60px]" style={{ background: `${SPARK_BLUE}15` }} />
              )}
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
              <p className="text-3xl font-bold text-white mb-1">
                {plan.price_display}
                <span className="text-sm font-normal text-slate-500 ml-1">
                  {PERIOD_LABELS[plan.billing_period] || ''}
                </span>
              </p>
              <ul className="space-y-2 my-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleSubscribe(plan.id)}
                disabled={checkoutLoading === plan.id}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${SPARK_BLUE}, #005a8c)` }}>
                {checkoutLoading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : t('pricing.subscribe')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PricingPage;
