import React, { useState } from 'react';
import { quizAPI } from '../utils/api';
import { QuizData, QuizSubmitResult } from '../types';
import { CheckCircle, XCircle, Award, RotateCcw } from 'lucide-react';

interface Props {
  quiz: QuizData;
  onComplete: () => void;
}

const QuizViewer: React.FC<Props> = ({ quiz, onComplete }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const handleSelect = (questionId: number, value: string) => {
    setAnswers(a => ({ ...a, [String(questionId)]: value }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      if (!window.confirm('You haven\'t answered all questions. Submit anyway?')) return;
    }
    setSubmitting(true);
    try {
      const res = await quizAPI.submitQuiz(quiz.id, answers);
      setResult(res);
      onComplete();
    } catch {
      alert('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
  };

  // Show results
  if (result) {
    return (
      <div className="glass-card p-6">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            result.passed ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          }`}>
            {result.passed
              ? <Award className="w-8 h-8 text-emerald-400" />
              : <XCircle className="w-8 h-8 text-rose-400" />}
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            {result.passed ? 'Congratulations!' : 'Keep Trying!'}
          </h3>
          <p className="text-3xl font-bold text-white">{result.percentage}%</p>
          <p className="text-sm text-slate-400 mt-1">
            {result.score}/{result.total_points} points
            {result.passed
              ? ` — Passed (need ${quiz.passing_score}%)`
              : ` — Need ${quiz.passing_score}% to pass`}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {result.results.map((r, i) => {
            const q = quiz.questions[i];
            return (
              <div key={r.question_id} className={`rounded-xl p-4 border ${
                r.correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
              }`}>
                <div className="flex items-start gap-2 mb-2">
                  {r.correct
                    ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                  <p className="text-sm text-slate-200">{q?.question_text}</p>
                </div>
                {!r.correct && (
                  <div className="ml-6 text-xs">
                    <p className="text-rose-400">Your answer: {r.your_answer || '(no answer)'}</p>
                    <p className="text-emerald-400">Correct: {r.correct_answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={handleRetake}
          className="btn-ghost text-sm flex items-center gap-1.5 mx-auto">
          <RotateCcw className="w-4 h-4" /> Retake Quiz
        </button>
      </div>
    );
  }

  // Show quiz
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-1">{quiz.title}</h3>
      {quiz.description && <p className="text-sm text-slate-400 mb-1">{quiz.description}</p>}
      <p className="text-xs text-slate-500 mb-6">
        {quiz.question_count} questions &middot; {quiz.total_points} points &middot; Pass: {quiz.passing_score}%
        {quiz.time_limit_minutes && ` &middot; ${quiz.time_limit_minutes} min`}
      </p>

      {quiz.best_attempt && (
        <div className={`rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2 ${
          quiz.best_attempt.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          {quiz.best_attempt.passed ? <CheckCircle className="w-4 h-4" /> : <Award className="w-4 h-4" />}
          Best score: {quiz.best_attempt.percentage}% ({quiz.best_attempt.score}/{quiz.best_attempt.total_points})
        </div>
      )}

      <div className="space-y-6">
        {quiz.questions.map((q, i) => (
          <div key={q.id}>
            <p className="text-sm font-medium text-slate-200 mb-3">
              <span className="text-slate-500 mr-2">{i + 1}.</span>
              {q.question_text}
              <span className="text-xs text-slate-600 ml-2">({q.points} pt{q.points > 1 ? 's' : ''})</span>
            </p>
            <div className="space-y-2 ml-5">
              {q.options.map((option, oi) => (
                <label key={oi} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                  answers[String(q.id)] === option
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                    : 'bg-slate-800/30 border-white/5 text-slate-300 hover:border-white/10'
                }`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={option}
                    checked={answers[String(q.id)] === option}
                    onChange={() => handleSelect(q.id, option)}
                    className="text-indigo-500 focus:ring-indigo-500/20"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {Object.keys(answers).length}/{quiz.questions.length} answered
        </p>
        <button onClick={handleSubmit} disabled={submitting}
          className="btn-primary px-6 py-2.5">
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizViewer;
