# Cheat sheet (private, keep off the projector)

One block per technology: **30 seconds** (say this), **Why we use it**, **Why not X** (the follow-up you'll get), **Gotcha**. Items marked **VERIFY** are things I believe but you should check before saying on stage.

## First: it's not TensorFlow.js

The project does **not** use TensorFlow.js. It uses **Transformers.js** (`@huggingface/transformers` in package.json), which runs on **ONNX Runtime Web**. If someone asks about TF.js:

- TensorFlow.js is Google's library for running/training TensorFlow models in JS. It has its own model format.
- We didn't pick it because the models we wanted (EmbeddingGemma, Flan-T5) are published on Hugging Face as ONNX, ready for Transformers.js. With TF.js we'd have to convert them ourselves.
- One-liner: "TF.js is a framework. Transformers.js is a model runner with a huge shelf of ready models. I wanted the shelf."

---

## Transformers.js

- **30 seconds:** Hugging Face's JS port of their Python `transformers` library. `pipeline('feature-extraction', modelId)` downloads a model from the hub and runs it in the browser or Node.
- **Why:** same API as Python, thousands of pre-converted models, WebGPU support.
- **Why not call an API (OpenAI embeddings)?** Privacy (notes never leave the device), works offline, zero per-request cost, no key to leak in frontend code.
- **Gotcha:** it already caches model files in the browser Cache API (`transformers-cache`). My service worker used to keep a second copy of every model file, doubling disk usage. Removed; the service worker now only caches the app shell. Offline cold start was tested with models coming only from `transformers-cache`.

## ONNX and ONNX Runtime Web

- **30 seconds:** ONNX is a neutral file format for neural networks, "the PDF of models". Train in PyTorch, export to ONNX, run anywhere. ONNX Runtime Web is Microsoft's engine that executes those files in a browser.
- **Two backends:** WASM (CPU, works everywhere) and WebGPU (GPU, much faster, Chrome/Edge first). `device: 'auto'` picks.
- **Why not WebLLM / llama.cpp WASM?** Those target chat LLMs. We need an embedding model, which is a Transformers.js sweet spot.

## WebGPU vs WebAssembly

- **WASM:** a compact binary format browsers run at near-native speed. Lets C/C++/Rust code (SQLite, ONNX Runtime) run in a tab. CPU only.
- **WebGPU:** the modern browser API for the GPU, successor to WebGL, designed for compute as well as graphics. This is what makes model inference in a browser fast.
- **Q: "Does it work on Safari/Firefox?"** WASM path works everywhere. WebGPU support is uneven, that's why `auto` with fallback. Say which browser you tested in.

## EmbeddingGemma (onnx-community/embeddinggemma-300m-ONNX)

- **30 seconds:** Google's ~300M parameter embedding model, made for on-device. Input text, output 768 floats. Multilingual (100+ languages, Greek included).
- **Embedding in one sentence:** coordinates for meaning. Texts about similar things land close together.
- **Prefixes:** query = `task: search result | query: `, document = `title: none | text: `. Required by the model card. The model was trained with them.
- **Pooling/normalize:** the model outputs one vector per token; `pooling: 'mean'` averages them into one vector per text; `normalize: true` scales it to length 1.
- **Matryoshka:** the 768 dims can be truncated to 512/256/128 with small quality loss. Cheap win for storage and speed. Not used yet.
- **Weights (good story):** the code used to say `dtype: 'fp32' // SQLite expects float32`. That mixed two things. `dtype` is the precision of the *weights you download*; the *output* vector is float32 either way. Sizes in the ONNX repo: fp32 1235 MB, q8 309 MB, q4 197 MB. Now on `q4` (also the one with WebGPU kernels). All 31 test questions return the same top note with fp32, q8 and q4.
- **Changing weights changes vectors slightly,** so the DB stores `embedding_version` (model + dtype) in a `meta` table and re-embeds every note once when it differs (`ReindexNotesUseCase`).
- **Why not all-MiniLM-L6-v2 (the classic, 23 MB)?** English-centric. My notes are Greek + English.

## LaMini-Flan-T5-77M (tagging)

- **30 seconds:** a tiny instruction-following text-to-text model (Flan-T5-small distilled on instruction data). We prompt `Extract keywords: <note>` and split the output on commas.
- **Why:** smallest thing that can follow an instruction in a browser.
- **Runs as:** q8 weights on WASM (~95 MB; fp32 was ~374 MB). That is the combination Transformers.js defaults to for this kind of model.
- **Gotcha:** README claims it handles Greek. It's mostly English-trained, so Greek tags are likely poor. **VERIFY** before claiming. Manual `#hashtags` are regex-extracted and merged, that part is language-proof.
- **Simpler alternative:** no second model at all. Use the embedding model: embed candidate tags, pick nearest. Saves ~95 MB and one model load.

## SQLite WASM

- **30 seconds:** the real SQLite C source compiled to WebAssembly, officially supported by the SQLite team. Full SQL in the tab. Our `sqlite3.wasm` is 5.9 MB, vendored in `src/vendor/` because it's a custom build with sqlite-vec compiled in.
- **Why not IndexedDB?** Key-value store, no SQL, no joins, no vector functions, clumsy API.
- **Why not PGlite (Postgres in WASM) + pgvector?** Valid alternative. SQLite is smaller, the DB is a single file you can export, and sqlite-vec was the simplest path.
- **Why vendored and not npm?** The npm package `@sqlite.org/sqlite-wasm` doesn't include sqlite-vec. (`vite.config.ts` still has a leftover `optimizeDeps.exclude` for it.)

## OPFS (Origin Private File System)

- **30 seconds:** a private, sandboxed disk per website, part of the File System API. Not visible to the user in Finder, not shared across sites. Supports fast synchronous file access, but only inside workers.
- **Why SQLite needs SharedArrayBuffer here:** SQLite's C code expects blocking file I/O. OPFS APIs are partly async. SQLite's OPFS driver bridges that with a second helper worker (`sqlite3-opfs-async-proxy.js`) and coordinates via SharedArrayBuffer + Atomics.
- **Q: "Can the browser delete my data?"** Yes, under storage pressure, unless the site has persistent storage. The app now calls `navigator.storage.persist()` at startup (the browser may still say no). Hence the export button.
- **Fallback:** if OPFS can't be opened, `DatabaseFactories.ts` falls back to `:memory:`. It used to do that silently; now the worker reports the storage mode and the UI shows an amber "your notes are not being saved" banner.

## COOP / COEP / cross-origin isolation / coi-serviceworker

- **30 seconds:** after Spectre, browsers disabled SharedArrayBuffer unless the page proves it's isolated. Proof = two response headers: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Then `self.crossOriginIsolated === true`.
- **Where set:** `vite.config.ts` (dev), `vercel.json` (prod).
- **coi-serviceworker:** for hosts that can't set headers (GitHub Pages). A service worker intercepts the page's own responses, adds the headers, and reloads once. A hack, but a well-known one.
- **Side effect of COEP:** every cross-origin resource must opt in (CORS/CORP). Hugging Face's CDN does, which is why model downloads still work.

## sqlite-vec

- **30 seconds:** Alex Garcia's SQLite extension for vectors. Pure C, no dependencies, runs anywhere SQLite runs including WASM. Gives `vec0` virtual tables and functions like `vec_distance_L2`, `vec_distance_cosine`.
- **How we use it:** `vec_notes` table (`embedding float[768]`), rowid matches `notes.rowid`. Search = join + `vec_distance_L2` + `ORDER BY`.
- **Gotcha 1:** we do a manual full scan with a scalar function. The idiomatic KNN form is `WHERE embedding MATCH ? AND k = 20`, which lets vec0 do the work in optimized chunks. Both are brute force; sqlite-vec has no ANN index like HNSW. Fine for thousands of notes. **VERIFY** current ANN status if asked.
- **Gotcha 2, the math nugget:** vectors are normalized, so L2 and cosine are linked: `d² = 2 − 2·cos`. Our cutoff `distance < 1.0` means cosine similarity > 0.5. And the UI's "match %" `(1 − d)·100` is pessimistic: d = 0.8 shows "20% match" while cosine is 0.68.
- **Why not a vector DB (Pinecone, Qdrant, Chroma)?** Those are servers. The point is no server.

## Web Worker vs Service Worker

- **Web worker** (`app.worker.ts`): background thread for *our* code. Runs models and SQLite. Lives as long as the tab. Also our composition root (all the `new XUseCase(...)` wiring).
- **Service worker** (`sw.ts`): a programmable network proxy between the page and the internet. Survives tab close. Ours caches the app shell (HTML, JS, CSS, `sqlite3.wasm`, and the ONNX runtime files that Transformers.js loads from cdn.jsdelivr.net), network first, cache as fallback. On the very first visit the page loads before the service worker exists, so `warmAppCache.ts` copies everything already fetched (from both the page and the web worker) into the same cache. Result: one online visit, then cold start with no network. Tested with the server killed and all traffic sent to a dead proxy.
- **Known leftover:** on hosts without COOP/COEP headers, `coi-serviceworker` and `sw.js` both want scope `/`. Untested there. Vercel and the dev server send the headers, so only `sw.js` registers.

## Architecture words (DDD, Pure DI)

- **Layers:** `domain` (interfaces, entities, zero imports) → `application` (use cases) → `infrastructure` (SQLite, Transformers.js) → `presentation` (React).
- **Why bother in a side project?** Swapping the model or the DB touches one file. `VectorService` is an interface; `TransformersVectorService` is one implementation.
- **Pure DI:** no container, just constructors called in order in `app.worker.ts`. Zero bundle cost.
- **If someone says "overkill":** agree cheerfully. "It was also an excuse to see how an AI coding agent handles layered architecture."

## Sync (UUID + last-write-wins)

- Export notes as JSON, import on another device. Match on `uuid`, newer `updated_at` wins. Import re-computes embeddings, so the model must be loaded.
- **Known limit:** LWW loses one side of a true concurrent edit. Fine for one person with two devices.

## Frontend stack (rarely asked)

- **Vite 7:** dev server + bundler. Notable config: `worker.format: 'es'`, `assetsInlineLimit: 0` so the WASM is never base64-inlined.
- **React 19, Tailwind 4, lucide-react, react-markdown.** Standard. URL state sync is a custom hook (`useUrlSync`).

## Numbers to have ready

| Thing | Number |
| --- | --- |
| Embedding dims | 768 |
| Embedding model | ~300M params; 197 MB at q4 (was 1235 MB at fp32) |
| Tagging model | 77M params; ~95 MB at q8 (was ~374 MB at fp32) |
| First-visit download | 317 MB measured (was ~1.6 GB) |
| SQLite WASM | 5.9 MB |
| Distance cutoff | L2 < 1.0 (= cosine > 0.5) |
| Soft delete undo | 10 s |
| Cold start offline (headless test) | ready in ~5 s |

## Hard questions, short answers

- **"How many notes before it's slow?"** "I haven't measured. Brute force over 768 floats is cheap; I'd guess tens of thousands are fine. Measuring is on the list." Don't invent a number.
- **"Is it really private?"** Notes and queries never leave the device. First load fetches app files from Vercel and models from Hugging Face, so those two see an IP address, nothing else.
- **"Why a browser and not Electron/Tauri?"** Zero install, one URL, and the point was to find out how far a tab can go.
- **"Where's the agent?"** There isn't one yet. This is the memory/retrieval tool an agent would call. Keep retrieval local, and think hard before sending retrieved notes to a remote LLM, because that moves the privacy boundary.
- **"Did AI write this?"** Answer truthfully; it's a builders' meetup and that's a good conversation.
