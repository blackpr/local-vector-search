# brain-eval

Checks that the questions people are likely to ask actually retrieve the right note from `talk-brain.json`, using the same model, weights (q4), prefixes, pooling and L2 distance as the app.

```bash
cd presentations/ai-builders-skg/brain-eval
node eval.mjs                # uses the repo's node_modules; first run downloads the model (~200 MB)
node eval.mjs ./stump.json   # the "stump the model" queries; MISS here just means "no expected note"
DT=fp32 node eval.mjs        # compare against the full-precision weights
```

Each line: `OK/MISS`, distance of the top hit, the query, the note it returned, and the runner-up. The app hides anything with distance >= 1.0.

Last run (19 Sep 2026, Node, CPU): 36 of 37 queries returned the expected note on top (q4). An earlier 32-query version gave identical results with fp32, q8 and q4. The last one is `the weather in london tomorrow`, which is supposed to return nothing (top distance 1.07, above the cutoff).

Add a line to `queries.json` as `["the question", "a substring of the note you expect"]` whenever you add a note.
