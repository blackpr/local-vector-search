import { useState, useEffect } from 'react';
import { useWorker } from './hooks/useWorker';
import { useUrlSync } from './hooks/useUrlSync';
import { NoteDetail } from './presentation/components/NoteDetail';
import { SyncModal } from './presentation/components/SyncModal';
import { CategoryManager } from './presentation/components/CategoryManager';
import { Toast } from './presentation/components/Toast';
import { AppLayout } from './presentation/components/Layout/AppLayout';
import { Header } from './presentation/components/Layout/Header';
import { Navigation } from './presentation/components/Layout/Navigation';
import { SearchView } from './presentation/views/SearchView';
import { NoteListView } from './presentation/views/NoteListView';
import { AddNoteView } from './presentation/views/AddNoteView';

function App() {
    const { status, error, searchResults, allNotes, categories, addNote, search, listNotes, deleteNote, restoreNote, updateNote, listCategories, addCategory, deleteCategory, isIndexing, progress, exportNotes, importNotes, exportDatabase, importDatabase, suggestCategory, generateTags, getNote } = useWorker();

    // UI State
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'search' | 'add' | 'list' | 'pinned'>('search');
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [isUrlInitialized, setIsUrlInitialized] = useState(false);

    // Selected Note / Routing
    const [selectedNote, setSelectedNote] = useState<any | null>(null);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    // Filters
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [filterTag, setFilterTag] = useState<string | null>(null);

    // Pagination
    const [offset, setOffset] = useState(0);
    const LIMIT = 20;

    // Toast state for undo delete
    const [deletedNoteId, setDeletedNoteId] = useState<number | null>(null);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [toastTimeoutId, setToastTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // URL Sync Hook
    useUrlSync({
        status,
        isUrlInitialized,
        setIsUrlInitialized,
        activeTab,
        query,
        filterCategory,
        filterTag,
        offset,
        selectedNote,
        setActiveTab,
        setQuery,
        setFilterCategory,
        setFilterTag,
        setOffset,
        setSelectedNote,
        search,
        getNote
    });

    // Debounce search
    useEffect(() => {
        if (!isUrlInitialized) return;
        const timer = setTimeout(() => {
            search(query, LIMIT, offset);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, offset, search, isUrlInitialized]);

    // Initial Load & Tab Change
    useEffect(() => {
        if (!isUrlInitialized) return;

        if (activeTab === 'list' && !isIndexing) {
            listNotes(LIMIT, offset, filterCategory || undefined, filterTag || undefined);
        } else if (activeTab === 'pinned' && !isIndexing) {
            listNotes(LIMIT, offset, undefined, undefined, true);
        }
        // Load categories on start
        listCategories();
    }, [activeTab, listNotes, listCategories, isIndexing, filterCategory, filterTag, isUrlInitialized, offset]);

    // Handlers
    const handleLoadMore = () => {
        const newOffset = offset + LIMIT;
        setOffset(newOffset);
        if (activeTab === 'search') {
            search(query, LIMIT, newOffset);
        }
        // For 'list', useEffect triggers listNotes
    };

    const handleAddNote = (text: string, category: string, tags: string[]) => {
        addNote(text, category, tags);
        setOffset(0);
        setActiveTab('list');
    };

    const handleCategoryClick = (category: string | null) => {
        setFilterCategory(category === filterCategory ? null : category);
        setFilterTag(null);
        setOffset(0);
        setActiveTab('list');
    };

    const handleTagClick = (tag: string | null) => {
        setFilterTag(tag === filterTag ? null : tag);
        setFilterCategory(null);
        setOffset(0);
        setActiveTab('list');
    };

    const handlePin = (note: any) => {
        updateNote(note.id, note.text, note.category, note.tags, !note.isPinned);
        // Refresh list if we are in Pinned view, might need to wait for update
        if (activeTab === 'pinned') {
            // listNotes will be called? No, updateNote probably updates local state inside worker/useWorker, 
            // but we might need to re-fetch to be sure or useWorker updates 'allNotes' automatically via events.
        }
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

    const handleReset = () => {
        setActiveTab('search');
        setQuery('');
        setFilterCategory(null);
        setFilterTag(null);
        setSelectedNote(null);
        setOffset(0);
    };

    // Delete with undo functionality
    const handleDeleteWithUndo = (id: number) => {
        // Clear any existing toast timeout
        if (toastTimeoutId) {
            clearTimeout(toastTimeoutId);
        }

        // Perform the delete
        deleteNote(id);
        setDeletedNoteId(id);
        setShowUndoToast(true);

        // Auto-dismiss after 10 seconds
        const timeoutId = setTimeout(() => {
            setShowUndoToast(false);
            setDeletedNoteId(null);
            setToastTimeoutId(null);
        }, 10000);
        setToastTimeoutId(timeoutId);
    };

    const handleUndo = () => {
        if (deletedNoteId) {
            // Clear the timeout
            if (toastTimeoutId) {
                clearTimeout(toastTimeoutId);
                setToastTimeoutId(null);
            }

            // Restore the note
            restoreNote(deletedNoteId);
            setShowUndoToast(false);
            setDeletedNoteId(null);

            // Refresh current view
            if (activeTab === 'list') {
                listNotes(LIMIT, offset, filterCategory || undefined, filterTag || undefined);
            } else if (activeTab === 'search') {
                search(query, LIMIT, offset);
            } else if (activeTab === 'pinned') {
                listNotes(LIMIT, offset, undefined, undefined, true);
            }
        }
    };

    const handleDismissToast = () => {
        if (toastTimeoutId) {
            clearTimeout(toastTimeoutId);
            setToastTimeoutId(null);
        }
        setShowUndoToast(false);
        setDeletedNoteId(null);
    };

    // If viewing a note detail
    if (selectedNote) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <NoteDetail
                        note={selectedNote}
                        onBack={() => {
                            setSelectedNote(null);
                            listNotes(LIMIT, offset, filterCategory || undefined, filterTag || undefined);
                        }}
                        onDelete={(id) => {
                            handleDeleteWithUndo(id);
                            setSelectedNote(null);
                            listNotes(LIMIT, offset, filterCategory || undefined, filterTag || undefined);
                        }}
                        onSave={async (id, text, category, tags) => {
                            updateNote(id, text, category, tags);
                            setSelectedNote(null);
                            listNotes(LIMIT, offset, filterCategory || undefined, filterTag || undefined);
                        }}
                        onAutoTags={generateTags}
                    />
                </div>
            </div>
        );
    }

    return (
        <AppLayout>
            <Header
                status={status}
                progress={progress}
                error={error}
                onShowCategoryManager={() => setShowCategoryManager(true)}
                onShowSyncModal={() => setShowSyncModal(true)}
                onReset={handleReset}
            />

            <Navigation
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setOffset={setOffset}
            />

            {status === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm my-4">
                    {error || 'An error occurred'}
                </div>
            )}

            <main className="flex-1 flex flex-col gap-6 mt-6">
                {activeTab === 'search' && (
                    <SearchView
                        query={query}
                        setQuery={setQuery}
                        setOffset={setOffset}
                        isIndexing={isIndexing}
                        searchResults={searchResults}
                        offset={offset}
                        LIMIT={LIMIT}
                        search={search}
                        deleteNote={handleDeleteWithUndo}
                        setSelectedNote={setSelectedNote}
                        setFilterCategory={handleCategoryClick}
                        setFilterTag={handleTagClick}
                        setActiveTab={setActiveTab}
                        handlePin={handlePin}
                        handleLoadMore={handleLoadMore}
                    />
                )}

                {activeTab === 'list' && (
                    <NoteListView
                        title={
                            filterCategory ? (
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
                            )
                        }
                        notes={allNotes}
                        offset={offset}
                        onResetOffset={() => { setOffset(0); listNotes(LIMIT, 0); }}
                        onDelete={handleDeleteWithUndo}
                        onNoteClick={setSelectedNote}
                        onCategoryClick={handleCategoryClick}
                        onTagClick={handleTagClick}
                        onPin={handlePin}
                        onLoadMore={handleLoadMore}
                        hasMore={allNotes.length === LIMIT}
                    />
                )}

                {activeTab === 'pinned' && (
                    <NoteListView
                        title={offset > 0 ? `Pinned Notes (Page ${offset / LIMIT + 1})` : 'Pinned Notes'}
                        notes={allNotes.filter(n => n.isPinned)}
                        offset={offset}
                        onResetOffset={() => { setOffset(0); listNotes(LIMIT, 0, undefined, undefined, true); }}
                        onDelete={handleDeleteWithUndo}
                        onNoteClick={setSelectedNote}
                        onCategoryClick={handleCategoryClick}
                        onTagClick={handleTagClick}
                        onPin={handlePin}
                        onLoadMore={handleLoadMore}
                        hasMore={allNotes.length === LIMIT}
                    />
                )}

                {activeTab === 'add' && (
                    <AddNoteView
                        onAdd={handleAddNote}
                        categories={categories}
                        isProcessing={isIndexing}
                        onAutoCategory={suggestCategory}
                        onAutoTags={generateTags}
                    />
                )}
            </main>

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

            {showUndoToast && (
                <Toast
                    message="Note deleted"
                    onUndo={handleUndo}
                    onDismiss={handleDismissToast}
                />
            )}
        </AppLayout>
    );
}

export default App;
