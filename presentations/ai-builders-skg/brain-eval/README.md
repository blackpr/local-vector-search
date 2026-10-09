# brain-eval

Checks that the questions people are likely to ask actually retrieve the right note from `talk-brain.json`, using the same model, weights (q4), prefixes, pooling and L2 distance as the app.

```bash
cd presentations/ai-builders-skg/brain-eval
node eval.mjs                # uses the repo's node_modules; first run downloads the model (~200 MB)
node eval.mjs ./stump.json   # the "stump the model" queries; ---- means "no right answer, just look"
DT=fp32 node eval.mjs        # compare against the full-precision weights
```

Each line: a verdict, distance of the top hit, the query, the note it returned, and the runner-up. The app hides anything with distance >= 1.0, and so does the verdict: a right note past the cutoff is a MISS, because the app wouldn't show it.

In `queries.json` the second value is a substring of the note you expect, or `null` when the app should show nothing (the London weather question). In `stump.json`, `"zzz"` means there's no right answer: the line prints `----` and you just look at what came back.

Last run (9 Oct 2026, Node, CPU, q4): 48 of 49 OK. `the weather in london tomorrow` correctly shows nothing (nearest note at 1.07, past the cutoff). The one MISS is `I'm hungry and it's 5am`: the bougatsa note is the nearest, but at 1.03 it's just past the cutoff, so the app shows nothing. Runs before 9 Oct counted that as OK because the script didn't apply the cutoff. An earlier 32-query version gave identical results with fp32, q8 and q4.

Add a line to `queries.json` as `["the question", "a substring of the note you expect"]` (or `null` for "should show nothing") whenever you add a note.
