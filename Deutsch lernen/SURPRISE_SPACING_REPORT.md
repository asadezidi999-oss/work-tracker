# Surprise Spacing Report

**Date:** 2026-06-15  
**Purpose:** Verify that no two surprises (reward unlock + capsule unlock + celebration) fire at the same word count, ensuring a smooth one‑at‑a‑time experience.

---

## Full Milestone Schedule

```
 25w ─ capsule25
 30w ─ farida25 (reward)
 50w ─ capsule50
 60w ─ farida50 (reward)
110w ─ farida100 (reward)
200w ─ capsule200
275w ─ farida300 (reward)
300w ─ Celebration overlay
   ─── capsuleA1 (triggered by A1 lessons, independent of word count)
```

### Gap Analysis

| From | To | Gap | Notes |
|------|----|-----|-------|
| 25  | 30  | 5   | Capsule → reward |
| 30  | 50  | 20  | Reward → capsule |
| 50  | 60  | 10  | Capsule → reward |
| 60  | 110 | 50  | Reward → reward (farida50 → farida100) |
| 110 | 200 | 90  | Reward → capsule |
| 200 | 275 | 75  | Capsule → reward |
| 275 | 300 | 25  | Reward → celebration |

No two events share a word count. Minimum gap is **5 words** (25→30).

---

## Change Log (2026-06-15 — Farida300 repriced)

| Change | Old | New | Reason |
|--------|-----|-----|--------|
| farida300 unlockAt | 310 | 275 | Vocabulary dataset has 300 words; 310 was unreachable |
| All other milestones | unchanged | unchanged | User constraint |

---

## Changed Data Constants

### REWARDS (unlockAt only)

| ID        | Old unlockAt | New unlockAt |
|-----------|-------------|-------------|
| farida25  | 25          | 30          |
| farida50  | 50          | 60          |
| farida100 | 100         | 110         |
| farida300 | 300         | 275         |

**IDs, codes, and titles unchanged.**

### TIME_CAPSULES (renamed + re‑milestoned)

| Old ID       | Old unlockAt | New ID       | New unlockAt |
|--------------|-------------|--------------|-------------|
| capsule25    | 25          | capsule25    | 25          |
| capsule100   | 100         | capsule50    | 50          |
| capsuleA1    | all_a1      | capsuleA1    | all_a1      |
| capsule300   | 300         | capsule200   | 200         |

**Messages updated** to match new word counts (capsule200 now says "مئتا كلمة" instead of "٣٠٠ كلمة").

---

## Affected Functions

All unlock logic is generic (no hardcoded milestone values):

| Function | Mechanism | Impact |
|----------|-----------|--------|
| `checkRewards()` | Filters `REWARDS` by `wordsLearned >= r.unlockAt` | Auto‑adapts — no change needed |
| `checkTimeCapsules()` | Iterates `TIME_CAPSULES`, checks `wordsLearned >= c.unlockAt` | Auto‑adapts — no change needed |
| `renderNextGoalCard()` | Computes remaining from `REWARDS` data | Auto‑adapts |
| `renderJourney()` | Computes remaining from both data arrays | Auto‑adapts |
| `renderCapsules()` | Iterates `TIME_CAPSULES` | Auto‑adapts |
| `renderSurprises()` / `renderRewards()` | Filter by unlockAt | Auto‑adapts |
| `_enqueueSurprise()` | Uses data from constants | Auto‑adapts |

**No function logic was modified** — only the data constants changed.

---

## Migration Logic (in `loadState()`)

```js
// Map old capsule IDs to new spaced IDs
const capMap = { capsule100: 'capsule50', capsule300: 'capsule200' };
state.capsulesUnlocked = state.capsulesUnlocked.map(id => capMap[id] || id);

// Filter deferred rewards against current REWARDS array
if (Array.isArray(state.deferredRewards)) {
  const validIds = REWARDS.map(r => r.id);
  state.deferredRewards = state.deferredRewards.filter(id => validIds.includes(id));
}
```

- Users who had capsule100 unlocked → now own capsule50 (same message, earlier milestone).
- Users who had capsule300 unlocked → now own capsule200 (updated message, earlier milestone).
- Users who had a deferred reward for an old‑unlockAt reward keep it (ID unchanged).
- Users who had NOT yet reached the old thresholds simply see the new thresholds.

---

## Compatibility Verification

| Area | Status | Notes |
|------|--------|-------|
| All reward/capsule IDs referenced in JS | ✅ IDs unchanged (capsules renamed, migration provided) |
| `state.rewardsUnlocked` / `state.capsulesUnlocked` | ✅ String IDs — no format change |
| `state.redeemedAt` keys | ✅ Reward IDs unchanged |
| SM‑2, achievements, XP, level | ✅ Untouched |
| Backup format | ✅ Same fields, same IDs |
| localStorage schema | ✅ No new fields added |
| PWA / Service Worker | ✅ Unchanged |
| `tests.html` | ✅ No reward/capsule references |
| Old user data from before migration | ✅ Migration in `loadState()` handles old IDs |

---

## Testing Scenarios

### Scenario 1: New User (clean state)
1. Start at 0 words
2. Learn → observe unlocks at correct spaced intervals
3. Verify countdown formulas: `بقي X كلمة` = `unlockAt − wordsLearned`
4. Verify only one surprise fires per word count

### Scenario 2: Existing User at 150 words
1. Load data with `capsulesUnlocked: ['capsule25', 'capsule100']`, `rewardsUnlocked: ['farida25', 'farida50']`
2. Verify migration maps `capsule100` → `capsule50`
3. Verify farida100 is pending (110‑word threshold already passed)
4. Learn 50 more words → verify farida100 fires at 200 (not at a different threshold)

### Scenario 3: Rapid Learning
1. Learn 50 words in one session (e.g., 25→50 in 3 clicks)
2. Verify queue processes in order: capsule25 → farida25 → capsule50
3. Verify no duplicate surprises
4. Verify Later button defers to Rewards screen

### Scenario 4: Farida300 + Celebration
1. Reach 275 words → farida300 fires, code revealed
2. Learn 25 more words → celebration fires at 300
3. Verify farida300 does NOT re‑fire
4. Verify achievement "ثلاثمئة كلمة" fires alongside celebration
