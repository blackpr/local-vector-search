---
theme:
  override:
    default:
      margin:
        percent: 4
    slide_title:
      padding_top: 0
      padding_bottom: 1
    code:
      minimum_margin:
        fixed: 0
      padding:
        horizontal: 1
        vertical: 0
---

<!-- jump_to_middle -->
<!-- alignment: center -->

# SELECT * FROM my_brain

AI in a browser tab. No backend. No API key. No Wi-Fi.

Tim · AI Builders SKG

License: beerware · `LICENSE`

<!-- end_slide -->

1 · Ask my brain anything
===

This is **Latent**. A notes app that searches by meaning.

I can't remember what half my stack does.
So I wrote it down. In the app.

**You ask. My notes answer.**

<!-- end_slide -->

2 · What just happened
===

```
┌─────────────────────── one browser tab ────────────────────────┐
│  MAIN THREAD              WEB WORKER                           │
│  ┌──────────┐ postMessage ┌──────────────────────────────────┐ │
│  │ React UI │ ──────────▶ │ use cases (AddNote, Search, ...) │ │
│  │          │ ◀────────── │   │                 │            │ │
│  └──────────┘             │   ▼                 ▼            │ │
│                           │ Transformers.js   SQLite WASM    │ │
│                           │ (ONNX Runtime)    + sqlite-vec   │ │
│                           │ WebGPU or WASM      │            │ │
│                           └─────────────────────┼────────────┘ │
│                                                 ▼              │
│  SERVICE WORKER                          OPFS: /notes.db       │
│  keeps the app itself available offline                        │
└────────────────────────────────────────────────────────────────┘
```

your question → **768 numbers** → nearest notes → back to the screen

`src/hooks/useWorker.ts:39` · `src/app.worker.ts:102`

<!-- end_slide -->

<!-- jump_to_middle -->

3 · The tour
===

**What is it · Why is it here · What did it cost me**

<!-- end_slide -->

Stop 1 · Transformers.js
===

Hugging Face models, in JavaScript, in the browser.

The whole model integration: one file, one `pipeline()` call

`src/infrastructure/TransformersVectorService.ts:66`

> Not TensorFlow.js. TF.js is a framework. This is a runner with a giant shelf of ready models. I wanted the shelf.

<!-- end_slide -->

Stop 2 · EmbeddingGemma
===

Text in → **768 numbers** out. 300M parameters. 100+ languages.

It has rules: queries and notes get different prefixes

`src/infrastructure/TransformersVectorService.ts:18`

Forget them → nothing crashes → results quietly get worse.

<!-- end_slide -->

Stop 2 · It also writes the tags
===

**Except it can't write.**

```
every word in the note   →  a candidate tag
embed the note + every candidate
closest candidates       →  the tags
```

It can't write words. It can *measure* them.

`src/infrastructure/EmbeddingTaggingService.ts:12`

<!-- end_slide -->

Stop 3 · SQLite, compiled to WebAssembly
===

The real SQLite, built for the browser by the SQLite team. Joins, indexes, transactions. In a tab.

```
$ ls -lh src/vendor
sqlite3-opfs-async-proxy.js   21K
sqlite3.mjs                  699K
sqlite3.wasm                 5.6M
```

A database engine smaller than most hero images.

Notes and vectors, one file: `src/infrastructure/SqliteNoteRepository.ts:16`

<!-- end_slide -->

Stop 4 · OPFS and the header saga
===

```
I want my notes to survive a refresh
  └─ needs OPFS  (a private disk per website)
       └─ SQLite's OPFS driver needs SharedArrayBuffer
            └─ browsers only allow that on "cross-origin isolated" pages
                 └─ needs two HTTP headers (COOP + COEP)
                      └─ GitHub Pages can't send custom headers
                           └─ so a service worker fakes them
```

Where it lands: `src/infrastructure/DatabaseFactories.ts:18`

