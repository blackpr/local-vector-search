import { useState, useEffect } from 'react';
import { useWorker } from './hooks/useWorker';
import { Search, Plus, Brain, List, RefreshCw, Folder, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { NoteList } from './presentation/components/NoteList';
import { AddNoteForm } from './presentation/components/AddNoteForm';
import { SearchBar } from './presentation/components/SearchBar';
import { StatusBadge } from './presentation/components/StatusBadge';
import { SyncModal } from './presentation/components/SyncModal';
import { NoteDetail } from './presentation/components/NoteDetail';
import { CategoryManager } from './presentation/components/CategoryManager';

function App() {
    const { status, error, searchResults, allNotes, categories, addNote, search, listNotes, deleteNote, updateNote, listCategories, addCategory, deleteCategory, isIndexing, progress, exportNotes, importNotes, exportDatabase, importDatabase, suggestCategory, generateTags, getNote } = useWorker();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'search' | 'add' | 'list'>('search');
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [isUrlInitialized, setIsUrlInitialized] = useState(false);

    // Routing State
    const [selectedNote, setSelectedNote] = useState<any | null>(null);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // Pagination State
    const [offset, setOffset] = useState(0);
    const LIMIT = 20;

    // Debounce search
    useEffect(() => {
        if (!isUrlInitialized) return;
        const timer = setTimeout(() => {
            search(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, search, isUrlInitialized]);

    // Initial Load & Tab Change
    useEffect(() => {
        if (!isUrlInitialized) return;

        if (activeTab === 'list' && !isIndexing) {
            // Reset pagination
            setOffset(0);
            listNotes(LIMIT, 0, filterCategory || undefined, filterTag || undefined);
        }
        // Load categories on start
        listCategories();
    }, [activeTab, listNotes, listCategories, isIndexing, filterCategory, filterTag, isUrlInitialized]);

    // URL Sync Initialization
    useEffect(() => {
        if (status === 'ready' && !isUrlInitialized) {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            const q = params.get('q');
            const noteId = params.get('noteId');
            const cat = params.get('cat');
            const tag = params.get('tag');

            if (tab && ['search', 'add', 'list'].includes(tab)) {
                setActiveTab(tab as any);
            }
            if (q) {
                setQuery(q);
                search(q); // Trigger immediate search
            }
            if (cat) {
                setFilterCategory(cat);
            }
            if (tag) {
                setFilterTag(tag);
            }

            if (noteId) {
                getNote(parseInt(noteId)).then(note => {
                    if (note) setSelectedNote(note);
                });
            }

            setIsUrlInitialized(true);
        }
    }, [status, isUrlInitialized, getNote, search]);

    // Update URL on state change
    useEffect(() => {
        if (!isUrlInitialized) return;

        const params = new URLSearchParams();
        if (activeTab !== 'search') params.set('tab', activeTab);
        if (query) params.set('q', query);
        if (filterCategory) params.set('cat', filterCategory);
        if (filterTag) params.set('tag', filterTag);
        if (selectedNote) params.set('noteId', selectedNote.id.toString());

        const stringified = params.toString();
        const newUrl = stringified ? `?${stringified}` : window.location.pathname;

        // Use replaceState to update URL without adding to history (for now)
        window.history.replaceState(null, '', newUrl);
    }, [activeTab, query, selectedNote, filterCategory, filterTag, isUrlInitialized]);

    const handleLoadMore = () => {
        const newOffset = offset + LIMIT;
        setOffset(newOffset);
        listNotes(LIMIT, newOffset, filterCategory || undefined, filterTag || undefined);
    };

    const handleAddNote = (text: string, category: string, tags: string[]) => {
        addNote(text, category, tags);
        setActiveTab('list'); // Switch to list to see it
    };

    const handleCategoryClick = (category: string) => {
        setFilterCategory(category === filterCategory ? null : category);
        setFilterTag(null); // Clear tag when correcting category
        setActiveTab('list');
    };

    const handleTagClick = (tag: string) => {
        setFilterTag(tag === filterTag ? null : tag);
        setFilterCategory(null); // Clear category when selecting tag to avoid intersection for now
        setActiveTab('list');
    };

    const handleExport = async () => {
        return await exportNotes();
    };

    const handleImport = async (file: File) => {
        return new Promise<{ imported: number; updated: number }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const importedNotes = JSON.parse(content);
                    if (!Array.isArray(importedNotes)) throw new Error('Invalid backup file format');

                    const result = await importNotes(importedNotes);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    };

    // ... (rest of imports)

    // View Logic
    if (selectedNote) {
        return (
            <NoteDetail
                note={selectedNote}
                onBack={() => {
                    setSelectedNote(null);
                    // Refresh in case of edits/deletes
                    listNotes(LIMIT, 0, filterCategory || undefined, filterTag || undefined);
                }}
                onDelete={(id) => {
                    deleteNote(id);
                    setSelectedNote(null);
                    listNotes(LIMIT, 0, filterCategory || undefined, filterTag || undefined);
                }}
                onSave={async (id, text, category, tags) => {
                    updateNote(id, text, category, tags);
                    setSelectedNote(null);
                    listNotes(LIMIT, 0, filterCategory || undefined, filterTag || undefined); // Refresh list to show change
                }}
                onAutoTags={generateTags}
            />
        );
    }

    // ... (header)

    {/* Tabs */ }
    <div className="flex p-1 bg-zinc-900/50 rounded-xl ring-1 ring-zinc-800 self-center w-full max-w-md sticky top-4 z-20 backdrop-blur-md shadow-2xl shadow-black/50">
        <button
            onClick={() => setActiveTab('search')}
            className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                activeTab === 'search' ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-400 hover:text-zinc-200"
            )}
        >
            <Search className="w-4 h-4" /> Search
        </button>
        <button
            onClick={() => setActiveTab('list')}
            className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                activeTab === 'list' ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-400 hover:text-zinc-200"
            )}
        >
            <List className="w-4 h-4" /> Notes
        </button>
        <button
            onClick={() => setActiveTab('add')}
            className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                activeTab === 'add' ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-400 hover:text-zinc-200"
            )}
        >
            <Plus className="w-4 h-4" /> Add
        </button>
    </div>

    {
        status === 'error' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
                {error || 'An error occurred'}
            </div>
        )
    }

    {
        activeTab === 'search' && (
            <div className="space-y-4">
                <SearchBar
                    query={query}
                    setQuery={setQuery}
                    isIndexing={isIndexing}
                />

                {searchResults.length > 0 ? (
                    <div className="pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <NoteList
                            notes={searchResults}
                            onDelete={deleteNote}
                            onNoteClick={setSelectedNote}
                            onCategoryClick={(cat) => {
                                setFilterCategory(cat);
                                setFilterTag(null);
                                setActiveTab('list');
                            }}
                            onTagClick={(tag) => {
                                setFilterTag(tag);
                                setFilterCategory(null);
                                setActiveTab('list');
                            }}
                        />
                    </div>
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
        )
    }

    {
        activeTab === 'list' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-xl font-semibold text-zinc-200 flex items-center gap-2">
                        {filterCategory ? (
                            <>
                                <span className="text-zinc-400">Category:</span>
                                <span className="text-indigo-400">{filterCategory}</span>
                                <button onClick={() => setFilterCategory(null)} className="ml-2 text-xs bg-zinc-800 px-2 py-1 rounded-full text-zinc-400 hover:text-white">Clear</button>
                            </>
                        ) : filterTag ? (
                            <>
                                <span className="text-zinc-400">Tag:</span>
                                <span className="text-indigo-400">#{filterTag}</span>
                                <button onClick={() => setFilterTag(null)} className="ml-2 text-xs bg-zinc-800 px-2 py-1 rounded-full text-zinc-400 hover:text-white">Clear</button>
                            </>
                        ) : (
                            offset > 0 ? `Notes (Page ${offset / LIMIT + 1})` : 'All Notes'
                        )}
                    </h2>
                    {offset > 0 && (
                        <button
                            onClick={() => { setOffset(0); listNotes(LIMIT, 0, filterCategory || undefined, filterTag || undefined); }}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                            Back to Start
                        </button>
                    )}
                </div>
                <NoteList
                    notes={allNotes}
                    onDelete={deleteNote}
                    onNoteClick={setSelectedNote}
                    onCategoryClick={handleCategoryClick}
                    onTagClick={handleTagClick}
                    onLoadMore={allNotes.length === LIMIT ? handleLoadMore : undefined}
                    hasMore={allNotes.length === LIMIT}
                />
            </div>
        )
    }

    {
        activeTab === 'add' && (
            <AddNoteForm onAdd={handleAddNote} categories={categories} isProcessing={isIndexing} onAutoCategory={suggestCategory} />
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
            <div className="max-w-2xl mx-auto p-4 md:p-8 flex flex-col min-h-screen">

                {/* Header */}
                <header className="mb-8 text-center space-y-2 relative">
                    <div className="absolute right-0 top-0 hidden md:flex items-center gap-2">
                        <button
                            onClick={() => setShowCategoryManager(true)}
                            className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Manage Categories"
                        >
                            <Folder className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowSyncModal(true)}
                            className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Sync Notes"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>

                    <div
                        onClick={() => {
                            setActiveTab('search');
                            setQuery('');
                            setFilterCategory(null);
                            setFilterTag(null);
                            setSelectedNote(null);
                        }}
                        className="cursor-pointer inline-flex items-center justify-center p-3 bg-zinc-900 rounded-2xl ring-1 ring-zinc-800 shadow-lg shadow-indigo-500/10 mb-4 hover:ring-indigo-500/50 transition-all hover:scale-105 active:scale-95"
                    >
                        <Brain className="w-8 h-8 text-indigo-400" />
                    </div>

                    <h1
                        onClick={() => {
                            setActiveTab('search');
                            setQuery('');
                            setFilterCategory(null);
                            setFilterTag(null);
                            setSelectedNote(null);
                            // URL sync effect will handle the URL update
                        }}
                        className="cursor-pointer text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent flex items-center justify-center gap-4 hover:opacity-80 transition-opacity"
                    >
                        Second Brain
                        <div className="md:hidden flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCategoryManager(true);
                                }}
                                className="p-1 text-zinc-500 hover:text-indigo-400"
                            >
                                <Folder className="w-5 h-5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSyncModal(true);
                                }}
                                className="p-1 text-zinc-500 hover:text-indigo-400"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </h1>
                    <p className="text-zinc-500">
                        Offline Semantic Search Engine
                    </p>

                    <div className="flex flex-col items-center justify-center gap-2 text-xs font-medium mt-4 h-8">
                        <StatusBadge status={status} progress={status === 'error' ? error : progress} />
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col gap-6">

                    {/* Tabs */}
                    <div className="flex p-1 bg-zinc-900/50 rounded-xl ring-1 ring-zinc-800 self-center w-full max-w-md sticky top-4 z-20 backdrop-blur-md">
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
                        <div className="space-y-4">
                            <SearchBar
                                query={query}
                                setQuery={setQuery}
                                isIndexing={isIndexing}
                            />
                            {searchResults.length > 0 ? (
                                <div className="pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <NoteList
                                        notes={searchResults}
                                        onDelete={deleteNote}
                                        onNoteClick={setSelectedNote}
                                        onCategoryClick={(cat) => {
                                            setFilterCategory(cat);
                                            setFilterTag(null);
                                            setActiveTab('list');
                                        }}
                                        onTagClick={(tag) => {
                                            setFilterTag(tag);
                                            setFilterCategory(null);
                                            setActiveTab('list');
                                        }}
                                    />
                                </div>
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
                    )}

                    {activeTab === 'list' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center px-2">
                                <h2 className="text-xl font-semibold text-zinc-200">
                                    {offset > 0 ? `Notes (Page ${offset / LIMIT + 1})` : 'All Notes'}
                                </h2>
                                {offset > 0 && (
                                    <button
                                        onClick={() => { setOffset(0); listNotes(LIMIT, 0); }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                    >
                                        Back to Start
                                    </button>
                                )}
                            </div>
                            <NoteList
                                notes={allNotes}
                                onDelete={deleteNote}
                                onNoteClick={setSelectedNote}
                                onCategoryClick={handleCategoryClick}
                                onTagClick={handleTagClick}
                                onLoadMore={allNotes.length === LIMIT ? handleLoadMore : undefined}
                                hasMore={allNotes.length === LIMIT}
                            />
                        </div>
                    )}

                    {activeTab === 'add' && (
                        <AddNoteForm onAdd={handleAddNote} categories={categories} isProcessing={isIndexing} onAutoCategory={suggestCategory} onAutoTags={generateTags} />
                    )}

                </main>
            </div>

            {showSyncModal && (
                <SyncModal
                    onClose={() => setShowSyncModal(false)}
                    onExport={handleExport}
                    onImport={handleImport}
                    onDownloadDb={exportDatabase}
                    onUploadDb={importDatabase}
                />
            )}

            {showCategoryManager && (
                <CategoryManager
                    categories={categories}
                    onAdd={addCategory}
                    onDelete={deleteCategory}
                    onClose={() => setShowCategoryManager(false)}
                />
            )}
        </div>
    );
}

export default App;
