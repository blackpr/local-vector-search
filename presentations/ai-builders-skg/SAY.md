# What to say · SELECT * FROM my_brain

Only the lines to say out loud, in order. Everything else (code, what it does, IF ASKED) is in TALK.md. *Italics* are the cue for when to say a line.

---

## 0 · Title (1 min)

*Wi-Fi off where they can see it. Click the beerware link.*

Two things. This laptop is now offline and stays that way. And this project is beerware: if you like it you owe me a beer. You're all holding one, so we're off to a good start. No slides tonight, this markdown file and the repo are the talk. Interrupt me whenever.

## 1 · Ask my brain anything (5 min)

*Switch to Latent.*

I built this and I still can't remember what half the stack does. So I wrote it down, in the app. You ask, my notes answer. Badly phrased questions are better.

*If the room is shy:*

| Type | Comes back |
| --- | --- |
| `why not just use indexeddb` | SQLite vs IndexedDB |
| `what are those weird cross origin headers` | COOP/COEP |
| `why is it called latent` | the name |
| `where do we eat after the beers` | the note written **in Greek** about bougatsa |
| `the weather in london tomorrow` | nothing, correctly |

*Greek note comes back:* I asked in English, the note is Greek, they share zero words. Both land in the same space of meaning. That's an embedding. That's also the name: latent means hidden, and that hidden space is called the latent space.

*London returns nothing:* No answer is a feature. It says nothing instead of something random.

And the Wi-Fi is still off. A 300M-parameter model read your question in this tab. The rest of the talk is how.

*Any question from the room for the rest of the night: search it first, answer second.*

## 2 · What just happened (2 min)

*Point at each box in the diagram.*

1. *React UI:* You type a question. That's React, on the main thread: the one that draws the page and handles your clicks.
2. *postMessage arrow:* React doesn't search. It sends a message to a web worker, a second thread in the same tab.
3. *Transformers.js:* In the worker, the model turns your question into 768 numbers.
4. *SQLite, then notes.db in OPFS:* SQLite compares those numbers with the numbers stored for every note, in one database file on the browser's private disk.
5. *Arrow back:* The closest notes come back to React as another message, and React draws them.

So the screen never waits for the model. The thread that draws the page never touches it.

*Point at the service worker box:* Two things are called "worker" and have nothing in common. The web worker computes. The service worker is a network proxy that keeps the app available offline. It's not part of a search at all.

## 3 · The tour (8 min)

*Every stop: what is it, why is it here, what did it cost me.*

### Stop 1 · Transformers.js (1 min)

**What:** A JavaScript library from Hugging Face that runs AI models in the browser. It's the JS twin of their Python `transformers` library: same `pipeline()` function, same model names. Underneath, it hands the model to ONNX Runtime Web, Microsoft's engine that runs models on the GPU or the CPU.

**Why:** Hugging Face hosts thousands of models already converted for it. I picked one by name and converted nothing.

**Cost:** Every user downloads the model once: 197 MB. After that it lives in the browser's cache.

*Line 66:* This is the whole AI integration. One function call. If you've used transformers in Python, you already know this API.

*Line 10:* That string is a Hugging Face repo name. The first run downloads it.

*Line 50:* GPU first, CPU if there's no GPU.

### Stop 2 · EmbeddingGemma (2½ min)

**What:** An embedding model from Google, released September 2025, made to run on phones and laptops. 300M parameters, about 200 MB on disk the way I use it. It doesn't chat and it can't write. It does one thing: text in, 768 numbers out, and texts that mean similar things get similar numbers. That list of numbers is the vector the rest of this talk is about. Trained on 100+ languages, which is why the Greek note worked.

**Why:** Small enough for a tab, and multilingual. My notes are half Greek; the classic small model, all-MiniLM, is English-only.

**Cost:** It has rules, and breaking them doesn't crash anything.

*The two prefixes:* The model was trained with these exact words in front of every text. Questions get one, notes get the other. Forget them and nothing crashes. The results just get a bit worse, and nothing tells you.

*The tagging comment:* This model can only output numbers. It can't write a single word. So how does it write my tags? It doesn't. I take every word in the note as a candidate tag, embed the note, embed every candidate, and keep the words that land closest to the note. The model never writes anything, it just tells me which of my own words best stand for the whole note.

### Stop 3 · SQLite in WebAssembly (1 min)

