# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (HMR enabled)
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test suite currently exists.

## Philosophy

**Not a solver. Not a math lecture.** Think of this as chess puzzles for poker — quick, snappy scenarios that build real intuition for beginners and intermediate players. Each hand teaches a concept through instant feedback and plain-English explanations.

No GTO solvers, no equity grids, no range trees. Just reps: play a hand, get a read, get better.

### Design Principles

- **Intuition over theory:** Emphasize readable, human-facing explanations. Narrative text avoids jargon when possible; glossary links educate without lecturing.
- **Immediate feedback:** Evaluations (green/yellow/red) and explanations happen instantly. No waiting. No multi-stage analysis.
- **Snappy narratives:** Outcome-aware text that reconciles correct/incorrect decisions. Rotating opener pools prevent repetition and keep the tone fresh.
- **Reproducible hands:** Every scenario has a seed; users can replay exact hands, review mistakes, and learn from patterns.
- **Logic–UI separation:** Pure game logic in `poker-engine.js` (no React), pure constants in `poker-data.js`, explanation logic in `narrative.js`, UI and state management in `App.jsx`. Clean module boundaries, no cross-file state.
- **Design tokens:** All visual constants (`T` object) live in `poker-data.js`. Consistency through a single source of truth.

## Code Style

- **Comments sparingly:** Only explain complex logic. Self-evident code needs no comment.
- **Inline components:** Keep sub-components in `App.jsx` to maintain state locality and avoid prop drilling.

## Architecture

A React + Vite poker decision trainer — a puzzle-style app where users practice GTO-ish decisions and receive immediate feedback.

### Module Roles

**`src/poker-data.js`** — Pure constants. Design tokens (`T` object for all colors/sizes), card definitions, position arrays, opponent profiles (tight/neutral/aggro), preflop opening ranges (`OPEN`, `BB_VS`, `SB_VS`), and 40+ glossary definitions. Import `T` here for any styling.

**`src/poker-engine.js`** — Pure JS, no React dependency. Contains all game logic:
- `genScenario(seed)` — Seedable PRNG (mulberry32) generates deterministic hands; quality-filtered
- `evalPre` / `evalPost` — Decision evaluation; runs MC equity vs opponent ranges, returns `{rating, bestAction, explanation, evDiff}`; rating is `green/yellow/red`
- `mcEquity(hand, board, range, n=500)` — Monte Carlo equity simulation
- `classify(hand, board)` — Hand strength classification (trash → monster)
- `detectDraws(hand, board)` — Flush/straight/gutshot detection with out counts
- `analyzeBoard(board)` — Wet/dry/mixed texture analysis
- `getRange / getRangeWithFallback` — Opponent-type + action aware range generation with progressive fallbacks
- `debugRun / debugToCSV / debugSummary` — Built-in debug harness (100-hand batch testing)
- `loadLocal / saveLocal / loadSettings / saveSettings` — localStorage persistence

**`src/narrative.js`** — Decision-tree explanation generator. Context-aware text (position, opponent, equity, board texture). Uses rotating opener pools to avoid repetition. Called after `evalPre`/`evalPost` to build the human-readable feedback string.

**`src/App.jsx`** — Single large React component (~990 lines). All UI, all state. Manages 7 screens (menu, game, stats, settings, debug, etc.), hand history, replay/mistake modes, CSV export/import, animations, and responsive layout. All sub-components (`CCard`, `EqMeter`, `NT`, `PB`, etc.) are defined inline here.

### Data Flow

```
genScenario(seed) → scenario object
User action → evalPre/evalPost → {rating, bestAction, evDiff}
                              → buildNarrative(context) → explanation string
App renders feedback, updates stack/history, triggers animations
```

### Key Design Decisions

- **Thresholds in evalPost:** `0.62` equity to raise, `0.08` equity gap triggers yellow (close spot), `0.04` gap between call/fold
- **Seed system:** Every hand has a reproducible seed stored in history, enabling exact replay and mistake review
- **Mistake mode:** After a session, users replay their 5 worst hands; correct all 5 = bonus BB reward
- **Base path:** Vite is configured with `base: '/poker-trainer/'` for GitHub Pages deployment

### Styling

All visual constants live in the `T` object in `poker-data.js`. Use `T.green`, `T.bg`, `T.radius`, etc. rather than hardcoded values. Breakpoint for mobile layout is `750px`.

## Quick Reference

### Eval Ratings

- **Green (correct):** User action matches `bestAction` from `evalPre`/`evalPost`.
- **Yellow (marginal):** Close spot; equity gap is `0.08` or less but action is reasonable.
- **Red (incorrect):** Significant equity mistake; gap exceeds threshold or action conflicts with hand strength.

### Key State (App.jsx)

- `gamePhase` — Screen state: `"menu"`, `"game"`, `"stats"`, `"settings"`, `"debug"`, `"replay"`, `"mistakes"`
- `currentScenario` — Active hand: `{hand, board, position, opponent, street, seed, action, ...}`
- `history` — Array of past scenarios with seeds, actions, ratings, explanations
- `stack` — Current chip count; increments on correct, penalties on mistakes
- `stats` — Session totals: `{played, correct, close, wrong}`

### Utility Functions (poker-engine.js)

- `hn(card1, card2)` — Hand notation: `"AKs"`, `"88"`, `"KQo"`
- `cstr(card)` — Card string: `"As"`, `"Kh"`
- `classify(hand, board)` — Hand strength: `"trash"` → `"monster"`
- `genScenario(seed)` — Generate deterministic hand with quality filters
- `evalPre(hand, position, opponent)` → `{rating, bestAction, explanation, evDiff}`
- `evalPost(hand, board, action, opponent)` → same structure
- `mcEquity(hand, board, range, n)` — Monte Carlo sim, default 500 samples
- `debugRun(numHands, seed)` — Batch test, returns stats; `debugToCSV()` exports results

### Naming Patterns

- Positions: `"UTG"`, `"MP"`, `"CO"`, `"BTN"`, `"SB"`, `"BB"`
- Streets: `0` = preflop, `1` = flop, `2` = turn, `3` = river
- Opponents: `"tight"`, `"neutral"`, `"aggro"` (keys in `OPP` object)
- Actions: `"Fold"`, `"Check"`, `"Call"`, `"Bet"`, `"Raise"`, `"3-Bet"`
- Glossary lookup in `narrative.js`'s `findGloss()` (case-insensitive)

### Debugging Workflow

1. Run `debugRun(100, seed)` in console to batch-test hands
2. Export via `debugToCSV()` → CSV file for analysis
3. Use `localStorage` inspection: `loadLocal('history')` returns full hand history
4. Replay exact hand: `genScenario(decodeSeed(handSeed))` regenerates hand from seed
