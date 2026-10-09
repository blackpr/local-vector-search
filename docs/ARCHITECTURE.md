# System Architecture

## Overview

This project implements a **Local-First Vector Search Engine** running entirely in the browser. It follows **Domain-Driven Design (DDD)** principles to ensure maintainability, testability, and clear separation of concerns.

## Architectural Patterns

### 1. Domain-Driven Design (DDD)
The codebase is stratified into four distinct layers:

-   **Domain** (`src/domain`): The heart of the software. Contains pure business logic, entities (`Note`), and interface definitions (`NoteRepository`, `VectorService`). It has **zero dependencies** on frameworks or infrastructure (no React, no SQLite imports).
-   **Application** (`src/application`): Orchestration layer. Contains **Use Cases** (e.g., `AddNoteUseCase`, `SearchNotesUseCase`) that implement specific user stories by coordinating the Domain and Infrastructure layers.
-   **Infrastructure** (`src/infrastructure`): Concrete implementations of Domain interfaces. This is where "dirty" details live:
    -   `SqliteNoteRepository`: Adapts the generic `NoteRepository` to a specific SQLite WASM implementation.
    -   `TransformersVectorService`: Adapts the generic `VectorService` to the specific `@huggingface/transformers` library.
-   **Presentation** (`src/presentation`): The UI layer.
    -   **React Components**: Dumb UI components that display data.
    -   **Worker**: The "Backend for Frontend". It runs in a Web Worker to keep the UI responsive and acts as the **Composition Root**.

### 2. Dependency Injection (DI) Strategy
We utilize **Pure Dependency Injection** (also known as "Poor Man's DI" or "Manual DI").

**Why Pure DI?**
-   **Simplicity**: No need for complex IOC containers or reflection metadata (`@inject`).
-   **Bundle Size**: Critical for browser performance. Avoids adding extra libraries to the bundle.
-   **Explicitness**: Dependency graphs are statically analyzable and easy to follow.

**How it works**
Dependencies are defined as Interfaces in the Domain layer. Concrete implementations are manually instantiated and injected in the **Composition Root** (`src/app.worker.ts`):

```typescript
// src/app.worker.ts (Composition Root)

// 1. Create Infrastructure (Concrete Implementations)
const { db, storage } = await DatabaseFactory.createDatabase(); // storage: 'opfs' | 'memory'
const vectorService = new TransformersVectorService();          // search AND tagging
const taggingService = new EmbeddingTaggingService(vectorService);
const noteRepository = new SqliteNoteRepository(db);

// 2. Inject into Application (Use Cases)
const addNoteUseCase = new AddNoteUseCase(noteRepository, noteRepository, vectorService, taggingService); // tags + embed + save on Save (the repository is also the SearchService)
const updateNoteUseCase = new UpdateNoteUseCase(noteRepository, vectorService); // re-embeds on text change
const searchNotesUseCase = new SearchNotesUseCase(noteRepository, vectorService);
```

### 3. Asynchronous Worker Architecture
To ensure a "jank-free" experience (60fps), all heavy lifting (AI inference, Vector Search, DB writes) is offloaded to a **Web Worker**.

-   The **Main Thread** (React) handles UI rendering and user input.
-   The **Worker Thread** handles logic.
-   Communication happens via a strongly-typed message passing system (`WorkerMessage`, `WorkerResponse`).
-   A separate **Service Worker** (`src/sw.ts`) caches the app shell so the app cold-starts offline. Model files are cached by Transformers.js itself.
-   **Several tabs**: each tab runs its own worker (and its own copy of the model) against the same OPFS database. After a write, `useWorker` posts on a `BroadcastChannel` (`latent-db-changes`); the other tabs bump `dataVersion` and re-run their current list, search and open note. Nothing is re-embedded: `SearchNotesUseCase` reuses the vector of the last question.

### 4. Derived Data Rules
-   A note's vector is derived from its text. `UpdateNoteUseCase` recomputes it when the text changes, and the repository writes text and vector in one transaction.
-   Vectors are only comparable with vectors from the same model and weight precision, so the database stores an `embedding_version`. `ReindexNotesUseCase` re-embeds everything once when it changes.
-   The embedding model runs a two-sentence sanity check after loading and falls back from WebGPU to WASM if the output is degenerate.

### 5. Search
-   Search is sqlite-vec's KNN query (`WHERE embedding MATCH ? AND k = ?` on the `vec0` table), joined to `notes`. It is brute force (no ANN index), done inside sqlite-vec in optimized chunks: about 23 ms for 50,000 notes on an M4 Pro, versus 587 ms when computing `vec_distance_L2` on every row.
-   `vec0` can't see `deleted_at`, so `k = offset + limit + (notes in the trash)`, capped at 4096 (sqlite-vec's maximum). That keeps every page identical to a full scan.
-   Results at L2 distance 1.0 or more (cosine similarity 0.5 or less) are dropped.
-   Timestamps are stored as ISO 8601 UTC (`2026-10-09T13:00:00.000Z`) everywhere; older rows with SQLite's `CURRENT_TIMESTAMP` format are converted once at startup, because lists sort by `created_at` as text.

## Directory Structure
```
src/
├── domain/           # Pure Logic (Entities, Interfaces)
├── application/      # Use Cases (AddNote, Search, etc.)
├── infrastructure/   # Implementations (SQLite, Transformers)
├── presentation/     # UI (React Components)
├── hooks/            # React Hooks (useWorker, useUrlSync)
├── offline/          # App-shell cache warm-up shared by page, worker and service worker
├── app.worker.ts     # Web Worker: Entry Point & Composition Root
└── sw.ts             # Service Worker: offline app shell
```
