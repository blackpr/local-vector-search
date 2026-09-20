# AI in a browser tab

Building Latent, a local semantic notes app. An English talk for AI Builders SKG.

**Length:** 25 minutes, including 4½ minutes of live demonstration and audience search, and a two-minute group decision. Allow another 5–10 minutes afterwards for conversation. The timings include pauses and interaction. Rehearse once with a timer. If the room is quiet, use the fallback prompts in the notes rather than racing ahead.

## The format

Welcome people while they already have their drinks. Open with the app, give one person control of a search query, then explain the system they just saw. Use the stale-embedding bug as a shared debugging problem. Finish with a quick vote on what to build next. Keep deeper questions for the conversation afterwards if the session begins to run over.

## Presenting

Open **Latent-AI-Builders-SKG.html** in a browser. It is a self-contained slide deck with no external dependencies. Use the arrow keys or Space to advance, F for fullscreen, and N for rehearsal notes. Keep notes hidden on the projected display. Home and End jump to the first and last slide. The PowerPoint file contains the same deck with editable text and speaker notes.

The slide deck works offline. The Latent app has separate offline requirements described below.

## Run of show

| Time | Slide | Segment |
| --- | --- | --- |
| 0:00–0:45 | 01 | AI in a browser tab |
| 0:45–2:00 | 02 | The note you can’t find |
| 2:00–5:00 | 03 | The Wi-Fi test |
| 5:00–6:30 | 04 | A query from the room |
| 6:30–8:00 | 05 | One browser, two workers |
| 8:00–9:30 | 06 | Search by meaning |
| 9:30–11:00 | 07 | The search query |
| 11:00–12:00 | 08 | Two models, two jobs |
| 12:00–13:30 | 09 | The first-load bill |
| 13:30–15:00 | 10 | Three kinds of offline |
| 15:00–16:30 | 11 | When “saved” is temporary |
| 16:30–18:30 | 12 | A note has two representations |
| 18:30–20:30 | 13 | What would you change first? |
| 20:30–22:00 | 14 | The next experiments |
| 22:00–23:30 | 15 | Where an agent could fit |
| 23:30–25:00 | 16 | Your next small build |

## Demo preparation

Use a separate browser profile with demonstration data. Run Latent on the same host and port used in rehearsal because browser storage belongs to its origin. Wait for the green **System Ready** indicator. Both models currently load at startup.

Import **demo-notes.json** through **Sync Notes → Import (Load) → Import from JSON**. It contains eight synthetic notes with fixed identifiers, so reimporting the unchanged file should not create a second set. Import computes embeddings and needs the model to be ready.

Practice the two planned searches: “something quick for dinner” and “requests keep failing”. Inspect the actual result before you present. An empty result is possible with the current cutoff. Keep an explicit category selected when adding a new note.

For the Wi-Fi test, use the browser’s developer-tools offline mode for the demo tab. Confirm that it applies to worker requests in your chosen browser. Keep the tab open, enter a new query, and describe only the behaviour you observe. Turning off Wi-Fi alone is inconclusive if another network connection remains active.

Record a short screen capture of the successful path during rehearsal, or keep a screenshot of the actual result. Have that file open locally before the meetup. If startup or search fails on stage, spend at most twenty seconds identifying the state, switch to the recording, and use the saved time to explain what failed. If rehearsal never succeeds, show the code path and its failure honestly. The architecture and debugging sections still support the session.

A fresh offline page load is a different test. The custom service worker targets model downloads and does not explicitly cache the app shell. Do not refresh offline on stage unless you have tested that exact case.

## Things to verify before the meetup

- Search actually returns the expected sample note in the chosen browser.
- A new query works in the warm tab with the browser offline.
- The app uses OPFS rather than its in-memory fallback, and notes survive reopening.
- Model startup completes before the audience arrives. The code currently estimates roughly 1.4 GiB for both fp32 model downloads, which is not a measured transfer total.
- The backup capture opens locally and the projected text is readable from the back of the room.

## Current code observations

