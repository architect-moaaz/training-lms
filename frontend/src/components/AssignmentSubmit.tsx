import React, { useState } from 'react';
import { assignmentAPI } from '../utils/api';
import { AssignmentData } from '../types';
import { FileUp, CheckCircle, Clock, MessageSquare, Upload } from 'lucide-react';

interface Props {
  assignment: AssignmentData;
  onSubmitted: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-amber-500/10 text-amber-400',
  reviewed: 'bg-emerald-500/10 text-emerald-400',
  returned: 'bg-rose-500/10 text-rose-400',
};

const AssignmentSubmit: React.FC<Props> = ({ assignment, onSubmitted }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sub = assignment.my_submission;

  const handleSubmit = async () => {
    if (!text.trim() && !file) {
      setError('Please provide a text response or upload a file');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await assignmentAPI.submitAssignment(assignment.id, {
        text_content: text || undefined,
        file: file || undefined,
      });
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileUp className="w-5 h-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
      </div>
      {assignment.description && (
        <p className="text-sm text-slate-400 mb-4 ml-7">{assignment.description}</p>
      )}

      {/* Already submitted */}
      {sub ? (
        <div className="ml-7">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${STATUS_STYLES[sub.status] || ''}`}>
            {sub.status === 'reviewed' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
            {sub.grade && ` — ${sub.grade}`}
          </div>

          {sub.text_content && (
            <div className="bg-slate-800/40 rounded-xl p-4 mb-3">
              <p className="text-xs text-slate-500 mb-1">Your response:</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{sub.text_content}</p>
            </div>
          )}

          {sub.file_name && (
            <p className="text-sm text-slate-400 mb-3">
              Attached: <span className="text-slate-200">{sub.file_name}</span>
            </p>
          )}

          {sub.feedback && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mt-3">
              <p className="text-xs text-indigo-400 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Instructor Feedback
              </p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{sub.feedback}</p>
            </div>
          )}
        </div>
      ) : (
        /* Submit form */
        <div className="ml-7 space-y-4">
          {error && <div className="error-banner text-sm">{error}</div>}

          {(assignment.submission_type === 'text' || assignment.submission_type === 'both') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Response</label>
              <textarea value={text} onChange={e => { setText(e.target.value); setError(''); }}
                className="input-field min-h-[120px]" placeholder="Type your answer here..." />
            </div>
          )}

          {(assignment.submission_type === 'file' || assignment.submission_type === 'both') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Upload File <span className="text-slate-500">(max {assignment.max_file_size_mb}MB)</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 bg-slate-800/40 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{file ? file.name : 'Choose file...'}</span>
                <input type="file" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setError(''); }} />
              </label>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            className="btn-primary px-6 py-2.5">
            {submitting ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmit;
