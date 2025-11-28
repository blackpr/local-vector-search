import { useState, useEffect } from 'react';
import { useWorker } from './hooks/useWorker';
import { Search, Plus, Brain, Loader2, Sparkles, Trash2, List } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const { status, error, searchResults, allNotes, addNote, search, listNotes, deleteNote, isIndexing, progress } = useWorker();
  const [query, setQuery] = useState('');
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState('Personal');
  const [activeTab, setActiveTab] = useState<'search' | 'add' | 'list'>('search');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Refresh list when tab changes
  useEffect(() => {
    if (activeTab === 'list') {
      listNotes();
    }
  }, [activeTab, listNotes]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNote(newNote, category);
    setNewNote('');
  };


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-2xl mx-auto p-4 md:p-8 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900 rounded-2xl ring-1 ring-zinc-800 shadow-lg shadow-indigo-500/10 mb-4">
            <Brain className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Second Brain
          </h1>
          <p className="text-zinc-500">
            Offline Semantic Search Engine
          </p>
          
          <div className="flex flex-col items-center justify-center gap-2 text-xs font-medium mt-4 h-8">
            <StatusBadge status={status} progress={progress} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6">
            
            {/* Tabs */}
            <div className="flex p-1 bg-zinc-900/50 rounded-xl ring-1 ring-zinc-800 self-center w-full max-w-md">
                <button 
                    onClick={() => setActiveTab('search')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                        activeTab === 'search' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    )}
                >
                    <Search className="w-4 h-4" /> Search
                </button>
                <button 
                    onClick={() => setActiveTab('list')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                        activeTab === 'list' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    )}
                >
                    <List className="w-4 h-4" /> All Notes
                </button>
                <button 
                    onClick={() => setActiveTab('add')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                        activeTab === 'add' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    )}
                >
                    <Plus className="w-4 h-4" /> Add Note
                </button>
            </div>

            {status === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
                    {error || 'An error occurred'}
                </div>
            )}

            {activeTab === 'search' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 group-focus-within:opacity-50 transition duration-500 blur"></div>
                        <div className="relative flex items-center bg-zinc-900 rounded-xl ring-1 ring-zinc-800 group-focus-within:ring-indigo-500/50 shadow-xl">
                            <Search className="w-5 h-5 text-zinc-500 ml-4" />
                            <input 
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search your mind..." 
                                className="w-full bg-transparent border-none focus:ring-0 text-lg p-4 placeholder:text-zinc-600 text-zinc-200"
                                autoFocus
                            />
                            {isIndexing && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mr-4" />}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {searchResults.length > 0 ? (
                            searchResults.map((result, i) => (
                                <div key={i} className="group p-4 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800 hover:bg-zinc-900 hover:ring-zinc-700 transition-all duration-300 cursor-default">
                                    <div className="flex justify-between items-start gap-4">
                                        <p className="text-zinc-200 leading-relaxed">{result.text}</p>
                                        <span className="shrink-0 text-xs font-mono text-zinc-600 bg-zinc-950 px-2 py-1 rounded-full border border-zinc-800 group-hover:border-zinc-700">
                                            {((1 - result.distance) * 100).toFixed(0)}% match
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs font-medium text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md">
                                            {result.category}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : query.length > 1 ? (
                            <div className="text-center py-12 text-zinc-600">
                                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No matching thoughts found.</p>
                            </div>
                        ) : (
                           <div className="text-center py-12 text-zinc-600">
                                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Type to explore your memory.</p>
                           </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-xl font-semibold text-zinc-200">All Notes ({allNotes.length})</h2>
                    <div className="space-y-3">
                        {allNotes.length > 0 ? (
                            allNotes.map((note) => (
                                <div key={note.id} className="group p-4 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800 hover:bg-zinc-900 hover:ring-zinc-700 transition-all duration-300">
                                    <div className="flex justify-between items-start gap-4">
                                        <p className="text-zinc-200 leading-relaxed">{note.text}</p>
                                        <button 
                                            onClick={() => deleteNote(note.id)}
                                            className="shrink-0 p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                                            title="Delete note"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 justify-between">
                                        <span className="text-xs font-medium text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md">
                                            {note.category}
                                        </span>
                                        <span className="text-xs text-zinc-600">
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                           <div className="text-center py-12 text-zinc-600">
                                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No thoughts yet.</p>
                           </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'add' && (
                <form onSubmit={handleAddNote} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Note Content</label>
                        <textarea 
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="w-full h-32 bg-zinc-900 rounded-xl border-0 ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/50 text-zinc-200 p-4 resize-none"
                            placeholder="What's on your mind?"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Category</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-zinc-900 rounded-xl border-0 ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/50 text-zinc-200 p-4"
                        >
                            <option>Personal</option>
                            <option>Work</option>
                            <option>Ideas</option>
                            <option>Recipes</option>
                            <option>Journal</option>
                        </select>
                    </div>
                    <button 
                        type="submit"
                        disabled={isIndexing || !newNote.trim()}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {isIndexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Save Thought
                    </button>
                </form>
            )}

        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status, progress }: { status: string, progress: any }) {
    if (status === 'loading') {
        if (progress) {
            return (
                <div className="flex flex-col items-center gap-1 w-64">
                    <span className="flex items-center gap-1.5 text-amber-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> 
                        Downloading Model... {Math.round(progress.progress)}%
                    </span>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${progress.progress}%` }}
                        />
                    </div>
                </div>
            );
        }
        return <span className="flex items-center gap-1.5 text-amber-400"><Loader2 className="w-3 h-3 animate-spin" /> Initializing AI...</span>;
    }
    if (status === 'ready') {
        return <span className="flex items-center gap-1.5 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> System Ready</span>;
    }
    if (status === 'error') {
        return <span className="flex items-center gap-1.5 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400" /> System Error</span>;
    }
    return <span className="text-zinc-600">Waiting...</span>;
}

export default App;
