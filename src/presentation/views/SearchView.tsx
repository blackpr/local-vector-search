import { Search, Sparkles } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { NoteList } from '../components/NoteList';

interface SearchViewProps {
  query: string;
  setQuery: (query: string) => void;
  setOffset: (offset: number) => void;
  isIndexing: boolean;
  searchResults: any[];
  offset: number;
  LIMIT: number;
  search: (query: string, limit?: number, offset?: number) => void;
  deleteNote: (id: number) => void;
  setSelectedNote: (note: any) => void;
  setFilterCategory: (cat: string | null) => void;
  setFilterTag: (tag: string | null) => void;
  setActiveTab: (tab: any) => void;
  handlePin: (note: any) => void;
  handleLoadMore: () => void;
}

export const SearchView = ({
  query,
  setQuery,
  setOffset,
  isIndexing,
  searchResults,
  offset,
  LIMIT,
  search,
  deleteNote,
  setSelectedNote,
  setFilterCategory,
  setFilterTag,
  setActiveTab,
  handlePin,
  handleLoadMore
}: SearchViewProps) => {
  return (
    <div className="space-y-4">
      <SearchBar
        query={query}
        setQuery={(q) => {
          setQuery(q);
          setOffset(0); // Reset offset on new search
        }}
        isIndexing={isIndexing}
      />
      {searchResults.length > 0 ? (
        <div className="pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-center px-2 mb-2">
            <h2 className="text-xl font-semibold text-zinc-200">
              {offset > 0 ? `Results (Page ${offset / LIMIT + 1})` : 'Top Results'}
            </h2>
            {offset > 0 && (
              <button
                onClick={() => { setOffset(0); search(query, LIMIT, 0); }}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Back to Start
              </button>
            )}
          </div>
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
            onPin={handlePin}
            onLoadMore={searchResults.length === LIMIT ? handleLoadMore : undefined}
            hasMore={searchResults.length === LIMIT}
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
  );
};
