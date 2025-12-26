# Second Brain: Local Vector Search Engine

A privacy-first, offline-capable semantic search engine running entirely in your browser. Built with **React**, **SQLite WASM**, and **Transformers.js**.

## 🎉 Recent Updates

We've just shipped **33+ major features** transforming this into a production-ready application:

- ✅ **Complete DDD Architecture** - Enterprise-grade code organization
- ✅ **Dual AI Models** - Semantic search + auto-tagging (377MB total)
- ✅ **Soft Delete with Undo** - 10-second recovery window
- ✅ **URL Synchronization** - Deep linking for all app states
- ✅ **Manual Sync** - Cross-device synchronization without cloud
- ✅ **Note Pinning** - Keep important notes at the top
- ✅ **Smart Filtering** - Click tags/categories to filter instantly
- ✅ **Service Worker** - True offline capability with model caching
- ✅ **Pagination** - Efficient "Load More" across all views
- ✅ **Multi-language** - Greek, English, and more

## ✨ Key Features

### 🔒 Privacy & Offline-First
-   **100% Private**: No data ever leaves your device. All AI inference and storage happen locally.
-   **Fully Offline**: Works without internet connection after initial model download (~377MB total).
-   **Service Worker Caching**: AI models cached automatically for instant offline access.
-   **OPFS Storage**: High-performance persistent storage using Origin Private File System.
-   **No Tracking**: Zero analytics, no telemetry, no external requests after model download.

### 🤖 AI-Powered Intelligence
-   **Semantic Search**: Find notes by meaning, not just keywords (e.g., "cooking" finds "pasta recipe").
-   **Auto-Tagging**: AI automatically generates relevant tags for your notes using LaMini-Flan-T5-77M.
-   **Smart Categories**: AI-powered category suggestions based on note content.
-   **Dual Embedding Models**: 
    - `EmbeddingGemma-300M` for semantic search
    - `LaMini-Flan-T5-77M` for tag generation
-   **Multi-language Support**: Works with Greek, English, and other languages.

### 📝 Note Management
-   **Rich Text Support**: Markdown rendering with syntax highlighting.
-   **Soft Delete with Undo**: 10-second window to undo accidental deletions.
-   **Note Pinning**: Pin important notes for quick access.
-   **Tag & Category Filtering**: Click any tag or category to filter notes instantly.
-   **URL Synchronization**: Deep linking support - share URLs that preserve app state (search query, filters, selected note, pagination).
-   **Pagination**: Efficient "Load More" pagination for large note collections.

### 🔄 Data Portability
-   **Manual Sync**: Export/import notes as JSON for cross-device synchronization.
-   **Database Export**: Download the entire SQLite database for backup.
-   **Conflict Resolution**: UUID-based merge strategy handles conflicts intelligently.
-   **No Cloud Required**: Serverless, infrastructure-free synchronization.

### 🏗️ Production-Ready Architecture
-   **Domain-Driven Design**: Clean separation of concerns across Domain, Application, Infrastructure, and Presentation layers.
-   **Pure Dependency Injection**: Manual DI for simplicity and bundle size optimization.
-   **Web Workers**: All heavy operations (AI inference, vector search, DB writes) run off the main thread.
-   **Type Safety**: Full TypeScript coverage with strict typing.
-   **Code Quality**: ESLint + Prettier configured for consistent code style.

### ⚡ Performance
-   **60fps UI**: Web Workers ensure smooth, jank-free user experience.
-   **WebGPU / WASM**: Hardware-accelerated AI inference.
-   **Optimized Queries**: Production-ready database indexes for fast searches.
-   **Lazy Loading**: Models download on-demand with progress indicators.
-   **Efficient Pagination**: Load only what you need, when you need it.

## � System Requirements

### Browser Compatibility
-   **Chrome/Edge**: 113+ (recommended for WebGPU support)
-   **Firefox**: 115+ (WASM support)
-   **Safari**: 16.4+ (limited WebGPU support)

### Required Browser Features
-   `SharedArrayBuffer` support (enabled by default in modern browsers)
-   IndexedDB / OPFS for persistent storage
-   Web Workers
-   Service Workers (for offline caching)

### Hardware Recommendations
-   **RAM**: 4GB minimum, 8GB+ recommended
-   **Storage**: 500MB free space for models and database
-   **CPU**: Modern multi-core processor for faster AI inference
-   **GPU**: WebGPU-compatible GPU for hardware acceleration (optional but recommended)

## �📦 Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/local-vector-search.git
    cd local-vector-search
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

    *Note: This project requires `SharedArrayBuffer`. The dev server is configured to send the necessary COOP/COEP headers.*

## � Usage Guide

### Creating Notes
1. Click the **"Add Note"** tab
2. Write your note content (supports markdown)
3. **AI Auto-Tagging**: The system automatically generates relevant tags as you type
4. **AI Category Suggestion**: Click "Suggest Category" for AI-powered categorization
5. Add manual hashtags with `#tag` syntax for instant tagging
6. Click **"Save Note"** to store your note

### Searching Notes
1. Use the **"Search"** tab for semantic search
2. Type your query - the AI finds notes by meaning, not just keywords
3. Results show similarity scores (higher = more relevant)
4. Click any result to view the full note