This talk is based on repository commit **c3705c5**. The edit path updates note text and metadata without regenerating the vector. The custom service worker only targets selected model URLs. The database factory falls back to memory if the OPFS path fails. These are code observations, not claims that every browser run fails. The proposed fixes in the deck are future work.

The example note-edit mismatch is conceptual unless you reproduce it live. Do not present it as a past production incident. The agent integration is a future possibility. Latent’s current search path returns existing notes.

## Recorded demo outcome

The rehearsal on 19 September 2026 used an isolated Chrome profile with the local development app. Both models reached ready, the database selected OPFS, and the app imported all eight sample notes.

- “something quick for dinner” returned the pasta note with the browser online.
- “requests keep failing” returned the API retry note after the browser went offline.
- “how do I handle too many API calls?” also returned the retry note while offline.
- Reloading the page offline failed with a network-disconnected error.

**Demo-Offline-Search.png** is the actual captured result, also included on slide 3. The displayed match percentage comes from a distance conversion and is not a calibrated confidence score. Repeat the rehearsal in the browser you will use at the venue.

## Speaker notes

### 01. AI in a browser tab

**0:00–0:45**

Grab a beer, or whatever you’re drinking, and settle in. This is Latent, a notes app with semantic search running in the browser. The interesting part is where the work happens: the model, the search, and the database all live on the device.

I want to show you the app first. Then we can look inside it and talk about the choices that make this possible, including some rough edges in the current code. Interrupt if something is unclear. If we get into a deep rabbit hole, we can keep that conversation going afterwards.

By the end, you should have enough of the design in your head to try a small version yourself.

**Stage cue:** Start while people are already holding their drinks. Keep the welcome brief.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/README.md

### 02. The note you can’t find

**0:45–2:00**

You remember writing something useful. You remember what it was about. The exact words have disappeared. A normal text search asks you to reconstruct those words before it helps you.

Here is a small example from the demo notes. One note describes pasta with garlic, olive oil, and tomatoes. Later, the thought in your head is “something quick for dinner.” Those phrases share an intention, even though the wording is different.

That is the problem semantic search tries to help with. A model gives each piece of text a numerical representation, and we compare those representations. Whether a particular result is useful still depends on the model and the notes.

Who has a notes folder that feels more like a place things disappear? Take a quick show of hands. For this demo, we’ll use a tiny collection of made-up notes so everyone can judge the results. We don’t need private data to have a useful discussion.

**Stage cue:** Ask for a show of hands. The example expresses a retrieval goal, not a measured result.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/application/SearchNotesUseCase.ts

### 03. The Wi-Fi test

**2:00–5:00**

Let’s see the actual system. These are the sample notes. There are recipes, a few engineering notes, and a meetup reminder. I’ll search for an idea using different words from the note.

First, look at the result with the network available. What would you expect to come back? Read the result with the room. If it misses, say so. We are looking at the behaviour of a real system, and misses are useful evidence too.

Now the models are loaded, I’ll put this browser offline and keep the same tab open. I’ll enter a different query, so we are asking the model to do fresh work. Watch the result, and watch the network panel if it’s visible.

This demonstrates one specific thing: searching in an already loaded tab without network access. Reopening the whole application from scratch is a separate test, which we’ll come back to.

If this works, the useful question is: what did the browser have to download and initialise before we got here? The first run and this warm run are very different experiences.

**Stage cue:** 3:00 demo. 0:00–0:35 show the eight notes. 0:35–1:20 search “something quick for dinner”. 1:20–1:40 switch the demo browser offline. 1:40–2:30 search “requests keep failing”. 2:30–3:00 discuss the observed result. Keep the same tab open. If rehearsal fails, use the recorded outcome and explain the failure; do not claim an offline success.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/application/SearchNotesUseCase.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/TransformersVectorService.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/sw.ts

### 04. A query from the room

**5:00–6:30**

Your turn. Give me a search for something in this little collection, phrased the way you would actually think about it. Before I type it, tell us which note you expect and why.

Run one query. Leave the result visible. Ask the person who suggested it whether this is useful. If the result surprises us, ask whether the issue is the note, the wording, or our expectation of what the search can do.

