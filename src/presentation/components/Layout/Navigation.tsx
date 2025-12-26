import { Search, List, Pin, Plus } from 'lucide-react';
import clsx from 'clsx';

interface NavigationProps {
  activeTab: 'search' | 'add' | 'list' | 'pinned';
  setActiveTab: (tab: 'search' | 'add' | 'list' | 'pinned') => void;
  setOffset: (offset: number) => void;
}

export const Navigation = ({ activeTab, setActiveTab, setOffset }: NavigationProps) => {
  return (
    <div className="flex p-1 bg-zinc-900/50 rounded-xl ring-1 ring-zinc-800 self-center w-full max-w-md sticky top-4 z-20 backdrop-blur-md">
      <button
        onClick={() => { setActiveTab('search'); setOffset(0); }}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
          activeTab === 'search' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
        )}
      >
        <Search className="w-4 h-4" /> Search
      </button>
      <button
        onClick={() => { setActiveTab('list'); setOffset(0); }}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
          activeTab === 'list' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
        )}
      >
        <List className="w-4 h-4" /> All
      </button>
      <button
        onClick={() => { setActiveTab('pinned'); setOffset(0); }}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
          activeTab === 'pinned' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
        )}
      >
        <Pin className="w-4 h-4" /> Pinned
      </button>
      <button
        onClick={() => { setActiveTab('add'); setOffset(0); }}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all",
          activeTab === 'add' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
        )}
      >
        <Plus className="w-4 h-4" /> Add
      </button>
    </div>
  );
};