`vite.config.ts:12` · `vercel.json` · the hack: `index.html:11`

<!-- end_slide -->

Stop 5 · sqlite-vec
===

A SQLite extension by Alex Garcia: a vector column type, plus functions that measure distance.

Vector search is a `SELECT`.

The query: `src/infrastructure/SqliteNoteRepository.ts:495`

The cutoff: `src/infrastructure/SqliteNoteRepository.ts:522`

First version: the distance to every row, computed by hand, 587 ms at 50,000 notes. Now sqlite-vec's own nearest-neighbour search: 23 ms. Same results.

<!-- end_slide -->

<!-- jump_to_middle -->

Stop 5 · The "87% match" badge
===

`(1 - distance) * 100`

`src/presentation/components/NoteList.tsx:83`

It looks like confidence. I made it up.

<!-- end_slide -->

Stop 6 · The web worker
===

A 300M-parameter model on the main thread freezes every button.

In a worker, the UI never notices.

The price: everything becomes messages.

`src/presentation/worker/WorkerMessages.ts`

React sends `src/hooks/useWorker.ts:131`

→ the worker answers `src/app.worker.ts:148`

<!-- end_slide -->

4 · Stump the model
===

Your job: make my search look stupid.

| Try | |
| --- | --- |
| another language | Greek? Greeklish? |
| typos | `why nt indexdb` |
| emoji | 🍺🍽️ |
| negation | `anything except sqlite` |
| nonsense | `asdfghjkl` |
| your idea | ... |

<!-- end_slide -->

<!-- jump_to_middle -->

5 · Three things this project taught me
===

<!-- end_slide -->

A vector is derived data
===

Edit the text, forget the vector → search finds the *old* note.

Nobody blames the cache. Everybody blames the model.

Re-embed on edit: `src/application/UpdateNoteUseCase.ts:21`

Text + vector, one transaction: `src/infrastructure/SqliteNoteRepository.ts:235`

Tag vectors with the model that made them: `src/application/ReindexNotesUseCase.ts:17`

<!-- end_slide -->

One word cost a gigabyte
===

```
dtype: 'fp32'   →   1235 MB model
dtype: 'q4'     →    197 MB model      same results on my test set
```

The word: `src/infrastructure/TransformersVectorService.ts:16`

`dtype` = how many bits per number in the model file you **download**.
What comes **out** is float32 either way.

<!-- end_slide -->

One word cost a gigabyte · sequel
===

4-bit on the CPU: correct. 4-bit on my GPU: junk, silently.

So the model now takes a two-sentence exam at startup and gets demoted to CPU if it fails.

`src/infrastructure/TransformersVectorService.ts:78`

Not just my Mac: transformers.js issue #1728.
Fixed in v4: tested here, GPU = CPU to three decimals.

<!-- end_slide -->

"Offline" is three promises
===

| Promise | Kept by |
| --- | --- |
| search in an open tab | the model, already in memory |
| notes survive a restart | OPFS, and a loud warning when it's missing |
| launch with no network | service worker + cache warm-up |

The warning: `src/App.tsx:274`

Service worker: `src/sw.ts:26` · warm-up: `src/offline/warmAppCache.ts:21`

<!-- end_slide -->

Wrap-up
===

1. The browser is a serious runtime. Database, GPU, file system, model runner. One URL.
2. Local AI moves the cost. I pay zero per token. Users pay in megabytes and battery.
3. Calling the model is one line. Everything interesting, and every bug, was ordinary engineering around it.

**Next:**

- `search_notes(query)` as a tool → an agent's private, offline memory
- EmbeddingGemma 2 (out since 6 Oct): text, photos, voice, video in **one** space → snap the whiteboard, search it later by what's on it

<!-- end_slide -->

<!-- jump_to_middle -->
<!-- alignment: center -->

`github.com/blackpr/local-vector-search` · beerware · the bar is that way

Tim · `linkedin.com/in/tim-pap`
