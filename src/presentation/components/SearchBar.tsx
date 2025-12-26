import { Search, Loader2, Sparkles } from 'lucide-react';

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  isIndexing: boolean;
  results: any[];
}

export function SearchBar({ query, setQuery, isIndexing, results }: SearchBarProps) {
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

      <div className="space-y-3">
        {results.length > 0 ? (
          results.map((result, i) => (
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
  );
}