### Managing Notes
-   **Pin Notes**: Click the pin icon to keep important notes at the top
-   **Filter by Category**: Click any category badge to filter notes
-   **Filter by Tag**: Click any tag to see all notes with that tag
-   **Delete with Undo**: Deleted notes can be restored within 10 seconds via the toast notification
-   **Edit Notes**: Click any note to view/edit in detail view

### URL Synchronization
-   **Share State**: Copy the URL to share your current view (search query, filters, selected note)
-   **Deep Linking**: URLs preserve pagination, active tab, and all filters
-   **Refresh Safe**: Reload the page and return to exactly where you were

### Manual Sync (Cross-Device)
1. Click the **Sync** button in the header
2. **Export Notes**: Download your notes as JSON
3. **Import Notes**: Upload JSON on another device
4. **Conflict Resolution**: UUID-based merging handles duplicates intelligently
5. **Database Backup**: Export the entire SQLite database for full backup

### Category Management
1. Click **"Manage Categories"** in the header
2. Add custom categories for better organization
3. Delete unused categories (notes won't be affected)

### Pagination
-   Click **"Load More"** to view the next page of results
-   Page number is reflected in the URL for easy sharing
-   Works across all tabs (All Notes, Search Results, Pinned Notes)


## �🚀 Deployment (GitHub Pages)

This project relies on `SharedArrayBuffer`, which requires the page to be "cross-origin isolated". GitHub Pages does not support sending the required headers natively.

To solve this, we use `coi-serviceworker`, a production-grade polyfill that reloads the page with a Service Worker to inject the headers client-side.

1.  Build the project:
    ```bash
    npm run build
    ```

2.  Deploy the `dist` folder to GitHub Pages (or use a GH Action).

## 🧠 Technical Details

### AI Models
-   **Semantic Search**: `onnx-community/embeddinggemma-300m-ONNX` (~300MB compressed)
    - Generates 768-dimensional embeddings for semantic similarity search
    - Quantized ONNX format for optimal browser performance
-   **Auto-Tagging**: `Xenova/LaMini-Flan-T5-77M` (~77MB)
    - Text-to-text generation model for extracting keywords
    - Supports multiple languages including Greek
    - Automatically extracts hashtags and generates contextual tags

### Service Worker & Offline Caching
-   **Model Caching**: Service Worker intercepts and caches all HuggingFace model requests
-   **Cache-First Strategy**: Models load instantly from cache after first download
-   **Automatic Updates**: Service Worker updates seamlessly in the background
-   **True Offline**: Once models are cached, the app works 100% offline
-   **Cache Storage**: Separate from OPFS, uses browser's Cache API for model files

### Architecture
The codebase follows **Domain-Driven Design (DDD)** principles:

```
src/
├── domain/              # Pure business logic (entities, interfaces)
│   ├── Note.ts          # Note entity with soft delete support
│   ├── NoteRepository.ts
│   ├── VectorService.ts
│   ├── TaggingSystem.ts
│   └── ...
├── application/         # Use cases (orchestration layer)
│   ├── AddNoteUseCase.ts
│   ├── SearchNotesUseCase.ts
│   ├── DeleteNoteUseCase.ts
│   ├── RestoreNoteUseCase.ts
│   ├── GenerateTagsUseCase.ts
│   ├── ImportDataUseCase.ts
│   └── ...
├── infrastructure/      # Concrete implementations
│   ├── SqliteNoteRepository.ts    # SQLite + sqlite-vec
│   ├── TransformersVectorService.ts
│   ├── TaggingService.ts
│   └── DatabaseFactories.ts
├── presentation/        # UI layer
│   ├── components/
│   ├── views/
│   └── hooks/
└── app.worker.ts        # Composition root (Web Worker)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed architectural documentation.

### Storage & Database
-   **SQLite WASM**: Full SQL database running in the browser
-   **OPFS**: Origin Private File System for persistent storage (`/notes.db`)
-   **sqlite-vec**: Vector extension for L2 distance calculations
-   **Production Indexes**: Optimized indexes on `deletedAt`, `isPinned`, `category`, and `tags`
-   **Soft Delete**: Notes marked as deleted can be restored within 10 seconds

### State Management
-   **URL Synchronization**: Application state (tab, query, filters, pagination, selected note) synced to URL
-   **Deep Linking**: Share URLs that restore exact application state
-   **React Hooks**: Custom hooks (`useWorker`, `useUrlSync`) for clean state management

### Styling
-   **Tailwind CSS v4**: Using the new `@theme` directive and modern engine
-   **Lucide Icons**: Beautiful, consistent iconography
-   **Responsive Design**: Mobile-first approach with adaptive layouts

## 🗺️ Roadmap

Potential future enhancements:

### Testing & Quality
- [ ] Unit tests for domain layer
- [ ] Integration tests for use cases
- [ ] E2E tests with Playwright
- [ ] CI/CD pipeline with GitHub Actions

### Advanced Features
- [ ] Real-time collaboration (WebRTC)
- [ ] Advanced search operators (AND, OR, NOT)
- [ ] Note templates and snippets
- [ ] Bulk operations (multi-select, batch delete)
- [ ] Export to PDF, Markdown files
- [ ] Browser extension for quick capture
- [ ] Mobile app (React Native)

### Performance
- [ ] Incremental indexing
- [ ] Virtual scrolling for large lists
- [ ] Background re-indexing
- [ ] Model quantization improvements

### Optional Cloud Features
- [ ] End-to-end encrypted cloud sync
- [ ] Collaborative workspaces
- [ ] Public note sharing

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

beerware
