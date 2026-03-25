import React, { useState, useEffect } from 'react';
import { assignmentAPI } from '../../utils/api';
import { Plus, Trash2, Edit2, X, MessageSquare, CheckCircle } from 'lucide-react';

const AssignmentManagement: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ day_number: '', title: '', description: '', submission_type: 'text' });
  const [activeView, setActiveView] = useState<'assignments' | 'submissions'>('assignments');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({ grade: '', feedback: '' });
  const [error, setError] = useState('');

  const fetchAll = async () => {
    try {
      const [a, s] = await Promise.all([assignmentAPI.listAssignments(), assignmentAPI.listSubmissions()]);
      setAssignments(a.assignments);
      setSubmissions(s.submissions);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!form.day_number || !form.title) { setError('Day and title required'); return; }
    try {
      const payload = { ...form, day_number: parseInt(form.day_number) };
      if (editingId) await assignmentAPI.updateAssignment(editingId, payload);
      else await assignmentAPI.createAssignment(payload);
      setShowForm(false);
      setEditingId(null);
      setForm({ day_number: '', title: '', description: '', submission_type: 'text' });
      fetchAll();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed'); }
  };

  const handleEdit = (a: any) => {
    setForm({ day_number: String(a.day_number), title: a.title, description: a.description || '', submission_type: a.submission_type });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete?')) return;
    try { await assignmentAPI.deleteAssignment(id); fetchAll(); } catch {}
  };

  const handleReview = async (subId: number) => {
    if (!reviewForm.grade) { setError('Grade required'); return; }
    try {
      await assignmentAPI.reviewSubmission(subId, reviewForm);
      setReviewingId(null);
      setReviewForm({ grade: '', feedback: '' });
      fetchAll();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="text-slate-400 text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
          <button onClick={() => setActiveView('assignments')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${activeView === 'assignments' ? 'text-indigo-400 border-indigo-400' : 'text-slate-400 border-transparent'}`}>
            Assignments ({assignments.length})
          </button>
          <button onClick={() => setActiveView('submissions')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${activeView === 'submissions' ? 'text-indigo-400 border-indigo-400' : 'text-slate-400 border-transparent'}`}>
            Submissions ({submissions.length})
          </button>
        </div>
        {activeView === 'assignments' && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ day_number: '', title: '', description: '', submission_type: 'text' }); }}
            className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Assignment</button>
        )}
      </div>

      {error && <div className="error-banner text-sm mb-4">{error} <button onClick={() => setError('')}><X className="w-3.5 h-3.5 inline ml-2" /></button></div>}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">{editingId ? 'Edit' : 'Create'} Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Day *</label>
              <input type="number" value={form.day_number} onChange={e => setForm(f => ({ ...f, day_number: e.target.value }))}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select value={form.submission_type} onChange={e => setForm(f => ({ ...f, submission_type: e.target.value }))}
                className="input-field text-sm">
                <option value="text">Text</option>
                <option value="file">File Upload</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field text-sm min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm px-5 py-2">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Assignments List */}
      {activeView === 'assignments' && (
        <div className="space-y-3">
          {assignments.length === 0 && <p className="text-slate-500 text-center py-8">No assignments yet.</p>}
          {assignments.map(a => (
            <div key={a.id} className="glass-card px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400">Day {a.day_number}</span>
                <div>
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.submission_type} &middot; {a.submission_count} submissions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(a)} className="text-slate-400 hover:text-white p-1.5"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-rose-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submissions List */}
      {activeView === 'submissions' && (
        <div className="space-y-3">
          {submissions.length === 0 && <p className="text-slate-500 text-center py-8">No submissions yet.</p>}
          {submissions.map(s => (
            <div key={s.id} className="glass-card px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-300">Day {s.day_number}</span>
                  <span className="text-sm text-white">{s.username}</span>
                  <span className="text-xs text-slate-500">{s.assignment_title}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.status === 'reviewed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {s.status}{s.grade ? ` — ${s.grade}` : ''}
                </span>
              </div>

              {s.text_content && (
                <p className="text-sm text-slate-400 bg-slate-800/30 rounded-lg p-3 mb-2 whitespace-pre-wrap">{s.text_content}</p>
              )}
              {s.file_name && <p className="text-xs text-slate-500 mb-2">File: {s.file_name}</p>}

              {reviewingId === s.id ? (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-32">
                      <label className="block text-xs text-slate-400 mb-1">Grade *</label>
                      <select value={reviewForm.grade} onChange={e => setReviewForm(f => ({ ...f, grade: e.target.value }))}
                        className="input-field text-sm">
                        <option value="">Select</option>
                        <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                        <option value="D">D</option><option value="F">F</option><option value="Pass">Pass</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Feedback</label>
                      <input value={reviewForm.feedback} onChange={e => setReviewForm(f => ({ ...f, feedback: e.target.value }))}
                        className="input-field text-sm" placeholder="Feedback for student" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReview(s.id)} className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Submit Review
                    </button>
                    <button onClick={() => setReviewingId(null)} className="btn-ghost text-xs">Cancel</button>
                  </div>
                </div>
              ) : s.status !== 'reviewed' ? (
                <button onClick={() => { setReviewingId(s.id); setReviewForm({ grade: '', feedback: '' }); }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Review
                </button>
              ) : s.feedback ? (
                <p className="text-xs text-slate-500 mt-2">Feedback: {s.feedback}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentManagement;
