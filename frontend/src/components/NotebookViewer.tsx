import React, { useEffect, useState } from 'react';
import { daysAPI } from '../utils/api';
import { Notebook, NotebookCell } from '../types';
import '../styles/NotebookViewer.css';

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

  useEffect(() => {
    fetchNotebook();
  }, [dayNumber, filename]);

  const fetchNotebook = async () => {
    setLoading(true);
    try {
      const data = await daysAPI.getNotebook(dayNumber, filename);
      setNotebook(data);
    } catch (err: any) {
      setError('Failed to load notebook. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCellSource = (cell: NotebookCell): string => {
    if (Array.isArray(cell.source)) {
      return cell.source.join('');
    }
    return cell.source;
  };

  const getCurrentCellContent = (index: number): string => {
    if (editedCells[index] !== undefined) {
      return editedCells[index];
    }
    return notebook ? getCellSource(notebook.cells[index]) : '';
  };

  const handleCellEdit = (index: number, value: string) => {
    setEditedCells({
      ...editedCells,
      [index]: value
    });
  };

  const executeCell = async (cellIndex: number, code: string) => {
    setExecutingCell(cellIndex);

    try {
      const result = await daysAPI.executeCell(code);

      if (!result.success) {
        setCellOutputs({
          ...cellOutputs,
          [cellIndex]: {
            output: result.error || 'Execution failed',
            error: true
          },
        });
      } else {
        // Format outputs from server
        let outputText = '';
        if (result.outputs && result.outputs.length > 0) {
          for (const output of result.outputs) {
            if (output.type === 'stream') {
              outputText += output.text;
            } else if (output.type === 'execute_result') {
              if (output.data['text/plain']) {
                outputText += output.data['text/plain'];
              }
            } else if (output.type === 'error') {
              outputText += `${output.ename}: ${output.evalue}\n`;
              outputText += output.traceback.join('\n');
            }
          }
        }

        setCellOutputs({
          ...cellOutputs,
          [cellIndex]: {
            output: outputText || '(executed successfully)',
            error: result.outputs?.some((o: any) => o.type === 'error') || false
          },
        });
      }
    } catch (err: any) {
      setCellOutputs({
        ...cellOutputs,
        [cellIndex]: {
          output: err.response?.data?.error || err.message || 'Failed to execute cell',
          error: true
        },
      });
    } finally {
      setExecutingCell(null);
    }
  };

  const runAllCells = async () => {
    if (!notebook) return;

    for (let i = 0; i < notebook.cells.length; i++) {
      const cell = notebook.cells[i];
      if (cell.cell_type === 'code') {
        await executeCell(i, getCurrentCellContent(i));
      }
    }
  };

  const renderMarkdown = (source: string): string => {
    let html = source;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Code
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

    // Line breaks
    html = html.replace(/\n/gim, '<br>');

    return html;
  };

  if (loading) {
    return (
      <div className="notebook-viewer">
        <div className="notebook-header">
          <button onClick={onClose} className="close-button">
            ✕ Close
          </button>
        </div>
        <div className="loading">Loading notebook...</div>
      </div>
    );
  }

  if (error || !notebook) {
    return (
      <div className="notebook-viewer">
        <div className="notebook-header">
          <button onClick={onClose} className="close-button">
            ✕ Close
          </button>
        </div>
        <div className="error-message">{error || 'Notebook not found'}</div>
      </div>
    );
  }

  return (
    <div className="notebook-viewer">
      <div className="notebook-header">
        <div className="notebook-title">
          <h2>{filename.replace('.ipynb', '')}</h2>
        </div>
        <div className="notebook-actions">
          <button
            onClick={runAllCells}
            className="run-all-button"
            disabled={executingCell !== null}
          >
            ▶ Run All
          </button>
          <button onClick={onClose} className="close-button">
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{
        background: '#d1ecf1',
        border: '1px solid #0c5460',
        padding: '0.75rem 1rem',
        margin: '1rem 2rem',
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: '#0c5460'
      }}>
        ℹ️ <strong>Server-Side Execution:</strong> Code cells run on the server with full Python environment including LangChain, OpenAI, and other packages.
      </div>

      <div className="notebook-content">
        {notebook.cells.map((cell, index) => (
          <div key={index} className={`cell ${cell.cell_type}-cell`}>
            {cell.cell_type === 'markdown' ? (
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(getCellSource(cell)) }}
              />
            ) : cell.cell_type === 'code' ? (
              <div className="code-cell-container">
                <div className="code-cell-header">
                  <span className="cell-label">In [{cell.execution_count || ' '}]:</span>
                  <button
                    onClick={() => executeCell(index, getCurrentCellContent(index))}
                    className="run-cell-button"
                    disabled={executingCell === index}
                  >
                    {executingCell === index ? '⏳' : '▶'}
                  </button>
                </div>
                <textarea
                  className="code-content editable"
                  value={getCurrentCellContent(index)}
                  onChange={(e) => handleCellEdit(index, e.target.value)}
                  disabled={executingCell === index}
                  spellCheck={false}
                  rows={getCurrentCellContent(index).split('\n').length}
                />
                {cellOutputs[index] && (
                  <div className="cell-output">
                    <div className="output-label">Out:</div>
                    <pre className={cellOutputs[index].error ? 'error-output' : 'normal-output'}>
                      {cellOutputs[index].output}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <pre className="raw-content">{getCellSource(cell)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotebookViewer;