There is also a hard cutoff in the current implementation, so an empty result can mean every candidate fell outside that rule. It doesn’t automatically tell us that the model found no relationship.

This is a tiny evaluation session. The data and the expected answer are visible, and someone other than the builder gets to judge it. For a personal notes app, this kind of feedback helps us choose what to measure next.

**Stage cue:** Take one suggestion and one reaction. If the room is quiet, try “how do I handle too many API calls?” and ask the audience to judge the retry note. Use only a query that passed rehearsal if you need a dependable opening demo.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/SqliteNoteRepository.ts

### 05. One browser, two workers

**6:30–8:00**

Here is the architecture behind what we just saw. React owns the screen and sends messages to an application worker. That worker connects the use cases to the models and the database.

For a search, the worker embeds the query, asks SQLite for nearby notes, and sends the results back to React. For a new note, it computes an embedding and stores both the note and its vector.

Keeping this work off the main thread helps the interface remain responsive while inference or database work is happening. The worker still uses the device’s CPU, memory, and possibly its GPU. Moving work does not make the resource cost disappear.

There is a second, different worker: the service worker. Its job here is to intercept selected model requests and cache the responses. The application worker does computation. The service worker handles that caching path.

The backend for this search path is the browser itself. There is still hosting for the application and a source for downloading model files.

**Stage cue:** Trace one search aloud through the four labels. Keep the distinction between the two worker types clear.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/hooks/useWorker.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/app.worker.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/sw.ts

### 06. Search by meaning

**8:00–9:30**

An embedding is a list of numbers produced from text. Latent uses 768 numbers for each note. It uses the same embedding model to represent the search query.

The input formatting differs slightly. The query gets a search-query prefix, and a stored note gets a document prefix. The current implementation also asks for mean pooling and normalised output. Those details belong to the model integration, so changing models means revisiting them.

SQLite compares the query vector with the stored vectors and orders notes by distance. Smaller distance comes first. This gives us a ranking of the existing notes. The search itself doesn’t generate a new answer.

That makes the result inspectable: you can open the original text and decide whether it answers your need. The model can still rank something badly. A fluent-looking interface does not settle that question.

For our dinner example, the important observation is whether the recipe appears when we express the same need differently. We should test that behaviour with more than one attractive example.

**Stage cue:** Use the large “768” to explain representation. Avoid turning this into a lecture on vector maths.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/TransformersVectorService.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/SqliteNoteRepository.ts
- https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX

### 07. The search query

**9:30–11:00**

This is a shortened version of the query in the repository. We join the note text to its embedding by row ID, calculate L2 distance, remove soft-deleted notes, and sort the remaining rows.

The code then accepts only results with a distance below one. That rule needs evaluation against real examples. The screen’s “match” percentage is simply one minus distance, multiplied by a hundred. It is a display formula, not a probability that the note is correct.

There is another important detail. Even though the schema uses a vec0 table, this particular query explicitly calculates distance across the eligible rows and sorts them. It doesn’t use the dedicated nearest-neighbour query form. Having a vector extension in the project does not, by itself, prove that we have an efficient search plan at large scale.

For a small collection, a simple implementation is easy to inspect. If the collection grows, we should measure search time and examine the query plan before claiming it scales.

This is a good place to ask how many notes people actually need a personal tool like this to handle.

**Stage cue:** Read only the highlighted distance and order lines. Ask for one collection-size estimate if time allows.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/SqliteNoteRepository.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/presentation/components/NoteList.tsx
- https://alexgarcia.xyz/sqlite-vec/features/vec0.html

### 08. Two models, two jobs

**11:00–12:00**

There are two model pipelines. EmbeddingGemma produces the vectors for search. LaMini-Flan-T5 generates text that the app turns into suggested tags. They solve different jobs.

In the current startup path, the worker begins loading both models and waits for both before it sends the ready message. That couples the simplest thing a user wants to try, search, to the availability of the tagging model as well.

An obvious experiment is to initialise search first and load tagging when somebody asks for it. That is a proposed change, not the behaviour in this version.

I would also treat tags as suggestions to review. A generated tag can be unhelpful, too broad, or poorly formatted. The product has to make correcting it easy.

