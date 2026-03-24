import React, { useEffect, useState } from 'react';
import { daysAPI } from '../utils/api';
import { Notebook, NotebookCell } from '../types';
import { X, Play, PlayCircle, Info } from 'lucide-react';

interface NotebookViewerProps {
  dayNumber: number;
  filename: string;
  onClose: () => void;
}

interface CellOutput {
  output: string;
  error: boolean;
}

const NotebookViewer: React.FC<NotebookViewerProps> = ({ dayNumber, filename, onClose }) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cellOutputs, setCellOutputs] = useState<{ [key: number]: CellOutput }>({});
  const [executingCell, setExecutingCell] = useState<number | null>(null);
  const [editedCells, setEditedCells] = useState<{ [key: number]: string }>({});

  useEffect(() => { fetchNotebook(); }, [dayNumber, filename]);

  const fetchNotebook = async () => {
    setLoading(true);
    try { setNotebook(await daysAPI.getNotebook(dayNumber, filename)); }
    catch { setError('Failed to load notebook.'); }
    finally { setLoading(false); }
  };

  const getCellSource = (cell: NotebookCell): string => Array.isArray(cell.source) ? cell.source.join('') : cell.source;
  const getCurrentCellContent = (index: number): string => editedCells[index] !== undefined ? editedCells[index] : (notebook ? getCellSource(notebook.cells[index]) : '');
  const handleCellEdit = (index: number, value: string) => setEditedCells({ ...editedCells, [index]: value });

  const executeCell = async (cellIndex: number, code: string) => {
    setExecutingCell(cellIndex);
    try {
      const result = await daysAPI.executeCell(code);
      if (!result.success) {
        setCellOutputs({ ...cellOutputs, [cellIndex]: { output: result.error || 'Execution failed', error: true } });
      } else {
        let outputText = '';
        if (result.outputs?.length) {
          for (const output of result.outputs) {
            if (output.type === 'stream') outputText += output.text;
            else if (output.type === 'execute_result' && output.data['text/plain']) outputText += output.data['text/plain'];
            else if (output.type === 'error') outputText += `${output.ename}: ${output.evalue}\n${output.traceback.join('\n')}`;
          }
        }
        setCellOutputs({ ...cellOutputs, [cellIndex]: { output: outputText || '(executed successfully)', error: result.outputs?.some((o: any) => o.type === 'error') || false } });
      }
    } catch (err: any) {
      setCellOutputs({ ...cellOutputs, [cellIndex]: { output: err.response?.data?.error || err.message || 'Failed to execute', error: true } });
    } finally { setExecutingCell(null); }
  };

  const runAllCells = async () => {
    if (!notebook) return;
    for (let i = 0; i < notebook.cells.length; i++) {
      if (notebook.cells[i].cell_type === 'code') await executeCell(i, getCurrentCellContent(i));
    }
  };

  const renderMarkdown = (source: string): string => {
    let html = source;
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-slate-100 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-slate-100 mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-4 mb-2">$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-slate-100">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/`(.*?)`/gim, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 text-sm">$1</code>');
    html = html.replace(/\n/gim, '<br>');
    return html;
  };

  if (loading) return (
    <div className="flex-1 flex flex-col bg-slate-950">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-end">
        <button onClick={onClose} className="btn-ghost text-sm flex items-center gap-1.5"><X className="w-4 h-4" /> Close</button>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400">Loading notebook...</div>
    </div>
  );

  if (error || !notebook) return (
    <div className="flex-1 flex flex-col bg-slate-950">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-end">
        <button onClick={onClose} className="btn-ghost text-sm flex items-center gap-1.5"><X className="w-4 h-4" /> Close</button>
      </div>
      <div className="p-6"><div className="error-banner">{error || 'Notebook not found'}</div></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-screen">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-white truncate">{filename.replace('.ipynb', '')}</h2>
        <div className="flex items-center gap-2">
          <button onClick={runAllCells} disabled={executingCell !== null}
            className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-all">
            <PlayCircle className="w-4 h-4" /> Run All
          </button>
          <button onClick={onClose} className="btn-ghost text-sm flex items-center gap-1.5"><X className="w-4 h-4" /> Close</button>
        </div>
      </div>

      <div className="bg-sky-500/10 border-b border-sky-500/20 px-6 py-3 text-sm text-sky-300 flex items-center gap-2 shrink-0">
        <Info className="w-4 h-4 shrink-0" />
        <span><strong>Server-Side Execution:</strong> Code cells run on the server with full Python environment.</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notebook.cells.map((cell, index) => (
          <div key={index}>
            {cell.cell_type === 'markdown' ? (
              <div className="glass-card p-6 text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(getCellSource(cell)) }} />
            ) : cell.cell_type === 'code' ? (
              <div className="glass-card overflow-hidden">
                <div className="bg-slate-800/50 border-b border-white/5 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">In [{cell.execution_count || ' '}]:</span>
                  <button onClick={() => executeCell(index, getCurrentCellContent(index))} disabled={executingCell === index}
                    className="bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 rounded-lg px-3 py-1 text-xs font-medium flex items-center gap-1 transition-all">
                    {executingCell === index ? <span className="animate-spin">⏳</span> : <Play className="w-3 h-3" />}
                    {executingCell === index ? 'Running...' : 'Run'}
                  </button>
                </div>
                <textarea
                  className="w-full bg-slate-900 text-emerald-300 font-mono text-sm p-4 resize-none focus:outline-none border-none"
                  value={getCurrentCellContent(index)}
                  onChange={(e) => handleCellEdit(index, e.target.value)}
                  disabled={executingCell === index}
                  spellCheck={false}
                  rows={Math.max(getCurrentCellContent(index).split('\n').length, 2)}
                />
                {cellOutputs[index] && (
                  <div className="bg-slate-800/30 border-t border-white/5 p-4">
                    <span className="text-xs text-slate-500 block mb-1">Out:</span>
                    <pre className={`text-sm font-mono whitespace-pre-wrap ${cellOutputs[index].error ? 'text-rose-400' : 'text-slate-300'}`}>
                      {cellOutputs[index].output}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <pre className="glass-card p-4 text-sm font-mono text-slate-400">{getCellSource(cell)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotebookViewer;
