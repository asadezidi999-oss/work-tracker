# MYSTERY REWARDS REPORT

**Date:** 2026-06-15
**App:** ألمانيتي (Almaniyati) — German Learning PWA

---

## 1. Modified UI Texts

### 1.1 Reward Titles (REWARDS array)

| ID | Old Title | New Mystery Title |
|----|-----------|-------------------|
| `farida25` | ☕ قهوة مميزة | 🎁 صندوق سري |
| `farida50` | 🍰 حلوى مفضلة | ✨ مفاجأة جديدة |
| `farida100` | 🎬 ليلة فيلم | 💜 هدية خاصة |
| `farida300` | 🎁 مفاجأة خاصة | 👑 مفاجأة استثنائية |

No reward uses "الأول", "الثاني", or "الثالث". No sequential numbering is used.

### 1.2 Unlocked Reward Card (renderRewards)

| Before | After |
|--------|-------|
| Shows real title + code "FARIDA25" | Shows mystery title only — **code removed** |
| "🎉 مفتوح! الكود: FARIDA25" | "🎉 انفتحت مفاجأتكِ!" |

### 1.3 Redemption Confirmation Dialog

| Before | After |
|--------|-------|
| "المكافأة: ☕ قهوة مميزة\nالكود: FARIDA25\n\nهل تريد تأكيد الاستلام؟" | "هل تريدين فتح مفاجأتكِ الجديدة؟" |

### 1.4 Post-Redeem Message

| Before | After |
|--------|-------|
| `showToast('🎉 تم استلام {title}! الكود: {code}')` | **New modal** with code + copy button (see 1.5) |

### 1.5 New Redeem Modal

```html
<div class="modal-overlay" id="redeem-modal">
  <div class="modal-sheet">
    🎉
    انفتحت مفاجأتكِ الجديدة!
    الكود السري الخاص بكِ:
    {code}  ← large yellow text
    📋 نسخ الكود  ← copy button
    انسخي الكود وأرسليه لي عندما تكونين جاهزة لاكتشاف هديتكِ الحقيقية. 💜
    تم  ← dismiss button
  </div>
</div>
```

### 1.6 Unlock Toast (checkRewards)

| Before | After |
|--------|-------|
| "🎁 انكشفت مفاجأة جديدة! تفقدي المكافآت" | "🎁 انكشفت مفاجأة جديدة!" (more mysterious, no action hint) |

---

## 2. Unchanged State Fields

| Field | Type | Status |
|-------|------|--------|
| `state.rewardsUnlocked` | `string[]` | **Unchanged** — same IDs pushed at same thresholds |
| `state.redeemedAt` | `Record<string, string>` | **Unchanged** — same ISO timestamps |
| `state.wordsLearned` | `number` | **Unchanged** — same unlock metric |
| `state.redeemedCodes` | `string[]` | **Unchanged** — legacy field, migration still applies |
| `state.name` | `string` | **Unchanged** — used in post-redeem modal via `{{name}}` (not applicable here) |

---

## 3. Unchanged Logic

| Area | Status |
|------|--------|
| Reward unlock conditions | **Unchanged** — 25/50/100/300 words |
| Reward IDs | **Unchanged** — `farida25`, `farida50`, `farida100`, `farida300` |
| Reward codes | **Unchanged** — `FARIDA25`, `FARIDA50`, `FARIDA100`, `FARIDA300` |
| `redeemedAt` timestamp logic | **Unchanged** — `new Date().toISOString()` |
| `checkRewards()` flow | **Unchanged** — called from `addXP()` |
| `renderRewards()` rendering | **Unchanged** — same structure, only text changed |
| Reward history display | **Unchanged** — redeemed rewards disappear from list |
| SM-2 logic | **Unchanged** |
| Achievement system | **Unchanged** |
| Backup/restore | **Unchanged** |
| PWA / offline | **Unchanged** |
| Accessibility | **Unchanged** — redeem modal uses `role="dialog"`, `aria-modal="true"`, focus management |

---

## 4. Owner-Only Information

The following data exists **only** in `FARIDA_OWNER_GUIDE.md` and **never** in the app UI:

| Code | Real Gift |
|------|-----------|
| `FARIDA25` | ☕ قهوة مميزة |
| `FARIDA50` | 🍰 حلوى مفضلة |
| `FARIDA100` | 🎬 ليلة فيلم |
| `FARIDA300` | 🎁 مفاجأة خاصة |

