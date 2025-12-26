import { useState, useEffect } from 'react';
import { useWorker } from './hooks/useWorker';
import { Search, Plus, Brain, List } from 'lucide-react';
import clsx from 'clsx';
import { NoteList } from './presentation/components/NoteList';
import { AddNoteForm } from './presentation/components/AddNoteForm';
import { SearchBar } from './presentation/components/SearchBar';
import { StatusBadge } from './presentation/components/StatusBadge';

function App() {
    const { status, error, searchResults, allNotes, addNote, search, listNotes, deleteNote, isIndexing, progress } = useWorker();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'search' | 'add' | 'list'>('search');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            search(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, search]);

    // Refresh list and clear inputs when tab changes
    useEffect(() => {
        setQuery('');
        if (activeTab === 'list') {
            listNotes();
        }
    }, [activeTab, listNotes]);

    const handleAddNote = (text: string, category: string) => {
        addNote(text, category);
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
                        <SearchBar
                            query={query}
                            setQuery={setQuery}
                            isIndexing={isIndexing}
                            results={searchResults}
                        />
                    )}

                    {activeTab === 'list' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold text-zinc-200">All Notes ({allNotes.length})</h2>
                            <NoteList notes={allNotes} onDelete={deleteNote} />
                        </div>
                    )}

                    {activeTab === 'add' && (
                        <AddNoteForm onAdd={handleAddNote} isProcessing={isIndexing} />
                    )}

                </main>
            </div>
        </div>
    );
}

export default App;
