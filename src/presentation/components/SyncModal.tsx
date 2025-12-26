import { useState, useRef } from 'react';
import { X, Download, Upload, Check, AlertCircle, RefreshCw } from 'lucide-react';
import type { Note } from '../../domain/Note';

interface SyncModalProps {
  onClose: () => void;
  onExport: () => Promise<Note[]>;
  onImport: (file: File) => Promise<{ imported: number; updated: number }>;
}

export function SyncModal({ onClose, onExport, onImport }: SyncModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setStatus('processing');
      const notes = await onExport();

      // Create and download JSON file
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `notes_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      setStatus('success');
      setMessage(`Successfully exported ${notes.length} notes.`);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage('Failed to export notes.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('processing');
      const result = await onImport(file);
      setStatus('success');
      setMessage(`Sync Combined: Imported ${result.imported} new, Updated ${result.updated} notes.`);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setMessage('Failed to import file. Ensure it is a valid JSON backup.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl shadow-2xl ring-1 ring-zinc-800 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            Manual Smart Sync
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => { setActiveTab('export'); setStatus('idle'); setMessage(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'export'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
          >
            Export (Save)
          </button>
          <button
            onClick={() => { setActiveTab('import'); setStatus('idle'); setMessage(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-zinc-800/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
          >
            Import (Load)
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'export' ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-indigo-500/20">
                <Download className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-100">Export Notes</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Download a JSON file containing all your notes.
                  Save this file to transfer your data to another device.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={status === 'processing'}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'processing' ? 'Exporting...' : 'Download Sync File'}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-indigo-500/20">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-100">Import Notes</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Select a backup file from another device.
                  The app will intelligently merge changes.
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={status === 'processing'}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'processing' ? 'Processing...' : 'Select File to Import'}
              </button>
            </div>
          )}

          {/* Status Messages */}
          {message && (
            <div className={`mt-6 p-3 rounded-lg flex items-start gap-3 border ${status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}>
              {status === 'success' && <Check className="w-5 h-5 flex-shrink-0" />}
              {status === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