Also exclusively in the owner guide:
- Total reward count (4)
- Exact unlock thresholds for all rewards
- The fact that real gifts are physical/experiential
- The mapping between mystery titles and real gifts

---

## 5. Backward Compatibility Verification

### 5.1 Existing Users with Unlocked Rewards

| Scenario | Behavior |
|----------|----------|
| User has `state.rewardsUnlocked = ["farida25"]` but `redeemedAt` is empty | Reward shows with new mystery title. No code visible until redemption. Post-redeem modal shows code. |
| User has `state.redeemedAt.farida25 = "2026-01-01T00:00:00Z"` | Reward already redeemed → not shown in pending list. No change in behavior. |
| User has both unlocked and redeemed rewards | Redeemed rewards still hidden. Unredeemed rewards show new mystery UI. |

### 5.2 Backup Export/Import

| Scenario | Behavior |
|----------|----------|
| Old backup imported (with old title format in app code) | The `REWARDS` array is in app JS, not in backup data. The app always uses current `REWARDS` titles. Import works identically. |
| New backup exported | Same fields as before. No new fields added. No changes to backup schema. |

### 5.3 localStorage Migration

| Scenario | Behavior |
|----------|----------|
| Old user data with `redeemedCodes` but no `redeemedAt` | Migration still runs. `redeemedAt` populated from `redeemedCodes`. Display uses new mystery UI. |
| New user (fresh install) | No legacy data. All fields at defaults. Full mystery experience from the start. |

### 5.4 Surprise Mode

| Scenario | Behavior |
|----------|----------|
| Farida never sees the Rewards tab | The mystery persists until she navigates there. The unlock toast is generic ("انكشفت مفاجأة جديدة!"). |
| Farida opens Rewards tab | Sees mystery title only. Code is never shown until she clicks "استلام" and confirms. |
| Farida redeems a reward | Post-redeem modal shows code for the first time. Copy button helps her send it to the owner. |

### 5.5 Offline Mode

| Scenario | Behavior |
|----------|----------|
| User redeems reward while offline | ✓ Works — all logic is client-side. `clipboard.writeText` may fail; fallback to `execCommand('copy')` is provided. |
| User views reward while offline | ✓ All state and UI are local. |

### 5.6 Timeline

| Scenario | Behavior |
|----------|----------|
| Reward unlocked before update | Mystery title applies retroactively — old title is replaced in the `REWARDS` constant. Code still available via new redeem modal if not yet redeemed. |
| Reward redeemed before update | Already redeemed — no change. |
| Reward unlocked after update | Full mystery experience from unlock. |

---

## 6. Architectural Notes

### Redeem Modal Implementation

- **Location**: HTML: lines ~1635-1650 (after dialog-modal); JS: before `redeemReward()`
- **Functions**:
  - `showRedeemModal(code)` — opens the modal, sets code text, focuses copy button
  - `closeRedeemModal()` — closes modal, restores body scroll
  - `copyRedeemCode()` — copies code to clipboard via `navigator.clipboard.writeText()` with `execCommand('copy')` fallback
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, `aria-label="هديتك الجديدة"`. Focus sent to copy button on open. Click overlay to close.
- **Clipboard feedback**: "📋 نسخ الكود" → "✅ تم النسخ!" for 2 seconds → back to "📋 نسخ الكود"

### Code Reveal Flow (correct order)

```
Unlock threshold reached
  → Toast: "🎁 انكشفت مفاجأة جديدة!"
  → Rewards screen: mystery title + "🎉 انفتحت مفاجأتكِ!" + button
  → Click "استلام"
    → Confirm modal: "هل تريدين فتح مفاجأتكِ الجديدة؟"
    → Confirm → saveState()
    → Post-redeem modal: code displayed with copy button
    → User copies code and sends to owner
```

---

## 7. Files Changed

| File | Changes |
|------|---------|
| `index.html` | REWARDS titles (4 lines), unlocked card text, confirm dialog text, unlock toast, new redeem modal HTML + JS functions, new post-redeem modal call |
| `FARIDA_OWNER_GUIDE.md` | Updated REWARDS code block, individual reward tables, redemption flow, surprise mode sections, what-remains-hidden table, testing checklist, owner summary, added code reveal flow |
| `MYSTERY_REWARDS_REPORT.md` | **(this file)** |