**What:** SQLite is the most used database in the world, and it isn't a server. It's a small library that keeps a whole database in one file. WebAssembly lets a browser run code written in C at close to native speed. SQLite WASM is the SQLite team's own official build for the browser. Not a port, not a rewrite: the same code your phone runs.

**Why:** Notes and their vectors in one real database, with SQL. The browser's built-in store, IndexedDB, is key-value: no SQL, no joins, nothing for vectors.

**Cost:** A 5.6 MB engine to download once, and it has to be a special build with the vector extension baked in.

*After `ls -lh src/vendor`:* That's the entire database. `sqlite3.wasm` is SQLite itself, compiled: 5.6 MB, smaller than most hero images. `sqlite3.mjs` is the JavaScript that loads it and gives me a nice API. The 21K file is a small helper SQLite needs to save to the browser's disk. That's the next stop.

*The two tables:* Vectors in one table, notes in another. Same database, same file. Backup is: download the file.

### Stop 4 · OPFS and the header saga (1½ min)

**What:** OPFS is a private hard drive each website gets inside the browser. You can't see it in Finder and other sites can't read it. SharedArrayBuffer is memory that two threads can read and write at the same time. COOP and COEP are two HTTP headers where the server promises the browser "this page doesn't mix with other sites' content". Since the Spectre CPU bug in 2018, browsers only give SharedArrayBuffer to pages that make that promise.

**Why:** Without OPFS the database lives in RAM, and a refresh deletes your notes.

**Cost:** The chain on screen.

*Read the chain on screen, slowly:*

```
I want my notes to survive a refresh
  └─ needs OPFS  (a private disk per website)
       └─ SQLite's OPFS driver needs SharedArrayBuffer
            └─ browsers only allow that on "cross-origin isolated" pages
                 └─ needs two HTTP headers (COOP + COEP)
                      └─ GitHub Pages can't send custom headers
                           └─ so a service worker fakes them
```

*At the third line:* SQLite is old-school. It asks for a piece of the file and waits. The browser's file API doesn't do waiting, it answers later. So SQLite hands the file work to that 21K helper and freezes until the helper drops the answer into memory they can both see. That shared memory is the SharedArrayBuffer. And that's why we need the headers.

*The fallback code:* If any link in the chain breaks, I land here and your notes live in RAM. The app now shows an amber banner when that happens. It used to say nothing.

*End of stop:* Seven levels deep to save a note. Everyone here has a chain like this. Tell me yours at the bar.

### Stop 5 · sqlite-vec (1½ min)

**What:** An extension for SQLite by Alex Garcia, an independent developer, backed by Mozilla's Builders program. It teaches SQLite about vectors: a column type that holds a list of numbers and functions that measure the distance between two of them. A small piece of C with no dependencies, so it runs anywhere SQLite runs, including WASM.

Every note is a point in a 768-dimensional space. A question is a point too. Search means finding the notes closest to the question.

**Why:** Vector search without a vector database. Pinecone, Qdrant and Chroma are servers; this is a SQL function. Search becomes a normal query, joined to my normal tables.

**Cost:** It's pre-1.0, and there's no index: every search measures the distance to every note. For one person's notes that's instant.

*Line 495:* Give me the nearest vectors to my question. That's vector search. It's a WHERE clause.

*Lines 509-511:* And from there it's plain SQL: join my normal notes table, skip the trash, closest first.

*Line 522:* This is the London answer from earlier. Anything farther than 1.0 gets dropped. I picked 1.0 myself.

| Distance | Means |
| --- | --- |
| 0 | same meaning (same direction) |
| 1.0 | the cutoff: cosine similarity 0.5, an angle of 60° |
| ~1.41 | unrelated (90°) |
| 2 | opposite |

*Optional, 15 seconds:* Until this week, my query computed the distance to every row by hand. This is sqlite-vec's own nearest-neighbour search. Same results, 26 times faster at 50,000 notes.

*Switch to the app, point at the % on a result everyone agreed was right.* That's how made up it is.

### Stop 6 · The web worker (¾ min)

**What:** A web worker is a second thread for a web page, built into every browser for over 15 years. Code in a worker can't touch the page, and the page can't call the worker's functions. They only send each other messages, like two separate apps.

**Why:** A 300M-parameter model takes seconds of CPU. On the page's main thread, every button would freeze meanwhile. In a worker, the UI never notices.

**Cost:** Everything becomes messages.

*useWorker.ts:* React never calls search. It sends a message.

