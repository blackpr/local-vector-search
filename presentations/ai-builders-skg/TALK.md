# Speaker notes · SELECT * FROM my_brain

**Private. This is the iPad file. The projector shows SCREEN.md.**
About 25 minutes. Everything you need on stage is in this one file, including what every piece of code you open actually does. There are no links on purpose: a tap on the iPad would take you away from your notes.

## Setup on stage

- **Laptop → projector.** Three windows, switched with `Cmd+Tab`:
  - VS Code: `SCREEN.md` in preview (`Cmd+Shift+V`), zoomed until the back row can read it, Zen mode (`Cmd+K Z`). Code files open from the links in it.
  - Browser: Latent open, green **System Ready**, the 38 notes from `talk-brain.json` imported, zoom 150%.
  - Terminal in the repo, big font. Used once, at stop 3.
- **iPad:** this file. Nothing else.
- `CHEATSHEET.md` is homework for the week before, not for the stage. The questions you're likely to get are in the **IF ASKED** lines below.

**The safety net:** the app is loaded with notes that explain its own stack. When you blank on "what's ONNX again?", you search it on stage. It looks like a demo. It's also your cheat sheet.

**How each code moment works:** you click the link in SCREEN.md, VS Code opens the file at that line, you point at the lines named here, then `Cmd+W` takes you back to the screen. If a link misses: `Cmd+P`, type the filename, Enter, then `Ctrl+G` and the line number. Under every **ON SCREEN** below you'll find the code as the projector shows it, then **WHAT IT DOES** in plain words. That part is for you; you don't have to say it.

| # | Screen section | Min |
| --- | --- | --- |
| 0 | Title | 1 |
| 1 | Ask my brain anything | 5 |
| 2 | What just happened | 2 |
| 3 | The tour, six stops | 8 |
| 4 | Stump the model | 4 |
| 5 | Three things this project taught me | 4 |
| 6 | Wrap-up | 1 |

---

## 0 · Title (1 min)

**DO** Before a word: turn the laptop's Wi-Fi off where they can see it. Click the beerware link.

**SAY** Two things. This laptop is now offline and stays that way. And this project is beerware: if you like it you owe me a beer. You're all holding one, so we're off to a good start. No slides tonight, this markdown file and the repo are the talk. Interrupt me whenever.

## 1 · Ask my brain anything (5 min)

**DO** Switch to Latent.

**SAY** I built this and I still can't remember what half the stack does. So I wrote it down, in the app. You ask, my notes answer. Badly phrased questions are better.

If the room is shy, these all passed testing:

| Type | Comes back |
| --- | --- |
| `why not just use indexeddb` | SQLite vs IndexedDB |
| `what are those weird cross origin headers` | COOP/COEP |
| `why is it called latent` | the name |
| `where do we eat after the beers` | the note written **in Greek** about bougatsa |
| `the weather in london tomorrow` | nothing, correctly |

**SAY** (Greek note) I asked in English, the note is Greek, they share zero words. Both land in the same space of meaning. That's an embedding. That's also the name: latent means hidden, and that hidden space is called the latent space.

**SAY** (London) No answer is a feature. It says nothing instead of something random.

**SAY** And the Wi-Fi is still off. A 300M-parameter model read your question in this tab. The rest of the talk is how.

> Running gag for the rest of the night: any question from the room, **search it first, answer second.**

## 2 · What just happened (2 min)

**No code in this section.** Don't click the two links under the diagram; the worker code comes at stop 6. Point along the diagram with the mouse and follow one search:

1. You type a question. The **React UI** lives on the **main thread**, the one that draws the page and handles clicks.
2. React doesn't search. It sends a `postMessage` to the **web worker**, a second thread in the same tab.
3. In the worker, **Transformers.js** runs the model on the question and gets 768 numbers back.
4. **SQLite** with **sqlite-vec** compares those numbers with the numbers stored for every note, in `notes.db`, which lives in **OPFS**.
5. The closest notes go back to React as another message, and React draws them.

**SAY** One search: React posts a message, the worker embeds the query into 768 numbers, SQLite sorts notes by distance, results come back. The UI thread never touches the model.

