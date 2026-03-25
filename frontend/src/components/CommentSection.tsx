import React, { useState, useEffect } from 'react';
import { commentsAPI } from '../utils/api';
import { getAuthData } from '../utils/auth';
import { CommentData } from '../types';
import { MessageCircle, Send, Reply, Edit2, Trash2, X, Check, CornerDownRight } from 'lucide-react';

interface Props {
  dayNumber: number;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const CommentItem: React.FC<{
  comment: CommentData;
  replies: CommentData[];
  allComments: CommentData[];
  userId: number;
  isAdmin: boolean;
  onReply: (parentId: number) => void;
  onEdit: (comment: CommentData) => void;
  onDelete: (commentId: number) => void;
  replyingTo: number | null;
  onSubmitReply: (content: string) => void;
  onCancelReply: () => void;
}> = ({ comment, replies, allComments, userId, isAdmin, onReply, onEdit, onDelete, replyingTo, onSubmitReply, onCancelReply }) => {
  const [replyText, setReplyText] = useState('');

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onSubmitReply(replyText.trim());
      setReplyText('');
    }
  };

  return (
    <div>
      <div className="group flex gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-400 shrink-0 mt-0.5">
          {comment.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-200">{comment.username}</span>
            <span className="text-xs text-slate-600">{timeAgo(comment.created_at)}</span>
            {comment.created_at !== comment.updated_at && !comment.is_deleted && (
              <span className="text-xs text-slate-700">(edited)</span>
            )}
          </div>
          <p className={`text-sm leading-relaxed ${comment.is_deleted ? 'text-slate-600 italic' : 'text-slate-300'}`}>
            {comment.content}
          </p>

          {!comment.is_deleted && (
            <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onReply(comment.id)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                <Reply className="w-3 h-3" /> Reply
              </button>
              {comment.user_id === userId && (
                <button onClick={() => onEdit(comment)}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
              {(comment.user_id === userId || isAdmin) && (
                <button onClick={() => onDelete(comment.id)}
                  className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply input */}
      {replyingTo === comment.id && (
        <div className="ml-11 mt-2 flex gap-2">
          <input value={replyText} onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmitReply()}
            placeholder="Write a reply..." autoFocus
            className="input-field text-sm flex-1 py-2" />
          <button onClick={handleSubmitReply} className="btn-primary px-3 py-2"><Send className="w-3.5 h-3.5" /></button>
          <button onClick={onCancelReply} className="btn-ghost px-2 py-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 border-l border-white/5 pl-4">
          {replies.map(reply => {
            const nestedReplies = allComments.filter(c => c.parent_id === reply.id);
            return (
              <CommentItem key={reply.id} comment={reply} replies={nestedReplies} allComments={allComments}
                userId={userId} isAdmin={isAdmin}
                onReply={onReply} onEdit={onEdit} onDelete={onDelete}
                replyingTo={replyingTo} onSubmitReply={onSubmitReply} onCancelReply={onCancelReply} />
            );
          })}
        </div>
      )}
    </div>
  );
};

const CommentSection: React.FC<Props> = ({ dayNumber }) => {
  const { user } = getAuthData();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<CommentData | null>(null);
  const [editText, setEditText] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchComments = async () => {
    try { setComments(await commentsAPI.getComments(dayNumber)); }
    catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, [dayNumber]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await commentsAPI.createComment(dayNumber, newComment.trim());
      setNewComment('');
      fetchComments();
    } catch {}
    finally { setPosting(false); }
  };

  const handleReplySubmit = async (content: string) => {
    if (!replyingTo) return;
    try {
      await commentsAPI.createComment(dayNumber, content, replyingTo);
      setReplyingTo(null);
      fetchComments();
    } catch {}
  };

  const handleEdit = (comment: CommentData) => {
    setEditingComment(comment);
    setEditText(comment.content);
  };

  const handleEditSave = async () => {
    if (!editingComment || !editText.trim()) return;
    try {
      await commentsAPI.updateComment(editingComment.id, editText.trim());
      setEditingComment(null);
      fetchComments();
    } catch {}
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsAPI.deleteComment(commentId);
      fetchComments();
    } catch {}
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const userId = user?.id || 0;
  const isAdmin = user?.is_admin || false;

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-indigo-400" />
        Discussion
        <span className="text-sm font-normal text-slate-500">({comments.filter(c => !c.is_deleted).length})</span>
      </h3>

      {/* New comment */}
      <div className="flex gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-400 shrink-0">
          {user?.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 flex gap-2">
          <input value={newComment} onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePost()}
            placeholder="Add a comment..." disabled={posting}
            className="input-field text-sm flex-1 py-2.5" />
          <button onClick={handlePost} disabled={posting || !newComment.trim()}
            className="btn-primary px-4 py-2.5 disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit modal inline */}
      {editingComment && (
        <div className="bg-slate-800/60 border border-white/10 rounded-xl p-4 mb-4">
          <p className="text-xs text-slate-400 mb-2">Editing comment</p>
          <div className="flex gap-2">
            <input value={editText} onChange={e => setEditText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditSave()}
              className="input-field text-sm flex-1 py-2" autoFocus />
            <button onClick={handleEditSave} className="btn-primary px-3 py-2"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditingComment(null)} className="btn-ghost px-2 py-2"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-slate-500 text-center py-4">Loading comments...</p>
      ) : topLevelComments.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No comments yet. Start the discussion!</p>
      ) : (
        <div className="space-y-5">
          {topLevelComments.map(comment => {
            const replies = comments.filter(c => c.parent_id === comment.id);
            return (
              <CommentItem key={comment.id} comment={comment} replies={replies} allComments={comments}
                userId={userId} isAdmin={isAdmin}
                onReply={(id) => setReplyingTo(id)} onEdit={handleEdit} onDelete={handleDelete}
                replyingTo={replyingTo} onSubmitReply={handleReplySubmit} onCancelReply={() => setReplyingTo(null)} />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
