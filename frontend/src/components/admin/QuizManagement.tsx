import React, { useState, useEffect } from 'react';
import { quizAPI } from '../../utils/api';
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Eye } from 'lucide-react';

interface QuizForm {
  day_number: string;
  title: string;
  description: string;
  passing_score: string;
  time_limit_minutes: string;
  questions: { question_text: string; options: string[]; correct_answer: string; points: string }[];
}

const emptyForm: QuizForm = {
  day_number: '', title: '', description: '', passing_score: '70', time_limit_minutes: '',
  questions: [{ question_text: '', options: ['', '', '', ''], correct_answer: '', points: '1' }],
};

const QuizManagement: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<QuizForm>({ ...emptyForm });
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [error, setError] = useState('');

  const fetchQuizzes = async () => {
    try {
      const data = await quizAPI.listQuizzes();
      setQuizzes(data.quizzes);
    } catch { setError('Failed to load quizzes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const handleEdit = (quiz: any) => {
    setForm({
      day_number: String(quiz.day_number),
      title: quiz.title,
      description: quiz.description || '',
      passing_score: String(quiz.passing_score),
      time_limit_minutes: quiz.time_limit_minutes ? String(quiz.time_limit_minutes) : '',
      questions: quiz.questions.map((q: any) => ({
        question_text: q.question_text,
        options: q.options.length ? q.options : ['', '', '', ''],
        correct_answer: q.correct_answer,
        points: String(q.points),
      })),
    });
    setEditingId(quiz.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.day_number || !form.title || form.questions.some(q => !q.question_text || !q.correct_answer)) {
      setError('Fill in all required fields'); return;
    }
    setError('');
    const payload = {
      day_number: parseInt(form.day_number),
      title: form.title,
      description: form.description,
      passing_score: parseInt(form.passing_score) || 70,
      time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : null,
      questions: form.questions.map(q => ({
        question_text: q.question_text,
        options: q.options.filter(o => o.trim()),
        correct_answer: q.correct_answer,
        points: parseInt(q.points) || 1,
      })),
    };
    try {
      if (editingId) await quizAPI.updateQuiz(editingId, payload);
      else await quizAPI.createQuiz(payload);
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      fetchQuizzes();
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this quiz?')) return;
    try { await quizAPI.deleteQuiz(id); fetchQuizzes(); } catch {}
  };

  const handleViewAttempts = async (quizId: number) => {
    if (expandedQuiz === quizId) { setExpandedQuiz(null); return; }
    try {
      const data = await quizAPI.getAttempts(quizId);
      setAttempts(data.attempts);
      setExpandedQuiz(quizId);
    } catch {}
  };

  const addQuestion = () => {
    setForm(f => ({ ...f, questions: [...f.questions, { question_text: '', options: ['', '', '', ''], correct_answer: '', points: '1' }] }));
  };

  const removeQuestion = (i: number) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  };

  const updateQuestion = (i: number, field: string, value: any) => {
    setForm(f => {
      const qs = [...f.questions];
      (qs[i] as any)[field] = value;
      return { ...f, questions: qs };
    });
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setForm(f => {
      const qs = [...f.questions];
      qs[qi].options = [...qs[qi].options];
      qs[qi].options[oi] = value;
      return { ...f, questions: qs };
    });
  };

  if (loading) return <div className="text-slate-400 text-center py-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Quiz Management</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); }}
          className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Quiz</button>
      </div>

      {error && <div className="error-banner text-sm mb-4">{error}</div>}

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">{editingId ? 'Edit Quiz' : 'Create Quiz'}</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Day *</label>
              <input type="number" value={form.day_number} onChange={e => setForm(f => ({ ...f, day_number: e.target.value }))}
                className="input-field text-sm" placeholder="1" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field text-sm" placeholder="Quiz title" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pass %</label>
              <input type="number" value={form.passing_score} onChange={e => setForm(f => ({ ...f, passing_score: e.target.value }))}
                className="input-field text-sm" />
            </div>
          </div>

          <h4 className="text-sm font-medium text-slate-300 mb-3">Questions</h4>
          <div className="space-y-4 mb-4">
            {form.questions.map((q, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-slate-500">Q{i + 1}</span>
                  {form.questions.length > 1 && (
                    <button onClick={() => removeQuestion(i)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                <input value={q.question_text} onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                  className="input-field text-sm mb-3" placeholder="Question text *" />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, oi) => (
                    <input key={oi} value={opt} onChange={e => updateOption(i, oi, e.target.value)}
                      className="input-field text-sm" placeholder={`Option ${oi + 1}`} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Correct Answer *</label>
                    <select value={q.correct_answer} onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                      className="input-field text-sm">
                      <option value="">Select...</option>
                      {q.options.filter(o => o.trim()).map((o, oi) => <option key={oi} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-slate-500 mb-1">Points</label>
                    <input type="number" value={q.points} onChange={e => updateQuestion(i, 'points', e.target.value)}
                      className="input-field text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addQuestion} className="btn-ghost text-sm mb-4 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Question</button>

          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm px-5 py-2">Save Quiz</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Quiz List */}
      <div className="space-y-3">
        {quizzes.length === 0 && <p className="text-slate-500 text-center py-8">No quizzes created yet.</p>}
        {quizzes.map(quiz => (
          <div key={quiz.id} className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400">Day {quiz.day_number}</span>
                <div>
                  <p className="text-sm font-medium text-white">{quiz.title}</p>
                  <p className="text-xs text-slate-500">{quiz.question_count} questions &middot; Pass: {quiz.passing_score}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleViewAttempts(quiz.id)}
                  className="text-slate-400 hover:text-white p-1.5 transition-colors" title="View attempts">
                  {expandedQuiz === quiz.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => handleEdit(quiz)} className="text-slate-400 hover:text-white p-1.5"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(quiz.id)} className="text-slate-400 hover:text-rose-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {expandedQuiz === quiz.id && (
              <div className="border-t border-white/5 px-5 py-4">
                <h4 className="text-xs font-medium text-slate-400 uppercase mb-3">Attempts ({attempts.length})</h4>
                {attempts.length === 0 ? <p className="text-xs text-slate-500">No attempts yet</p> : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {attempts.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 text-sm">
                        <span className="text-slate-300">{a.username}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${a.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {a.percentage}%
                          </span>
                          <span className="text-xs text-slate-500">{new Date(a.completed_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizManagement;
