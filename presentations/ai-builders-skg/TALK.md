# Speaker notes · SELECT * FROM my_brain

**Private. The projector shows [SCREEN.md](SCREEN.md), not this file.**
About 25 minutes. Only your laptop is used; the room talks, you type.

## Setup on stage

- VS Code: `SCREEN.md` in preview (`Cmd+Shift+V`), zoomed until the back row can read it, Zen mode (`Cmd+K Z`).
- Browser: Latent open, green **System Ready**, the 35 notes from [talk-brain.json](talk-brain.json) imported, zoom 150%.
- You switch between those two windows all night. `Cmd+Tab`.
- This file: on your phone or a second screen, if you want it at all.

**The safety net:** the app is loaded with notes that explain its own stack. When you blank on "what's ONNX again?", you search it on stage. It looks like a demo. It's also your cheat sheet.

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

**SAY** One search: React posts a message, the worker embeds the query into 768 numbers, SQLite sorts notes by distance, results come back. The UI thread never touches the model.

**SAY** Two things are called "worker" and have nothing in common. The web worker computes. The service worker is a network proxy that keeps the app available offline.

## 3 · The tour (8 min, ~80 seconds a stop)

Same three beats per stop: what, why, what it cost. Click the code link, show it for ten seconds, come back.

1. **Transformers.js.** Same `pipeline()` as Python. `device: 'auto'` = WebGPU if present, WASM if not. Cost: users download the model. People will ask about TensorFlow.js: the quote on screen is the answer.
2. **EmbeddingGemma.** Google, on-device, multilingual, which you just saw. The prefixes are the gotcha. Then the tagging trick, which is the cleverest thing in the repo. **SAY:** "This model can only output numbers. It can't write a single word. So how does it write my tags? It doesn't. I take every word in the note as a candidate tag, embed the note, embed every candidate, and keep the words that land closest to the note. The model never writes anything, it just tells me which of my own words best stand for the whole note." If someone asks: it's called KeyBERT. The app used to load a second, text-generating model for this (LaMini-Flan-T5). It repeated itself, returned whole sentences as one tag, and returned nothing for Greek. Live proof if you want it: Add tab, paste a Greek sentence, click outside the box, watch Greek tags appear.
3. **SQLite WASM.** Run `ls -lh public/assets/` live in the terminal. Notes and vectors in one file, backup = download the file.
4. **OPFS saga.** Read the chain top to bottom, slowly. End with: "Seven levels deep to save a note. Everyone here has a chain like this. Tell me yours at the bar."
5. **sqlite-vec.** Read two lines of the query aloud. It's brute force and that's fine for one person's notes. Then the badge confession: earlier tonight the *correct* answer showed "13% match". That's how made up it is.
6. **Web worker.** Short. Everything is messages, no shared objects.

## 4 · Stump the model (4 min)

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

These were real bugs in this repo until this week. You don't have to pretend you found them: the true story is better for this crowd. **"Before this talk I asked an AI agent to review my repo. It found three things."** Then one minute each, one link per story.

Background you need for story 2, in plain words: a model is a big file of numbers called *weights* (300 million of them here). `dtype` is how many bits each number gets. `fp32` = 32 bits each = 1.2 GB. `q4` = each number rounded to 4 bits = 197 MB. That rounding is called *quantization*. Think JPEG quality: smaller file, slightly less exact, usually you can't tell. If you blank on stage, search `what is dtype`.

1. **A vector is derived data.** Editing a note updated the text and kept the old vector. Edit a pasta recipe into a Kubernetes note and search still serves it for dinner. You'd blame the model, and the model is innocent. It's cache invalidation in an AI costume. Fix: re-embed before writing, text and vector in one transaction, and the DB remembers which model made its vectors so it can rebuild them.
2. **One word cost a gigabyte.** The code said `dtype: 'fp32'`, with a comment next to it: "SQLite expects float32". Sounds reasonable. SQLite does want float32 vectors. But `dtype` isn't about the vectors that come out, it's about the precision of the model file you download, and the output is float32 no matter what. Switching that one word to `q4`: the model went from 1235 MB to 197 MB, and every question in my test set still returns the same note. (With the tagging model gone too, the whole first visit went from about 1.6 GB to 222 MB.) *Measure before you assume quality needs the big file.* **Sequel:** the 4-bit model worked on the CPU and returned junk on my Mac's GPU. No error, every note at the same distance from every query. That's the second half of the lesson: the small file needs special GPU kernels, and on some GPUs they're wrong. Now the app embeds two sentences at startup, checks that "quick dinner" is closer to the pasta note than "kubernetes crash" is, and falls back to CPU if not. A model that can be silently wrong needs a smoke test, like any other dependency.
3. **"Offline" is three promises.** Warm tab, surviving a restart, cold launch. I had the first, mostly the second (it silently fell back to RAM when OPFS was missing, now it warns), and not the third: I cached a gigabyte of model and forgot 300 KB of JavaScript. Now it cold-starts with the server dead and the network cut.

If you're short on time, this is the round to trim to one story. Keep #2, it's the one people will repeat.

## 6 · Wrap-up (1 min)

Read the three lines. Then the agent line: this is one `search_notes(query)` tool away from being an agent's private, offline memory, and that's a talk someone here could give.

**DO** Last search of the night: `can I present next time`.

---

## Pre-flight

1. `git checkout fix/stale-vectors-size-storage-offline`, `npm run dev`. Use the same port on the night; browser storage is per origin.
2. Fresh Chrome profile. Wait for **System Ready** (first time downloads about 220 MB).
   If you open a profile that already has notes, the header shows "Re-indexing notes" once. That's the vectors being rebuilt for the q4 model.
3. **Sync → Import → JSON** → `talk-brain.json`. Console must say `Using OPFS storage`. An amber "not being saved" banner means OPFS failed; fix that first.
4. Run the tables from rounds 1 and 4 yourself. Drop anything that behaves differently in your browser.
5. Wi-Fi off. Reload the page. It should come back and search should work. (Tested headless with the server killed; confirm it on your machine.)
6. Editing a note on stage: after typing, the Save button shows "Processing..." while tags generate. Wait for "Save Changes" before clicking.
7. Fonts: browser 150%, VS Code preview zoomed, terminal font big.
