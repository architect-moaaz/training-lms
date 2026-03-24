import React, { useState, useEffect } from 'react';
import { EventData } from '../../types';
import { eventsAPI } from '../../utils/api';
import { Plus, Pencil, Trash2, ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';

const EVENT_TYPES = ['workshop', 'bootcamp', 'hackathon', 'meetup', 'webinar', 'conference'];

const EventManagement: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [editing, setEditing] = useState<EventData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', event_date: '', location: '', city: '',
    attendees: '', image_url: '', linkedin_url: '', highlights: '',
    event_type: 'workshop', is_upcoming: false, is_active: true, sort_order: 0,
  });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => { try { setEvents(await eventsAPI.getAll()); } catch { setError('Failed to load events'); } };

  const openCreate = () => {
    setForm({ title: '', description: '', event_date: '', location: '', city: '', attendees: '', image_url: '', linkedin_url: '', highlights: '', event_type: 'workshop', is_upcoming: false, is_active: true, sort_order: 0 });
    setEditing(null); setShowForm(true);
  };

  const openEdit = (e: EventData) => {
    setForm({
      title: e.title, description: e.description, event_date: e.event_date || '',
      location: e.location, city: e.city, attendees: e.attendees,
      image_url: e.image_url || '', linkedin_url: e.linkedin_url || '',
      highlights: e.highlights, event_type: e.event_type,
      is_upcoming: e.is_upcoming, is_active: e.is_active, sort_order: e.sort_order,
    });
    setEditing(e); setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setError('');
    try {
      if (editing) { await eventsAPI.update(editing.id, form); }
      else { await eventsAPI.create(form); }
      setShowForm(false); setEditing(null); fetchEvents();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete event "${title}"?`)) return;
    try { await eventsAPI.delete(id); fetchEvents(); } catch { setError('Failed to delete'); }
  };

  if (showForm) {
    return (
      <div className="max-w-lg">
        <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost text-sm flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-6">{editing ? 'Edit Event' : 'Add Event'}</h3>
          {error && <div className="error-banner text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Event Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="input-field" placeholder="e.g. Gen AI Workshop" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Date *</label>
              <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px]" placeholder="What happened at this event?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Location</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="College or venue name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input-field" placeholder="e.g. Bangalore" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Attendees</label>
                <input value={form.attendees} onChange={e => setForm({ ...form, attendees: e.target.value })} className="input-field" placeholder="e.g. 200+" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Event Type</label>
                <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className="input-field">
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Image URL</label>
              <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="input-field" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">LinkedIn Post URL</label>
              <input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} className="input-field" placeholder="https://linkedin.com/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Highlights (comma-separated)</label>
              <input value={form.highlights} onChange={e => setForm({ ...form, highlights: e.target.value })} className="input-field" placeholder="e.g. Hands-on coding, LLM demo, Project showcase" />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_upcoming} onChange={e => setForm({ ...form, is_upcoming: e.target.checked })}
                  className="rounded border-white/20 bg-slate-800 text-indigo-500" />
                <span className="text-sm text-slate-300">Upcoming</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-white/20 bg-slate-800 text-indigo-500" />
                <span className="text-sm text-slate-300">Active</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Events ({events.length})</h2>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="glass-card p-5 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-white">{event.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 capitalize">{event.event_type}</span>
                {event.is_upcoming && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Upcoming</span>}
                {!event.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Hidden</span>}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {event.event_date}</span>
                {event.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.city}</span>}
                {event.attendees && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {event.attendees}</span>}
              </div>
              {event.description && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{event.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(event)} className="text-slate-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(event.id, event.title)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center text-slate-500 py-8">No events yet. Add your first event.</div>
        )}
      </div>
    </div>
  );
};

export default EventManagement;
