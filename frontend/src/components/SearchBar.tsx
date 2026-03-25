import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../utils/api';
import { SearchResult } from '../types';
import { Search, BookOpen, Play, X } from 'lucide-react';

const SearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults(null); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAPI.search(query.trim());
        setResults(data);
        setOpen(true);
      } catch {}
      finally { setLoading(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (type: string, id: number) => {
    setOpen(false);
    setQuery('');
    if (type === 'day') navigate(`/day/${id}`);
    else navigate(`/resource/${id}`);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-slate-800/60 border border-white/5 rounded-xl px-3 py-1.5 focus-within:border-indigo-500/30 transition-colors">
        <Search className="w-3.5 h-3.5 text-slate-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results && results.total > 0 && setOpen(true)}
          placeholder="Search..."
          className="bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none w-28 md:w-40"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="text-slate-600 hover:text-slate-400">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {results.total === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No results for "{query}"</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {results.days.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider px-4 py-2 bg-slate-800/40">Days</p>
                  {results.days.map(d => (
                    <button key={d.day_number} onClick={() => handleSelect('day', d.day_number)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">Day {d.day_number}: {d.title}</p>
                        {d.description && <p className="text-xs text-slate-500 truncate">{d.description}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.resources.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider px-4 py-2 bg-slate-800/40">Resources</p>
                  {results.resources.map(r => (
                    <button key={r.id} onClick={() => handleSelect('resource', r.id)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3">
                      <Play className="w-4 h-4 text-violet-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{r.title}</p>
                        {r.instructor && <p className="text-xs text-slate-500 truncate">{r.instructor}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