**SAY** Two things are called "worker" and have nothing in common. The web worker computes. The service worker is a network proxy that keeps the app available offline. (Point at the service worker box: it's not part of a search at all.)

**IF ASKED** about the two links under the diagram:
- `useWorker.ts:26`, `worker = new WorkerModule.default()`. That line starts the second thread. Line 24 loads the worker file; the `?worker` on its name tells Vite to package it as a separate script.
- `app.worker.ts:102`, lines 102-114. Every part of the app being built, each handed the pieces it needs, e.g. `new SearchNotesUseCase(noteRepository, vectorService)`. No framework, just constructors called in order.

## 3 · The tour (8 min)

Every stop has the same three beats, printed on screen: **what is it, why is it here, what did it cost me.** Start with the *what*, in plain words: half the room has never heard of these projects. Then open the code for ten seconds, then come back.

Point only at the lines listed. Some lines in these files belong to round 5; scrolling past them spoils it.

Budget: Transformers.js 1 · EmbeddingGemma 2½ · SQLite 1 · OPFS 1½ · sqlite-vec 1½ · worker ¾.

### Stop 1 · Transformers.js (1 min)

**WHAT** A JavaScript library from Hugging Face that runs AI models in the browser (or Node). It's the JS twin of their Python `transformers` library: same `pipeline()` function, same model names. Underneath, it hands the model to ONNX Runtime Web, Microsoft's engine that runs models on the GPU (WebGPU) or the CPU (WebAssembly).

**WHY HERE** Hugging Face hosts thousands of models already converted for it. I picked one by name and converted nothing.

**COST** Every user downloads the model once: 197 MB. After that it lives in the browser's cache.

**ON SCREEN** `TransformersVectorService.ts:66`

```ts
const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';   // line 10
...
return pipeline('feature-extraction', MODEL_ID, {               // line 66
  device,
  dtype: MODEL_DTYPE,
  progress_callback: (data) => { ... },
});
```

**WHAT IT DOES**
- This file is the only place in the app that knows a model exists. The rest of the app talks to an interface called `VectorService`, so swapping the model means touching one file.
- `MODEL_ID` is the name of a repository on Hugging Face. `onnx-community` is the account that publishes models converted for Transformers.js.
- `pipeline(...)` is the whole API: name a task and a model, get back a function you can call with text. `'feature-extraction'` is the task name for "give me vectors" (others would be `'text-generation'`, `'translation'`).
- The first run downloads the model files and stores them in the browser's cache. After that it loads from the cache.
- `device` is where it runs: `'webgpu'` (GPU) or `'wasm'` (CPU). `progress_callback` drives the download bar in the header.
- Line 50, `['webgpu', 'wasm']`: try the GPU first, then the CPU. If the browser has no GPU, only `['wasm']`.

**SAY**
- (line 66) "This is the whole AI integration. One function call. If you've used transformers in Python, you already know this API."
- (line 10) "That string is a Hugging Face repo name. The first run downloads it."
- (line 50) "GPU first, CPU if there's no GPU." Stop there: why there's a check is round 5's sequel.

**Don't scroll to** line 16 (`q4`) or line 78 (the sanity check). Both are round 5.

**IF ASKED** TensorFlow.js → the quote on screen. "What's ONNX?" → "A file format for models. The PDF of AI: train in PyTorch, export to ONNX, run it anywhere."

### Stop 2 · EmbeddingGemma (2½ min)

**WHAT** An embedding model from Google, released September 2025, made to run on phones and laptops. 300M parameters, about 200 MB on disk the way I use it. It doesn't chat and it can't write. It does one thing: text in, 768 numbers out, and texts that mean similar things get similar numbers. That list of numbers is the *vector* the rest of this talk is about. Trained on 100+ languages, which is why the Greek note worked.

**WHY HERE** Small enough for a tab, and multilingual. My notes are half Greek; the classic small model (all-MiniLM) is English-only.

**COST** It has rules, and breaking them doesn't crash anything.

**ON SCREEN** `TransformersVectorService.ts:18`

```ts
// EmbeddingGemma's task prompts. Query and document use different ones.
const QUERY_PREFIX = 'task: search result | query: ';
const DOC_PREFIX = 'title: none | text: ';
```

**WHAT IT DOES**
- Plain text glued in front of the input before the model sees it. Nothing in the code reads it; the model learned these exact words in training.
- Your question gets `QUERY_PREFIX` ("this is a search query"). Every note gets `DOC_PREFIX` when it's saved, edited or imported ("this is a document, it has no title, here's the text"). Google's format has a title slot; notes have none, and `none` is what Google says to write.
- Why two: a short question and the long note that answers it don't look alike. The prefix tells the model which role each text plays, so it puts a question near its answer, not near other questions.
- Forget them and you still get 768 numbers. They're just a bit worse, and nothing tells you.

**SAY** "The model was trained with these exact words in front of every text. Questions get one, notes get the other. Same model, two hats. Forget them and nothing crashes. Results just get a bit worse, quietly, forever. That's the AI bug I fear most: there's no error."

Then the tagging trick, the cleverest thing in the repo.

**ON SCREEN** `EmbeddingTaggingService.ts:12`. Lines 12-24 are a comment that explains the idea in English. You can read it off the screen.

```
1. take every word and two-word phrase in the note as a candidate tag
2. embed the note and every candidate with the same model
3. the candidates whose vectors sit closest to the note's vector are the
   words that best stand for the whole note
4. pick the top few, skipping near-duplicates (maximal marginal relevance)
```

**SAY** "This model can only output numbers. It can't write a single word. So how does it write my tags? It doesn't. I take every word in the note as a candidate tag, embed the note, embed every candidate, and keep the words that land closest to the note. The model never writes anything, it just tells me which of my own words best stand for the whole note."

**WHAT IT DOES** (the code under the comment, `generateTags`, lines 32-81)
- Line 33: your own `#hashtags` are pulled out first. They're always kept.
- Line 35: the candidates. Every word and two-word phrase in the note, skipping ones that start or end with a filler word ("the", "και"), numbers and one-letter words. At most 32. (That's in `KeyphraseCandidates.ts`; no model involved.)
- Lines 45-46: embed the note once, then every candidate.
- Line 49: each candidate's score is how close its vector is to the note's. 1 = same direction, 0 = unrelated.
- Lines 51-56: a two-word phrase only survives if it beats its best single word. "vector search" beats "vector"; "called quantization" loses to "quantization".
- Lines 59-74: pick up to 5, one at a time. Each pick balances "close to the note" against "different from tags already picked", so you don't get "sqlite", "sqlite wasm" and "real sqlite". That balance is called MMR.
- Lines 77-79: if anything fails, keep just your hashtags. Tagging can never stop a note from saving.

**Optional laugh** `KeyphraseCandidates.ts:15`, the Greek half of the filler-word list. It isn't linked on screen: `Cmd+P` KeyphraseCandidates, `Ctrl+G` 15. "The only Greek-specific code in the whole app: a list of boring Greek words to skip."

**LIVE PROOF (optional)** Add tab, paste a Greek sentence, press Save. The button says "Tagging & saving…" for a second or so (it's embedding ~30 candidate words on the CPU), then the note shows up in the list with Greek tags. Have the sentence in your clipboard and try it at home first.

**IF ASKED** It's called KeyBERT. The app used to load a second, text-generating model for this (LaMini-Flan-T5). It repeated itself, returned whole sentences as one tag, and returned nothing for Greek. The limit: a tag is always a word that's in the note, so it can't invent "devops" for a Kubernetes note. Tagging uses a third prefix, `task: clustering`, meaning "put similar texts close together".

### Stop 3 · SQLite, compiled to WebAssembly (1 min)

**WHAT** Three words to unpack, in this order:

- **SQLite** is the most used database in the world, and it isn't a server. It's a small library that keeps a whole database in one file. It's in your phone, your browser, every Python install.
- **WebAssembly (WASM)** lets a browser run code written in C, C++ or Rust at close to native speed.
- **SQLite WASM** is the SQLite team's own official build of their C code for the browser. Not a port, not a rewrite: the same code your phone runs. Real SQL, joins, indexes, transactions, in a tab.

**WHY HERE** Notes and their vectors in one real database, with SQL. The browser's built-in store, IndexedDB, is key-value: no SQL, no joins, nothing for vectors.

**COST** A 5.6 MB engine to download once, and it has to be a special build with the vector extension baked in (stop 5).

**DO** In the terminal: `ls -lh src/vendor`

```
sqlite3-opfs-async-proxy.js   21K
sqlite3.mjs                  699K
sqlite3.wasm                 5.6M
```

**WHAT IT SHOWS**
- `sqlite3.wasm`: SQLite itself, compiled, with sqlite-vec inside. The engine.
- `sqlite3.mjs`: the JavaScript that downloads the engine, starts it and gives you a friendly API (`db.exec`, `db.transaction`).
- `sqlite3-opfs-async-proxy.js`: a small helper thread that does SQLite's file reads and writes. It's the reason for stop 4.
- Ignore `total` and the `@` if they show: disk blocks and macOS file metadata.

**SAY** "That's the entire database. `sqlite3.wasm` is SQLite itself, compiled: 5.6 MB, smaller than most hero images. `sqlite3.mjs` is the JavaScript that loads it and gives me a nice API. And that tiny 21K file, remember it. It's the villain of the next stop."

**ON SCREEN** `SqliteNoteRepository.ts:16`

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS vec_notes USING vec0(
  embedding float[768]
);
...
CREATE TABLE IF NOT EXISTS notes(
  rowid INTEGER PRIMARY KEY,
  text TEXT,
  ...
```

**WHAT IT DOES**
- Runs every time the app starts. `IF NOT EXISTS` means it only creates what's missing.
- `vec_notes` is a **virtual table**: its storage is run by an extension (sqlite-vec, whose table type is `vec0`) instead of SQLite itself. `float[768]` means each row holds exactly 768 numbers.
- There's no note-id column. A vector row's hidden `rowid` is the same number as its note's `rowid` in `notes`. That's the whole link between a note and its vector.
- `notes` holds the text, tags (a JSON list in a text column), pinned flag, timestamps, a `uuid` for syncing between devices, and `deleted_at`: deleting a note sets a date instead of removing the row, which is how undo works.
- There's also a small `meta` table that remembers which model made the vectors (round 5, story 1).

**SAY** "Vectors in one table, notes in another. Same database, same file. Backup is: download the file." (That's Export in the Sync menu.)

**IF ASKED**
- "5.6 MB? I read 5.9." Same file. `ls -h` counts in 1024s; 5,907,734 bytes is 5.9 MB in decimal and 5.6 in binary. On stage, say "under six megabytes".
- "Why copy it into the repo instead of using npm?" The npm package is plain SQLite. Extensions can't be loaded into the WASM build at runtime, they have to be compiled in. This one comes from sqlite-vec's own build pipeline: SQLite 3.45.3 + sqlite-vec 0.1.7-alpha.2, January 2025.
- "Why not PGlite?" (Postgres in WASM, with pgvector.) Valid. SQLite is smaller and the database is one file you can export.

### Stop 4 · OPFS and the header saga (1½ min)

**WHAT** Three terms, then the chain makes sense:

- **OPFS** (Origin Private File System): a private hard drive each website gets inside the browser. You can't see it in Finder and other sites can't read it. Works in all major browsers. `notes.db` lives there.
- **SharedArrayBuffer**: memory that two threads can read and write at the same time.
- **COOP and COEP**: two HTTP headers where the server promises the browser "this page doesn't mix with other sites' content". Since the Spectre CPU bug in 2018, browsers only give SharedArrayBuffer to pages that make that promise.

**WHY HERE** Without OPFS the database lives in RAM, and a refresh deletes your notes.

**COST** The chain on screen.

**DO** Read the chain top to bottom, slowly. The third line is the one nobody gets, so explain it with the 21K file from stop 3:

**SAY** "SQLite is old-school. It asks for a piece of the file and waits. The browser's file API doesn't do waiting, it answers later. So SQLite hands the file work to that 21K helper and freezes until the helper drops the answer into memory they can both see. That shared memory is the SharedArrayBuffer. And that's why we need the headers."

**ON SCREEN** `DatabaseFactories.ts:18`

```ts
const isSecure = typeof self !== 'undefined' && self.crossOriginIsolated;   // 18
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';      // 19
...
if (isSecure && hasSharedArrayBuffer && 'opfs' in sqlite3) {                // 24
  db = new sqlite3.oo1.OpfsDb('/notes.db');                                 // 25
} else {
  throw new Error('OPFS requirements not met');
}
} catch (opfsError) {
  db = new sqlite3.oo1.DB(':memory:');                                      // 32
  storage = 'memory';
```

**WHAT IT DOES**
- Runs once at startup, inside the worker. A few lines up (line 9), `initSQLite` starts the engine; while it starts, SQLite also tries to set up its OPFS driver and launch the 21K helper. That only works on an isolated page.
- Line 18: `crossOriginIsolated` is the browser's answer to "did this page arrive with the COOP and COEP headers?"
- Line 19: does SharedArrayBuffer exist here? Only on isolated pages.
- Line 24: if both are true and the OPFS driver is ready...
- Line 25: ...open (or create) `notes.db` in OPFS. Notes survive refreshes and restarts.
- Otherwise it throws on purpose to jump to the fallback. Line 32: a database in memory. It works until you close the tab, then it's gone. `storage = 'memory'` travels to the UI, which shows the amber banner.

**SAY** "If any link in the chain breaks, I land here and your notes live in RAM. The app now shows an amber banner when that happens. It used to say nothing."

Then the three links under the chain, a few seconds each:

- **`vite.config.ts:12`**: `server.headers` with the two headers. **WHAT IT DOES** The dev server sends them on every response while I develop.
- **`vercel.json`**: the same two headers (plus a third, `Cross-Origin-Resource-Policy`, that's harmless) for `"/(.*)"`, meaning every URL. **WHAT IT DOES** The production host sends them. The `rewrites` part sends every URL to `index.html` so the app opens at any address.
- **`index.html:11`**: `<script src="/coi-serviceworker.js">`, the hack. **WHAT IT DOES** It runs before the app. If the page isn't isolated, it installs a service worker that catches every file the page downloads, adds the two headers to the response, and reloads the page once. The browser sees headers the server never sent.

**10-second proof (optional)** In the browser: `Cmd+Opt+J`, type `crossOriginIsolated`, Enter → `true`. Close DevTools.

**SAY** (end) "Seven levels deep to save a note. Everyone here has a chain like this. Tell me yours at the bar."

**IF ASKED**

- "Is the hack running right now?" No. Vercel sends the real headers, so the hack sees the page is already isolated and exits (`coi-serviceworker.js` line 88). It only does anything on hosts like GitHub Pages.
- "Could you skip the whole chain?" Probably. SQLite has a second OPFS driver, `opfs-sahpool`, that needs no SharedArrayBuffer and no headers, and it's already in this build. The catch: only one tab can have the database open at a time. And I'd lose the speed bonus in the next answer.
- "What's Spectre?" / "What do COOP and COEP actually do?" Search it: `what is spectre` or `COOP`. The note explains both headers and Spectre in plain words.
- "Do the headers buy you anything else?" Yes, speed. The model's CPU engine only uses several CPU cores on isolated pages. Measured on this Mac: 90 ms to embed a note with the headers, 296 ms without. Three times faster, from two HTTP headers.
- "Can the browser delete my data?" Under storage pressure, yes, unless the site has persistent storage. The app asks for it at startup; the browser can still say no. That's what Export is for.
- "What does COEP actually block?" With it, the page can only load files from other sites if those files say they allow it. Hugging Face and jsdelivr do, which is why the model downloads still work.

### Stop 5 · sqlite-vec (1½ min)

**WHAT** An extension for SQLite by Alex Garcia, an independent developer, backed by Mozilla's Builders program. It teaches SQLite about vectors: a column type that holds a list of numbers (`float[768]`) and functions that measure the distance between two of them. It's a small piece of C with no dependencies, so it runs anywhere SQLite runs, including WASM. It replaced his earlier sqlite-vss, which was built on Facebook's Faiss library and was hard to build for the browser.

**THE IDEA IN ONE LINE** Every note is a point in a 768-dimensional space. A question is a point too. Search means finding the notes closest to the question.

**WHY HERE** Vector search without a vector database. Pinecone, Qdrant and Chroma are servers; this is a SQL function. Search becomes a normal query, joined to my normal tables.

**COST** It's pre-1.0 (my build is an alpha), and there's no index: every search measures the distance to every note. For one person's notes that's instant.

**ON SCREEN** `SqliteNoteRepository.ts:495`

```sql
WITH knn AS (
  SELECT rowid, distance
  FROM vec_notes
  WHERE embedding MATCH ? AND k = ?          -- 495
)
SELECT notes.rowid as id, notes.text, ... , knn.distance
FROM knn
JOIN notes ON notes.rowid = knn.rowid       -- 509
WHERE notes.deleted_at IS NULL
ORDER BY knn.distance ASC                   -- 511
LIMIT ? OFFSET ?
```

and a few lines down:

```ts
if (row.distance < 1.0) {                    // 522
```

**WHAT IT DOES** (read the SQL in this order)
1. `WITH knn AS ( ... )`: a named step. "First find the nearest vectors, and call that list `knn`."
2. `WHERE embedding MATCH ? AND k = ?`: sqlite-vec's nearest-neighbour search. The first `?` is the question's vector, and `k` is how many neighbours to return. It still measures the distance to every stored vector (ordinary straight-line distance, "L2", just in 768 dimensions), but it does it inside sqlite-vec in fast chunks. It hands back each neighbour's `rowid` and `distance`.
3. `JOIN notes ON notes.rowid = knn.rowid`: attach the note that owns each vector (same row number).
4. `WHERE deleted_at IS NULL`: skip notes in the trash.
5. `ORDER BY knn.distance ASC`: closest first.
6. `LIMIT ? OFFSET ?`: one page of 20.
7. Then in JavaScript, line 522: drop anything at distance 1.0 or more. That's why "weather in London" returns nothing.

Why `k` isn't simply 20 (lines 488-489, just above): sqlite-vec picks the neighbours before the trash is filtered out. So the code counts the notes in the trash and asks for that many extra, which keeps every page full. Tested against the old query: identical results, including with a third of the notes trashed.

What the distances mean (all vectors have length 1):

| Distance | Means |
| --- | --- |
| 0 | same meaning (same direction) |
| 1.0 | the cutoff: cosine similarity 0.5, an angle of 60° |
| ~1.41 | unrelated (90°) |
| 2 | opposite |

**SAY**
- (495, read aloud) "Give me the nearest vectors to my question. That's vector search. It's a WHERE clause."
- (509-511) "And from there it's plain SQL: join my normal notes table, skip the trash, closest first."
- (522) "This is the London answer from earlier. Anything farther than 1.0 gets dropped. I picked 1.0. Nobody told me to."
- (optional, 15 seconds) "Confession: until this week, this query called the distance function on every single row myself. This is sqlite-vec's own nearest-neighbour search. Same results, 26 times faster at 50,000 notes. Read the docs of the extension you're using."

**ON SCREEN** `NoteList.tsx:83`

```tsx
{((1 - note.distance) * 100).toFixed(0)}% Match
```

**WHAT IT DOES** Distance 0 shows 100%, distance 0.8 shows 20%. Because of the cutoff, every result on screen is between 0% and 100%. It's a scale I invented, not a probability.

**DO** Switch to the app and do the badge confession: point at the percentage on a result you all agreed was correct earlier, probably something like 20 or 30%. That's how made up it is.

**IF ASKED**

- The math: the vectors have length 1, so distance and angle are tied (`d² = 2 − 2·cos`). The cutoff `d < 1.0` means cosine similarity above 0.5. The badge is pessimistic: d = 0.8 shows "20% match" while the cosine is 0.68.
- "How many notes before it's slow?" Search it: `how many notes can it handle`. Or say it: "I measured it on this Mac. 50,000 notes: 23 milliseconds with this query. My first version took over half a second. Turning your question into numbers takes longer than the search."
- "Real vector databases use indexes like HNSW." True. This is still brute force, and at personal scale that's fine: 23 ms for 50,000 notes. sqlite-vec added its first approximate index, DiskANN, this spring, still in alpha.

### Stop 6 · The web worker (¾ min)

**WHAT** A web worker is a second thread for a web page, built into every browser for over 15 years. Code in a worker can't touch the page, and the page can't call the worker's functions. They only send each other messages, like two separate apps.

**WHY HERE** A 300M-parameter model takes seconds of CPU. On the page's main thread, every button would freeze meanwhile. In a worker, the UI never notices.

**COST** Everything becomes messages.

**ON SCREEN** `useWorker.ts:116` (React side)

```ts
workerRef.current?.postMessage({ type: 'SEARCH', payload: { query, limit, offset } });
```

**WHAT IT DOES** Sends the question to the worker, and that's it: the function returns nothing. The answer arrives later in a separate message handler (line 30), whose `SEARCH_RESULTS` branch (lines 51-52) puts the results into React state, and React redraws the list. Questions shorter than 2 characters never get sent (line 112).

**SAY** "React never calls search. It sends a message."

**ON SCREEN** `app.worker.ts:148` (worker side)

```ts
} else if (type === 'SEARCH') {                                  // 148
  ...
  const results = await searchNotesUseCase.execute(query, limit, offset);   // 155
  ...
  self.postMessage({ type: 'SEARCH_RESULTS', results: ... });   // 160
```

**WHAT IT DOES** Every message from the page lands in one handler (line 137), and a long `if / else if` on `type` picks what to do. For `'SEARCH'`: embed the question, run the SQL from stop 5, send the results back. It's all inside a `try / catch`, so any error goes back to the page as an `ERROR` message instead of vanishing.

**SAY** "The worker gets the message, embeds the question, asks SQLite, and sends the answer back as another message."

**ON SCREEN** `WorkerMessages.ts`

**WHAT IT DOES** The list of every allowed message: 17 kinds page → worker (`WorkerMessage`), 19 kinds worker → page (`WorkerResponse`). The `|` means "one of these". TypeScript uses the list to catch typos in message names. Data sent with `postMessage` is copied, not shared: the page and the worker never hold the same object.

**SAY** "17 messages in, 19 out. It's a small API between my UI and my backend, and the backend is in the same tab."

**IF ASKED** "Is this the service worker?" No. The web worker computes; the service worker is the network proxy that keeps the app working offline. "How is it wired?" `app.worker.ts` lines 102-114 build every piece with plain constructors, no framework.

Back to SCREEN.md, scroll to section 4.

## 4 · Stump the model (4 min)

No code in this section.

**SAY** Now break it. Make my search look stupid. Winner is whoever gets the dumbest correct-looking answer.

What I saw in testing (same model and weights as the app, run in Node; scores near the cutoff can shift in your browser, so try these at home first):

| They try | What happens | What to say |
| --- | --- | --- |
| Greek: `πού θα φάμε μετά` | bougatsa, strong hit | same space for every language |
| Greeklish: `pou tha fame meta tis mpires` | bougatsa, **barely** (0.97, cutoff is 1.0) | the model never saw much Greeklish, and it still limps home |
| Greeklish: `ti einai to embedding` | the embedding note, strong | |
| Typos: `why nt indexdb` | IndexedDB note | no spellchecker, tokens are forgiving |
| Emoji: `🍺🍽️` | bougatsa | beer + plate = food after beer. I did not program that |
| Negation: `anything except sqlite` | **SQLite notes** | the classic failure. Embeddings hear the topic, not the "not". If you need "not", you need filters or an LLM on top |
| Nonsense: `asdfghjkl` | probably one random note right at the cutoff | my cutoff of 1.0 is as made up as my percentage |
| Off-topic: `I want my data in the cloud` | the storage notes | it finds the nearest thing, it doesn't know it disagrees with you |

**SAY** (wrap) That's the real picture of semantic search. Great at paraphrase and language, deaf to negation, and it never says "I don't know" unless you draw a line for it.

## 5 · Three things this project taught me (4 min)

These were real bugs in this repo until this week. You don't have to pretend you found them: the true story is better for this crowd. **"Before this talk I asked an AI agent to review my repo. It found three things."** Then one minute each.

If you're short on time, trim this round to one story. Keep #2, it's the one people will repeat.

### Story 1 · A vector is derived data

**SAY** Editing a note updated the text and kept the old vector. Edit a pasta recipe into a Kubernetes note and search still serves it for dinner. You'd blame the model, and the model is innocent. It's cache invalidation in an AI costume. Fix: re-embed before writing, text and vector in one transaction, and the DB remembers which model made its vectors so it can rebuild them.

**ON SCREEN** `UpdateNoteUseCase.ts:21`

```ts
const textChanged = existing.text !== note.text;                // 21
const embedding = textChanged
  ? await this.vectorService.generateEmbedding(note.text)
  : undefined;
...
await this.noteRepository.update({ ...note, isPinned }, embedding);   // 29
```

**WHAT IT DOES** Compare the old text with the new. If it changed, compute a new vector; if not (pinning, re-tagging), skip the model so it stays instant. The vector is computed **before** anything is written: if the model fails, nothing changes, and the old text and old vector still match.

**ON SCREEN** `SqliteNoteRepository.ts:235`

**WHAT IT DOES** `update()` wraps everything in `this.db.transaction(...)`, meaning all or nothing: update the note's row, and if there's a new vector, replace the old one (delete it, insert the new one; sqlite-vec's tables can't edit a row in place). The old bug: this function updated the text and never touched the vector.

**ON SCREEN** `ReindexNotesUseCase.ts:17`

```ts
const current = this.vectorService.version;                      // 18
const stored = await this.noteRepository.getEmbeddingVersion();  // 19
if (stored === current) return 0;                                // 20
```

**WHAT IT DOES** Runs at every startup. `version` is a label like `embeddinggemma-300m-ONNX:q4:v2` (model, precision, revision). The database keeps the label of the model that made its vectors. Same label: nothing to do, which is every normal startup. Different label: re-embed every note once (that's the "Re-indexing notes" message in the header), then save the new label. Why: vectors from different models, or the same model at a different precision, can't be compared. Mixing them makes search quietly wrong.

### Story 2 · One word cost a gigabyte

Background, in plain words: a model is a big file of numbers called *weights* (300 million of them here). `dtype` is how many bits each number gets. `fp32` = 32 bits each = 1.2 GB. `q4` = each number rounded to 4 bits = 197 MB. That rounding is called *quantization*. Think JPEG quality: smaller file, slightly less exact, usually you can't tell. If you blank on stage, search `what is dtype`.

**SAY** The code said `dtype: 'fp32'`, with a comment next to it: "SQLite expects float32". Sounds reasonable. SQLite does want float32 vectors. But `dtype` isn't about the vectors that come out, it's about the precision of the model file you download, and the output is float32 no matter what. Switching that one word to `q4`: the model went from 1235 MB to 197 MB, and every question in my test set still returns the same note. (With the tagging model gone too, the whole first visit went from about 1.6 GB to 222 MB.) *Measure before you assume quality needs the big file.*

**ON SCREEN** `TransformersVectorService.ts:16`

```ts
// Precision of the DOWNLOADED WEIGHTS, not of the output. The pipeline returns
// a Float32Array either way, which is what sqlite-vec stores.
//   fp32 ≈ 1235 MB · q8 ≈ 309 MB · q4 ≈ 197 MB
// q4 also has WebGPU kernels (MatMulNBits); q8 mostly falls back to the CPU.
const MODEL_DTYPE = 'q4';
```

**WHAT IT DOES** Picks which version of the model **file** to download: 32, 8 or 4 bits per weight. It doesn't change what comes out: always 768 normal 32-bit numbers. The last comment line: the 4-bit version also has fast GPU code for its math (`MatMulNBits` is the name of that operation); the 8-bit one mostly falls back to the CPU.

**SAY** (sequel) The 4-bit model worked on the CPU and returned junk on my Mac's GPU. No error, every note at the same distance from every query. That's the second half of the lesson: the small file needs special GPU code, and on some GPUs it's wrong. Now the app gives the model a two-sentence exam at startup and falls back to CPU if it fails. A model that can be silently wrong needs a smoke test, like any other dependency.

**ON SCREEN** `TransformersVectorService.ts:78`

```ts
const note = await embed(DOC_PREFIX + 'pasta with garlic, olive oil and tomatoes');
const related = await embed(QUERY_PREFIX + 'something quick for dinner');
const unrelated = await embed(QUERY_PREFIX + 'kubernetes pod keeps restarting');
...
const gap = cosine(note, related) - cosine(note, unrelated);
return gap > SANITY_MIN_GAP;   // 0.08
```

**WHAT IT DOES** Embed three texts: a pasta note, a related question (dinner) and an unrelated one (kubernetes). `gap` = how much closer dinner is to pasta than kubernetes is. A healthy model gives about 0.25. The broken GPU gave about 0: every text looked equally close to every other. Pass if the gap is above 0.08; it also fails if any number comes out broken. Just above (lines 50-60): try the GPU first, give it the exam, and if it fails, free it and load on the CPU instead. The console says which one won: `Vector model: q4 on wasm` or `on webgpu`.

**THE ENDING** **SAY** "And it's not just my Mac. There's an open GitHub issue about it, number 1728 on Transformers.js: someone with an NVIDIA card on Windows, same model, same silent junk. The new major version of the library, version 4, rewrote the GPU engine, and I tested it on this Mac: the GPU now gives exactly the same numbers as the CPU, to three decimals, and it's twice as fast. I haven't upgraded the app yet, because version 4 brought its own surprise on the CPU side. Which is the lesson one more time: test it."

**IF ASKED** "What surprise?" Version 4 downloads a different build of the CPU engine by default, and that build is missing one operation this model needs (`GatherBlockQuantized`, the 4-bit word lookup). The model refuses to load on the CPU. Pointing it at the plain CPU build fixes it. Someone hit the same error with Gemma 3 in issue 1581; the maintainer's answer was "use WebGPU". Fine, unless your user has no GPU.

### Story 3 · "Offline" is three promises

**SAY** Warm tab, surviving a restart, cold launch. I had the first, mostly the second (it silently fell back to RAM when OPFS was missing, now it warns), and not the third: I cached a gigabyte of model and forgot 300 KB of JavaScript. Now it cold-starts with the server dead and the network cut.

**ON SCREEN** `App.tsx:258`

```tsx
{storageMode === 'memory' && (
  <div role="alert" ...>
    <strong>Your notes are not being saved.</strong> ...
```

**WHAT IT DOES** If the database ended up in memory (stop 4's fallback), show the amber box. The value travels: `DatabaseFactories.ts` decides → the worker sends it in its `READY` message → React stores it → this line shows the box.

**ON SCREEN** `sw.ts:26`, the service worker

**WHAT IT DOES** The browser runs this for every file the page asks for. It ignores anything that isn't the app's own files or the ONNX runtime from jsdelivr (model files are cached by Transformers.js itself). Network first: download the file, save a copy, use it, so a new deploy shows up right away. No network: use the saved copy, and for any page address fall back to the saved home page.

**ON SCREEN** `warmAppCache.ts:21`

**WHAT IT DOES** Fixes the first visit. On your very first visit the service worker doesn't exist yet while the page loads, so nothing passes through it and nothing gets saved; the next launch without network would fail. This asks the browser for its list of every file already loaded (`performance.getEntriesByType('resource')`), and saves each app file into the service worker's cache. It runs in the page and in the worker, because each keeps its own list, and the worker is the one that loaded `sqlite3.wasm` and the ONNX runtime.

## 6 · Wrap-up (1 min)

No code. Read the three lines. Then the two "next" lines:

- **Agent:** this is one `search_notes(query)` tool away from being an agent's private, offline memory, and that's a talk someone here could give.
- **EmbeddingGemma 2:** "Google shipped the next version of my model last week. Same idea, but photos, voice and video land in the same space as text. So: photograph tonight's whiteboard, search it next month by what's on it. And my tagging trick works on photos too: compare the photo with the tags I already use, keep the closest. For text alone it's no better than what I run, and there's no browser build for my stack yet, so it's the next experiment, not tonight's demo." If anyone wants detail, search `what's next for latent` or `what about embeddinggemma 2`.

**DO** Last search of the night: `can I present next time`.

---

## Pre-flight

1. `git checkout main && git pull`, `npm run dev`. Use the same port on the night; browser storage is per origin.
2. Fresh Chrome profile. Wait for **System Ready** (first time downloads about 220 MB).
   If you open a profile that already has notes, the header shows "Re-indexing notes" once. That's the vectors being rebuilt for the q4 model.
3. **Sync → Import → JSON** → `talk-brain.json`, even if you imported it before: notes were added and edited since, and the file is dated so import updates them in place (no duplicates). Console must say `Using OPFS storage`. An amber "not being saved" banner means OPFS failed; fix that first.
4. Run the tables from rounds 1 and 4 yourself. Drop anything that behaves differently in your browser.
5. Wi-Fi off. Reload the page. It should come back and search should work. (Tested headless with the server killed, not yet in your Chrome. This is the one pre-flight item that can still surprise you; do it at home, not at the venue.)
6. Nothing runs while you type any more. Add: Save does tags + embedding + write. Edit: Save re-embeds if the text changed; "Suggest tags" is a button you press if you want new tags.
7. Fonts: browser 150%, VS Code preview zoomed, terminal font big. Open the terminal in the repo and run `ls -lh src/vendor` once, so on stage it's one `↑` away.
8. Click every code link in SCREEN.md once. Each should open on the line this file names under **ON SCREEN**.
9. Expect the console to say `Vector model: q4 on wasm` on your Mac: the GPU fails the exam (the known bug, story 2). Measured in a test page on this Mac: about 0.1 s to turn a question into numbers on the CPU, about 1 s for the 30 tag words on Save. If search feels much slower than that in the app, check the console.
10. iPad: open this file in whatever app you'll use on stage, check it works with the iPad offline, turn auto-lock off, and scroll it end to end once.

---

## Appendix · Reading the code in 60 seconds

Homework, not for the stage. The same few patterns show up in every file:

| You see | It means |
| --- | --- |
| `async` / `await` | "This takes a while (download, database, model). Wait for it, without freezing anything." |
| `class X implements Y` | X is one concrete way of doing the job that interface Y describes. The rest of the app only knows Y. |
| `constructor(a, b)` | What the object needs handed to it when it's created. |
| `a ? b : c` | If a, then b, otherwise c. |
| `x?.y` / `x ?? y` | "y, if x exists" / "x, unless it's missing, then y". |
| `postMessage({ type: ... })` | Send a message to the other thread. No answer on that line; it arrives later as another message. |
| `db.exec({ sql, bind })` | Run SQL. Each `?` in the SQL is filled with the next value from `bind`, in order. |
| `db.transaction(() => { ... })` | Everything inside happens together or not at all. |
| `Float32Array` | A list of decimal numbers in compact binary form. A vector is one of these, 768 long. |