*app.worker.ts:* The worker gets the message, embeds the question, asks SQLite, and sends the answer back as another message.

*WorkerMessages.ts:* 17 messages in, 19 out. It's a small API between my UI and my backend, and the backend is in the same tab.

## 4 · Stump the model (4 min)

Now break it. Make my search look stupid. Winner is whoever gets the dumbest correct-looking answer.

| Type | Comes back | Say |
| --- | --- | --- |
| `πού θα φάμε μετά` | bougatsa, strong hit | same space for every language |
| `pou tha fame meta tis mpires` | bougatsa, **barely** (0.97, cutoff is 1.0) | the model never saw much Greeklish, and it still limps home |
| `ti einai to embedding` | the embedding note, strong | |
| `why nt indexdb` | IndexedDB note | no spellchecker, tokens are forgiving |
| `🍺🍽️` | bougatsa | beer + plate = food after beer. I did not program that |
| `anything except sqlite` | **SQLite notes** | the classic failure. Embeddings hear the topic, not the "not". If you need "not", you need filters or an LLM on top |
| `asdfghjkl` | probably one random note right at the cutoff | my cutoff of 1.0 is as made up as my percentage |
| `I want my data in the cloud` | the storage notes | it finds the nearest thing, it doesn't know it disagrees with you |

That's the real picture of semantic search. Great at paraphrase and language, deaf to negation, and it never says "I don't know" unless you draw a line for it.

## 5 · Three things this project taught me (4 min)

Before this talk I asked an AI agent to review my repo. It found three things.

*Short on time: keep only story 2.*

### Story 1 · A vector is derived data

Editing a note updated the text and kept the old vector. Edit a pasta recipe into a Kubernetes note and search still serves it for dinner. You'd blame the model, and the model is innocent. It's cache invalidation in an AI costume. Fix: re-embed before writing, text and vector in one transaction, and the DB remembers which model made its vectors so it can rebuild them.

### Story 2 · One word cost a gigabyte

The code said `dtype: 'fp32'`, with a comment next to it: "SQLite expects float32". Sounds reasonable. SQLite does want float32 vectors. But `dtype` isn't about the vectors that come out, it's about the precision of the model file you download, and the output is float32 no matter what. Switching that one word to `q4`: the model went from 1235 MB to 197 MB, and every question in my test set still returns the same note. With the tagging model gone too, the whole first visit went from about 1.6 GB to 222 MB. Measure before you assume quality needs the big file.

*Sequel:* The 4-bit model worked on the CPU and returned junk on my Mac's GPU. No error, every note at the same distance from every query. That's the second half of the lesson: the small file needs special GPU code, and on some GPUs it's wrong. Now the app gives the model a two-sentence exam at startup and falls back to CPU if it fails. A model that can be silently wrong needs a smoke test, like any other dependency.

*Ending:* And it's not just my Mac. There's an open GitHub issue about it, number 1728 on Transformers.js: someone with an NVIDIA card on Windows, same model, same silent junk. The new major version of the library, version 4, rewrote the GPU engine, and I tested it on this Mac: the GPU now gives exactly the same numbers as the CPU, to three decimals, and it's twice as fast. I haven't upgraded the app yet, because version 4 has a problem on the CPU side.

### Story 3 · "Offline" is three promises

Warm tab, surviving a restart, cold launch. I had the first, mostly the second (it silently fell back to RAM when OPFS was missing, now it warns), and not the third: I cached a gigabyte of model and forgot 300 KB of JavaScript. Now it cold-starts with the server dead and the network cut.

## 6 · Wrap-up (1 min)

*Read the three lines on screen:*

1. The browser is a serious runtime. Database, GPU, file system, model runner. One URL.
2. Local AI moves the cost. I pay zero per token. Users pay in megabytes and battery.
3. Calling the model is one line. Everything interesting, and every bug, was ordinary engineering around it.

*Then the two "next" lines:*

This is one `search_notes(query)` tool away from being an agent's private, offline memory, and that's a talk someone here could give.

Google shipped the next version of my model last week. Same idea, but photos, voice and video land in the same space as text. So: photograph tonight's whiteboard, search it next month by what's on it. And my tagging trick works on photos too: compare the photo with the tags I already use, keep the closest. For text alone it's no better than what I run, and there's no browser build for my stack yet, so it's the next experiment, not tonight's demo.

*Last search of the night:* `can I present next time`