**Stage cue:** Keep this to a minute. The next slide gives the user-facing cost.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/app.worker.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/TaggingService.ts

### 09. The first-load bill

**12:00–13:30**

Local inference changes where we pay the cost. Before the app can do useful work, the browser needs the models. Then it needs memory and compute to run them.

Both pipelines in this checkout request fp32. The progress code budgets approximately 1,100 MiB for the embedding model and 300 MiB for tagging. Those are estimates written into the loading interface, not measured download totals. Together they are roughly 1.4 GiB, which tells us to think in gigabytes when planning the first-run experience.

The README still describes a much smaller download. This is exactly the kind of detail I want in a builder discussion: documentation and working configuration can drift apart.

We can explore smaller model files, another model, or loading the second task later. Each choice needs a quality check and an actual measurement on the browser and device we support.

For tonight, the practical choice is to warm the models before people arrive. The presentation should spend time on the system, rather than waiting for a progress bar.

**Stage cue:** Emphasise that the number is a code estimate, not a benchmark. Ask whether people would accept that first download for private notes.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/app.worker.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/TransformersVectorService.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/TaggingService.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/README.md

### 10. Three kinds of offline

**13:30–15:00**

“Offline” hides several different promises. The first is using the tab after it has already loaded. The second is reopening the application while the network is unavailable. The third is keeping the user’s notes across sessions.

Each promise depends on a different part of the system. Warm search needs the runtime and models already available. Reopening needs the application files as well. Keeping notes needs durable storage.

The custom service worker in this repository targets model URLs. It doesn’t explicitly cache the application shell: the HTML, JavaScript, and other files needed to start the app. So a successful search in our open tab does not prove that a fresh offline launch will work.

I would test each case separately in the deployed version. An ordinary browser HTTP cache can make a casual test look successful, so the rehearsal needs to be deliberate.

On stage, I’ll describe exactly the case we demonstrate. That gives people a useful result they can reproduce and a clear next improvement.

**Stage cue:** Refer back to the same-tab demonstration. Do not claim a fresh offline reload works without testing it.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/sw.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/main.tsx
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

### 11. When “saved” is temporary

**15:00–16:30**

The intended database lives in the browser’s origin-private file system, or OPFS. This implementation checks for cross-origin isolation, SharedArrayBuffer, and the SQLite OPFS support before opening it.

There is a fallback. If that path fails, the factory opens an in-memory database. The interface can still work: you add a note, search it, and feel that everything is fine. But a new session cannot rely on that temporary database surviving.

That fallback is convenient during development, and it changes the user’s meaning of “saved.” I would expose the storage mode clearly and make backup or export easy to find.

The deployment configuration already includes the isolation headers needed for the chosen SQLite path. We still need to confirm that the actual browser and host deliver the expected behaviour.

The test is simple to describe: save a note, close the session, reopen it, and verify that the note remains. Local storage is a product promise we need to test directly.

**Stage cue:** Make the consequence concrete: a note can appear saved while living only in memory. This is a conditional code path, not a claim that every run loses data.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/DatabaseFactories.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/vite.config.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/vercel.json
- https://sqlite.org/wasm/doc/trunk/persistence.md

### 12. A note has two representations

**16:30–18:30**

Here is my favourite discussion point in this code. A note exists as readable text in one table and as a vector in another. Those two representations have to describe the same content.

Creating a note computes the vector and stores both. But look at the edit path: the update use case calls the repository, and the repository updates the text and metadata. That path does not regenerate the embedding.

Imagine replacing a pasta recipe with a note about an API retry policy. The screen now shows the retry policy, while search can still rank that row using the old recipe vector. We could blame the model for a strange result when the real problem is stale derived data.

This is a finding from reading the current code. The exact search result depends on the model and threshold, so rehearse any live reproduction before promising it on stage.

The repair needs more than another model call. Generate the new embedding, then commit the new text and vector together. If embedding generation fails, keep the last consistent version. We should also consider what happens if a user edits the same note again before the first operation finishes.

This is familiar application engineering, made more consequential by a second representation that users cannot see.

