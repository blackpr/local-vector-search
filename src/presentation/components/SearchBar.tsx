import { Search, Loader2 } from 'lucide-react';

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  isIndexing: boolean;
  results: any[];
}

export function SearchBar({ query, setQuery, isIndexing }: Omit<SearchBarProps, 'results'>) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 group-focus-within:opacity-50 transition duration-500 blur"></div>
        <div className="relative flex items-center bg-zinc-900 rounded-xl">
          <Search className="w-5 h-5 text-zinc-500 ml-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your mind..."
            className="w-full bg-transparent border-none focus:ring-0 outline-none text-lg p-4 placeholder:text-zinc-600 text-zinc-200"
            autoFocus
          />
          {isIndexing && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mr-4" />}
        </div>
      </div>
    </div>
  );
}
