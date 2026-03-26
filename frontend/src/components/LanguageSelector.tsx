import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'hi', label: 'हि', name: 'Hindi' },
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleChange = () => {
    const currentIdx = LANGUAGES.findIndex(l => l.code === i18n.language);
    const nextIdx = (currentIdx + 1) % LANGUAGES.length;
    i18n.changeLanguage(LANGUAGES[nextIdx].code);
  };

  return (
    <button
      onClick={handleChange}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-medium"
      aria-label={`Current language: ${currentLang.name}. Click to switch.`}
      title={`Language: ${currentLang.name}`}
    >
      <Globe className="w-3.5 h-3.5" />
      {currentLang.label}
    </button>
  );
};

export default LanguageSelector;