**Stage cue:** Pause after showing the mismatch. Let the room identify why the search is wrong before describing the repair.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/application/UpdateNoteUseCase.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/infrastructure/SqliteNoteRepository.ts

### 13. What would you change first?

**18:30–20:30**

Let’s spend two minutes making an actual product decision. We have four possible next changes on screen: a smaller first download, more reliable retrieval, a dependable offline launch, or easier backup.

Pick one. Ask for a quick show of hands for each option, then take two people with different answers. What user or situation were you thinking about? What would make your choice wrong?

If the room is quiet, walk through two examples. Someone using this for a handful of personal notes may tolerate a download once, but will care deeply about losing their notes. Someone evaluating it during a five-minute break might leave before the models finish loading. The best next change depends on who we are building for.

For the current version, I would put correctness of saved data and its embedding very high. Then I would measure search quality with a small set of expected results. That is a starting position for the discussion, and the room may change it.

This is the part of a meetup that helps the next build: other people expose assumptions the builder has stopped noticing.

**Stage cue:** 0:00–0:25 explain the choices. 0:25–0:50 vote. 0:50–1:40 take two reasons. 1:40–2:00 state the trade-off you heard. Use the two examples if nobody speaks.

### 14. The next experiments

**20:30–22:00**

Here is a concrete next pass I would try. First, make a note edit update its text and embedding consistently. The success condition is that searching uses the edited content.

Second, split startup so tagging can wait until somebody needs it. Measure the time from opening the app to the first useful search, both with an empty cache and with a warm cache. Do not combine those into one number.

Third, make a small evaluation set: around twenty queries with the notes we expect to retrieve. Include paraphrases, exact names, an unrelated query, and some Greek and English examples. That is a proposed test set, not a quality score for the current app.

Finally, exercise persistence and offline launch deliberately. Close and reopen the browser, check the storage mode, and make sure the user can take a backup.

Each experiment should answer one question. That lets us keep the next version small enough to understand when something improves or breaks.

**Stage cue:** Frame these as proposed experiments, not completed features or commitments.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/application/UpdateNoteUseCase.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/app.worker.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/sw.ts

### 15. Where an agent could fit

**22:00–23:30**

Because this is AI Builders SKG, it is worth placing this project in an agent workflow. What we have today is a local retrieval application. A future agent could call this search capability when it needs relevant notes.

For example, a planning assistant could request notes about a meeting, inspect the returned passages, and use them as context. The search tool would return the original text and a stable note identifier. That gives the caller something it can cite and the person something they can inspect.

If that assistant runs remotely, sending it the retrieved notes changes the privacy boundary. Keeping the vector search local is only one part of the data flow. We would need to choose where the agent runs and what it is allowed to receive.

Before building the larger loop, I would make this tool dependable on its own: clear inputs, useful results, and understandable failures. That is a reusable piece whether the caller is a person, a script, or an agent.

**Stage cue:** The agent integration is a future possibility. Keep the current project’s scope explicit.

Sources:

- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/application/SearchNotesUseCase.ts
- https://github.com/blackpr/local-vector-search/blob/c3705c5/src/domain/SearchService.ts

### 16. Your next small build

**23:30–25:00**

If you take one thing from this, I hope it is that you can build a useful AI feature around a very ordinary problem. In this case, finding a note gave us a reason to learn about embeddings, browser compute, storage, and the edges between them.

The repository is here if you want to look through it. There are enough rough edges to make the next conversation interesting, and enough of a system to give us something concrete to discuss.

What is one small thing you wish you could find, classify, or organise locally? Think about the smallest collection of data that would let you try it. Then think about how you would know the result was useful.

After this, I would love to hear your answer, especially if you have already tried something and hit a problem. That is a great future talk for this group. Bring the thing you built and the part you still haven’t figured out.

Thanks. I’ll stay around, and we can carry on with the demo and the discussion over our drinks.

**Stage cue:** Leave the repository and meetup links on screen. Take one short response, then let conversation continue informally.

Sources:

- https://github.com/blackpr/local-vector-search
- https://www.meetup.com/ai-builders-skg/

