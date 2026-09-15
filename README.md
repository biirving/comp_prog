# Fieldwork

A personal **Electron + TypeScript** app for steady Codeforces practice. Seeded for `marcellus_at_syracuse`, with a cached catalog of 10,731 rated problems from September 14, 2026.

## Run

```sh
npm install
npm start
```

Node 22+ is required. `npm start` builds the TypeScript renderer and native process, then launches Electron.

On Apple Silicon macOS, build a standalone app with:

```sh
npm run package
```

Open `release/Fieldwork-darwin-arm64/Fieldwork.app`. This is a local unsigned build, not a notarized public release.

`npm run dev` starts a browser preview at http://localhost:5173. Its storage is separate from Electron. Native C++ checks work in the desktop app. Export/import transfers progress between them.

## Your daily loop

1. Open **Today**, choose 30, 45, or 60 minutes, and start the recommended problem.
2. Recall an idea, read the original Codeforces statement, and solve in the C++ workspace.
3. Use **Check C++** for compiler diagnostics. Use **Copy & open submission** to copy your source and open the contest submission page in your normal browser. Select the indicated problem and GNU C++17 or newer, paste, and submit. You log in to Codeforces in your browser; Fieldwork does not collect your password.
4. Click **Sync acceptance** after judging finishes. This links public submission results to your attempt.
5. Finish and reflect. Indicate independent / assisted / unfinished and the main blocker. The next review is scheduled automatically.

The Progress screen has a Continue practice button that starts the next recommended problem, or a Resume session button for unfinished work.

The timer can pause, survive a restart, or extend by 15 minutes. Leaving the focus view pauses it. A running timer restored after a crash counts elapsed wall time up to restoration, then pauses. The app stores notes and C++ source with completed attempts.

## Strict category progression

The 18 practice categories cover the 11 major sections of [YouKn0wWho Academy's topic list](https://youkn0wwho.academy/topic-list). They are an app-specific mapping of official Codeforces tags, not a copy of the full Academy curriculum.

Each category independently advances after:

- Three **different** problems at its exact practice rating, solved independently. A previously assisted problem can earn this credit through an independent recall at least 48 hours after an earlier attempt; immediate repetition cannot.
- An accepted repeat of one of those problems **at least 48 hours later**.
- Each qualifying attempt takes at most **25 active minutes**, uses no hints/editorials, and has the reasoning, complexity, and edge-case checks completed.
- Each qualifying attempt is verified by a Codeforces acceptance timestamp after its session began, including repeats.

Only the selected category receives credit. Historical accepts exclude problems from fresh recommendations but do not create mastery credit. Independence and checklist completion are self-reported; Codeforces verifies acceptance, not whether a solution was independent. Acceptance timestamps do not prove that the exact code in the app was submitted.

Most bands advance in 100-point increments. A category requires at least three problems at a rating to support a band. Sparse or missing bands are unavailable and never marked cleared. For example, the seeded catalog starts disjoint sets and shortest paths at 1100 and trees at 1200. Starting targets are not earned ratings. A category's last cleared band is shown separately.

The planner rotates toward least recently practiced categories. It alternates overdue reviews and new problems so a review backlog cannot consume every session. Reviews return after 1 day for unfinished work, 2 days for assisted/unqualified attempts, then 7, 21, and 45 days after qualifying repeats. Parked problems are deferred for seven days. Off-band problems in the library remain available as free practice and cannot skip progression requirements.

The practice bands are evidence of this training process, not predictions of contest rating or guaranteed interview readiness. Codeforces tags overlap; a tagged problem need not require every tagged technique. Codeforces-only work also leaves some interview-specific skills outside the scope of this app.

## C++ support

- **Copy code**, **Paste code**, and **Select all** buttons are beside the editor. Copy copies the entire solution; Paste replaces the selection or inserts at the cursor and can be undone. System Cmd/Ctrl+A, C, and V shortcuts work in both Vim Normal and Insert modes.
- Vim keybindings enabled by default: Normal/Insert/Visual modes, motions, operators, search, and undo. Press `i` to insert and `Esc` to return to Normal mode. Code autosaves as you edit.
- Monaco editor with highlighting, bracket pairing, find, keyword completion, and C++ snippets (`Ctrl+Space`).
- Local Clang C++17 syntax/type diagnostics with error markers. **No executable is run** by this check.
- Apple Clang lacks `bits/stdc++.h`; the checker provides a compatibility header containing common standard headers. GNU-specific extensions, policy-based structures, and exact judge behavior may differ.
- Full semantic completion, automatic compiler fixes, a language server, and local sample execution are not included. Use Codeforces for the official tests.
- On macOS, install a compiler with `xcode-select --install` if necessary. The current development machine has Apple Clang 17.

## Data and account connection

Electron saves progress atomically in `app.getPath('userData')/progress.json` (normally `~/Library/Application Support/fieldwork/` for a development launch). Export a JSON backup from Settings. Import validates the file and asks before replacing progress. No analytics, backend account, or hosted database is used.

In Settings, enter a username and press **Enter** or **Save handle & sync**. The username stays editable after practice starts. Each handle keeps separate sessions, code, notes, and progression; switching back restores that account’s saved work. A failed sync leaves the tracked account unchanged.

**Save handle & sync** uses the public `user.info` and paginated `user.status` APIs. Requests are serialized with at least 2.1 seconds between calls. **Refresh official ratings** uses `problemset.problems`. The catalog is cached for offline browsing. Network errors preserve saved state. Logged attempts keep their original problem rating when the catalog changes.

The desktop process exposes narrow IPC methods, uses a sandboxed renderer with Node integration disabled, validates senders, serves bundled assets through a custom secure protocol, and restricts external links to known HTTPS domains.

## Verification

```sh
npm test             # progression, planner, storage validation, compiler checks
npm run typecheck
npm run build
./node_modules/.bin/electron tests/desktop-smoke.mjs
```

The desktop smoke test uses a temporary app-data directory, exercises the actual renderer and native compiler, checks persistence and review scheduling, and syncs the public Codeforces account. It does not submit solutions. Screenshots are written to `artifacts/`.

## Code layout

- `src/app.ts` — application views and session interactions
- `src/engine.ts` — pure progression and recommendation rules
- `src/topics.ts` — Academy-inspired coverage mapped to Codeforces tags
- `src/editor.ts` — C++ editor and compiler markers
- `electron/main.ts` — desktop lifecycle, persistence, public API and external links
- `electron/compiler.ts` — bounded local syntax checks
- `public/catalog.json`, `public/seed.json` — offline problem and account snapshots

Problem statements remain on Codeforces; this app stores metadata and links to the official site.
