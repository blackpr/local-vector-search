# SELECT * FROM my_brain

### AI in a browser tab. No backend. No API key. No Wi-Fi.

Tim · AI Builders SKG

&nbsp;

License: [beerware](../../LICENSE)

&nbsp;

---

&nbsp;

# 1 · Ask my brain anything

This is **Latent**. A notes app that searches by meaning.

I can't remember what half my stack does.
So I wrote it down. In the app.

**You ask. My notes answer.**

&nbsp;

---

&nbsp;

# 2 · What just happened

```
┌──────────────────────────── one browser tab ────────────────────────────┐
│                                                                          │
│  MAIN THREAD                     WEB WORKER                              │
│  ┌──────────────┐  postMessage   ┌────────────────────────────────────┐  │
│  │ React UI     │ ─────────────▶ │ use cases (AddNote, Search, ...)   │  │
│  │              │ ◀───────────── │   │                     │          │  │
│  └──────────────┘                │   ▼                     ▼          │  │
│                                  │ Transformers.js     SQLite WASM    │  │
│                                  │ (ONNX Runtime)      + sqlite-vec   │  │
│                                  │ WebGPU or WASM          │          │  │
│                                  └─────────────────────────┼──────────┘  │
│                                                            ▼             │
│  SERVICE WORKER                                      OPFS: /notes.db     │
│  keeps the app itself available offline                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

your question → **768 numbers** → nearest notes → back to the screen

[useWorker.ts](../../src/hooks/useWorker.ts#L21) · [app.worker.ts](../../src/app.worker.ts#L102)

&nbsp;

---

&nbsp;

# 3 · The tour

**What is it · Why is it here · What did it cost me**

&nbsp;

## Stop 1 · Transformers.js

Hugging Face models, in JavaScript, in the browser.

The whole AI integration: [about 25 lines](../../src/infrastructure/TransformersVectorService.ts#L28)

> Not TensorFlow.js. TF.js is a framework. This is a runner with a giant shelf of ready models. I wanted the shelf.

&nbsp;

## Stop 2 · EmbeddingGemma

Text in → **768 numbers** out. 300M parameters. 100+ languages.

It has rules: [queries and notes get different prefixes](../../src/infrastructure/TransformersVectorService.ts#L46)

Forget them → nothing crashes → results quietly get worse.

&nbsp;

**It also writes the tags. Except it can't write.**

```
every word in the note   →  a candidate tag
embed the note + every candidate
closest candidates       →  the tags
```

It can't write words. It can *measure* them. [The code](../../src/infrastructure/EmbeddingTaggingService.ts#L32)

&nbsp;

## Stop 3 · SQLite, compiled to WebAssembly

The real SQLite. Joins, indexes, transactions. In a tab.

```
$ ls -lh public/assets/sqlite3.wasm
5.9M
```

A database engine smaller than most hero images.

&nbsp;

## Stop 4 · OPFS and the header saga

```
I want my notes to survive a refresh
  └─ needs OPFS  (a private disk per website)
       └─ SQLite's OPFS driver needs SharedArrayBuffer
            └─ browsers only allow that on "cross-origin isolated" pages
                 └─ needs two HTTP headers (COOP + COEP)
                      └─ GitHub Pages can't send custom headers
                           └─ so a service worker fakes them
```

[vite.config.ts](../../vite.config.ts#L12) · [vercel.json](../../vercel.json) · [the hack](../../index.html#L11)

&nbsp;

## Stop 5 · sqlite-vec

Vector search is a `SELECT`.

[The query](../../src/infrastructure/SqliteNoteRepository.ts#L486) · [the cutoff](../../src/infrastructure/SqliteNoteRepository.ts#L501)

And the "87% match" badge? [`(1 - distance) * 100`](../../src/presentation/components/NoteList.tsx#L83)

It looks like confidence. I made it up.

&nbsp;

## Stop 6 · The web worker

A 300M-parameter model on the main thread freezes every button.

In a worker, the UI never notices.

The price: [everything becomes messages](../../src/presentation/worker/WorkerMessages.ts).

&nbsp;

---

&nbsp;

# 4 · Stump the model

Your job: make my search look stupid.

| Try | |
| --- | --- |
| another language | Greek? Greeklish? |
| typos | `why nt indexdb` |
| emoji | 🍺🍽️ |
| negation | `anything except sqlite` |
| nonsense | `asdfghjkl` |
| your idea | ... |

&nbsp;

---

&nbsp;

# 5 · Three things this project taught me

&nbsp;

## A vector is derived data

Edit the text, forget the vector → search finds the *old* note.

Nobody blames the cache. Everybody blames the model.

[re-embed on edit](../../src/application/UpdateNoteUseCase.ts#L21) · [text + vector, one transaction](../../src/infrastructure/SqliteNoteRepository.ts#L226) · [tag vectors with the model that made them](../../src/application/ReindexNotesUseCase.ts#L17)

&nbsp;

## One word cost a gigabyte

```
dtype: 'fp32'   →   1235 MB model
dtype: 'q4'     →    197 MB model      same results on my test set
```

[The word](../../src/infrastructure/TransformersVectorService.ts#L10). `dtype` = how many bits per number in the model file you **download**. What comes **out** is float32 either way.

&nbsp;

**Sequel:** 4-bit on the CPU: correct. 4-bit on my GPU: junk, silently.

So the model now [takes a two-sentence exam at startup](../../src/infrastructure/TransformersVectorService.ts#L72) and gets demoted to CPU if it fails.

&nbsp;

## "Offline" is three promises

| Promise | Kept by |
| --- | --- |
| search in an open tab | the model, already in memory |
| notes survive a restart | OPFS ([and a loud warning when it's missing](../../src/App.tsx#L255)) |
| launch with no network | [service worker](../../src/sw.ts#L26) + [cache warm-up](../../src/offline/warmAppCache.ts#L21) |

&nbsp;

---

&nbsp;

# Wrap-up

1. The browser is a serious runtime. Database, GPU, file system, model runner. One URL.
2. Local AI moves the cost. I pay zero per token. Users pay in megabytes and battery.
3. The AI was 25 lines. Everything interesting was ordinary engineering around it.

&nbsp;

**Next:** `search_notes(query)` as a tool → an agent's private, offline memory.

&nbsp;

`github.com/blackpr/local-vector-search` · beerware · the bar is that way
