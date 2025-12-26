import { useEffect } from 'react';

interface UrlSyncParams {
    status: string;
    isUrlInitialized: boolean;
    setIsUrlInitialized: (init: boolean) => void;
    
    // State
    activeTab: 'search' | 'add' | 'list' | 'pinned';
    query: string;
    filterCategory: string | null;
    filterTag: string | null;
    offset: number;
    selectedNote: any | null;

    // Setters
    setActiveTab: (tab: 'search' | 'add' | 'list' | 'pinned') => void;
    setQuery: (q: string) => void;
    setFilterCategory: (c: string | null) => void;
    setFilterTag: (t: string | null) => void;
    setOffset: (o: number) => void;
    setSelectedNote: (n: any | null) => void;

    // Actions
    search: (q: string, limit?: number, offset?: number) => void;
    getNote: (id: number) => Promise<any>;
}

export const useUrlSync = ({
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
}: UrlSyncParams) => {
    
    const LIMIT = 20;

    // URL Sync Initialization
    useEffect(() => {
        if (status === 'ready' && !isUrlInitialized) {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            const q = params.get('q');
            const noteId = params.get('noteId');
            const cat = params.get('cat');
            const tag = params.get('tag');

            if (tab && ['search', 'add', 'list', 'pinned'].includes(tab)) {
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
            // Parse offset
            const offsetParam = params.get('offset');
            if (offsetParam) {
                const parsedOffset = parseInt(offsetParam);
                if (!isNaN(parsedOffset)) {
                    setOffset(parsedOffset);
                    if (q) {
                        search(q, LIMIT, parsedOffset);
                    }
                }
            }

            if (noteId) {
                getNote(parseInt(noteId)).then(note => {
                    if (note) setSelectedNote(note);
                });
            }

            setIsUrlInitialized(true);
        }
    }, [status, isUrlInitialized, setActiveTab, setQuery, setFilterCategory, setFilterTag, setOffset, setSelectedNote, search, getNote, setIsUrlInitialized]);

    // Update URL on state change
    useEffect(() => {
        if (!isUrlInitialized) return;

        const params = new URLSearchParams();
        if (activeTab !== 'search') params.set('tab', activeTab);
        if (query) params.set('q', query);
        if (filterCategory) params.set('cat', filterCategory);
        if (filterTag) params.set('tag', filterTag);
        if (selectedNote) params.set('noteId', selectedNote.id.toString());
        if (offset > 0) params.set('offset', offset.toString());

        const stringified = params.toString();
        const newUrl = stringified ? `?${stringified}` : window.location.pathname;

        window.history.replaceState(null, '', newUrl);
    }, [activeTab, query, selectedNote, filterCategory, filterTag, offset, isUrlInitialized]);
};
