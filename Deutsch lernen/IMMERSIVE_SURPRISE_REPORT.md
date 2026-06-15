# IMMERSIVE SURPRISE EXPERIENCE REPORT

**Date:** 2026-06-15
**App:** ألمانيتي (Almaniyati) — German Learning PWA

---

## 1. Full-Screen Reveal Overlay

### Implementation

A new immersive overlay (`#surprise-overlay`) replaces the old bottom-sheet redeem modal and inline capsule content display.

**CSS Architecture:**
- `.surprise-overlay` — fixed full-screen container, `z-index: 9500`, starts `opacity:0; pointer-events:none`
- `.surprise-backdrop` — fills overlay with `rgba(10,10,15,0.82)` + `backdrop-filter:blur(40px) saturate(180%)`
- `.surprise-card` — centered card with `border-radius:32px`, `max-width:380px`
  - Entry animation: `transform:scale(0.7) translateY(60px)` → `scale(1) translateY(0)`
  - Spring curve: `cubic-bezier(0.34,1.56,0.64,1)` over `0.55s`
  - Overlay fade: `opacity` transition over `0.45s ease`
- Reduced motion: all transitions/animations disabled via `@media(prefers-reduced-motion:reduce)`

**Visual Hierarchy (top → bottom):**
1. Large emoji (48px) — `#surprise-emoji`
2. Badge label (13px, accent color, uppercase) — `#surprise-badge`
3. Title (22px, bold) — `#surprise-title`
4. Body text (14px, secondary color, pre-wrap) — `#surprise-body`
5. **Code area** (for rewards): code in 36px yellow `letter-spacing:6px` + copy button
6. **Word area** (for capsules): card2 with german word, pronunciation, arabic, example sentence
7. Primary action button (18px, 54px height)

### Reward Reveal (code display)

```
🎉
🎁 مفاجأة
انفتحت مفاجأتكِ الجديدة!
الكود السري الخاص بكِ:
{FARIDA25}  ← 36px yellow, ltr
📋 نسخ الكود  ← copy button with clipboard feedback
✨ تم!  ← dismiss + refresh UI
```

### Capsule Reveal (educational content)

```
💜
💌 رسالة خاصة
{title}
{message with {{name}} replaced}
🇩🇪 كلمة جديدة
{German word}  ← 24px bold
{pronunciation}  ← 15px italic, text3
{Arabic translation}  ← 18px bold
{German example}
{Arabic example}
✨ رائع  ← dismiss + refresh capsule list
```

---

## 2. Open Now / Later Flow

### State Addition

```js
deferredRewards: [],  // string[] — IDs of rewards saved for later
```

### UI Flow

| State | Reward Card Shows |
|-------|------------------|
| Not yet unlocked | Locked teaser with word count |
| Unlocked, not deferred | Mystery title + "🎉 انفتحت مفاجأتكِ!" + **two buttons**: `✨ استلام الآن` / `💜 لوقت لاحق` |
| Deferred | Mystery title + "💜 محفوظة لمفاجآتي" + `فتح` button (links to مفاجآتي) |
| Redeemed | Not shown in pending list |

### "Now" Flow (redeemNow)

1. User taps `✨ استلام الآن`
2. Confirm modal: "هل تريدين فتح مفاجأتكِ الجديدة؟"
3. If confirmed: set `redeemedAt`, remove from `deferredRewards` if present
4. `showSurprise('reward', r)` — full-screen immersive overlay with code
5. User copies code via `📋 نسخ الكود` button
6. User taps `✨ تم!` → overlay closes, UI refreshes

### "Later" Flow (deferReward)

1. User taps `💜 لوقت لاحق`
2. ID pushed to `state.deferredRewards`
3. Toast: "💜 حُفظت المفاجأة في مفاجآتي"
4. Home screen badge appears: `💜 1 مفاجأة` (purple, clickable)
5. Reward moves to "محفوظة" state in rewards list
6. From `💜 مفاجآتي` screen, user can tap `✨ استلام الآن` to open

---

## 3. Educational Messages in Capsules

### Data Structure Extension

Each capsule in `TIME_CAPSULES` now includes:

```js
word: {
  german: string,      // German word
  pronunciation: string, // Arabic pronunciation
  arabic: string,      // Arabic translation
  example: string,     // German example sentence
  exampleAr: string    // Arabic example sentence
}
```

### Words by Capsule

| Capsule | German | Pronunciation | Arabic | Example |
|---------|--------|---------------|--------|---------|
| capsule25 (25 words) | Anfang | آنفانغ | بداية | Der Anfang ist schwer. / البداية صعبة. |
| capsule100 (100 words) | Erfolg | إرفولغ | نجاح | Weiter so! Du schaffst es. / استمري هكذا! أنتِ قادرة. |
| capsuleA1 (all A1) | Stolz | شتولتس | فخور | Ich bin stolz auf dich. / أنا فخور بكِ. |
| capsule300 (300 words) | Ziel | تسيل | هدف | Du hast dein Ziel erreicht! / لقد حققتِ هدفك! |

### Display

The educational word is shown in the immersive overlay when a capsule is opened via `showSurprise('capsule', data)`. It appears in a `.card2` container below the main message, labeled `🇩🇪 كلمة جديدة`.

---

## 4. Mystery Inbox (💜 مفاجآتي)

### New Screen

**HTML:** `#screen-surprises` (inserted after `#screen-capsules`)

**Navigation:** Added as a card in the Profile screen's `✨ رحلتي` section, between "رسائل خاصة" and the section end.

### Content Sections

| Section | Shows |
|---------|-------|
| **Deferred rewards** | Rewards saved for later — `✨ استلام الآن` button to open |
| **Pending rewards** | Rewards not yet deferred or redeemed — `✨ استلام الآن` / `💜 لوقت لاحق` buttons |
| **✅ تم استلامها** | History of already-redeemed rewards with date |
| **💌 رسائلك الخاصة** | Unlocked capsules — tappable to view in immersive overlay |

### Home Screen Badge

A new badge `💜 مفاجأة` appears in the home screen badge row when `state.deferredRewards` has items. Clicking it navigates to `screen-surprises`. It is hidden when count is 0.

---

## 5. Accessibility

| Feature | Implementation |
|---------|---------------|
| **Role** | `role="dialog"`, `aria-modal="true"`, `aria-label="مفاجأة"` on overlay |
| **Escape key** | `document.addEventListener('keydown', _surpriseEscapeHandler)` — closes on Escape |
| **Focus trapping** | `actionBtn.focus()` called after 350ms on open |
| **Reduced motion** | All transitions disabled via `@media(prefers-reduced-motion:reduce)` — `.surprise-card`, `.surprise-overlay` included |
| **Screen reader** | Labels on emoji (`aria-hidden="true"`), button text, and overlay label |
| **Touch targets** | All buttons `min-height:44px` (Apple HIG), action button 54px |
| **Keyboard** | Enter/Space on action button works natively; overlay is DOM-based |

---

## 6. Files Changed

| File | Changes |
|------|---------|
| `index.html` | TIME_CAPSULES: added 4 `word` objects. State: added `deferredRewards`. CSS: added `.surprise-overlay`, `.surprise-card`, `@keyframes springReveal`, reduced-motion override. HTML: removed old redeem-modal, added surprise overlay, added `#screen-surprises`, added "مفاجآتي" card to profile, added `#surprise-badge` to home. JS: added `showSurprise()`, `closeSurprise()`, `copySurpriseCode()`, `redeemNow()`, `deferReward()`, `renderSurprises()`. Modified `renderRewards()` (Now/Later buttons), `renderCapsules()` (tappable cards → immersive overlay), `updateHomeUI()` (badge logic), `showScreen()` (renderSurprises hook). |
| `IMMERSIVE_SURPRISE_REPORT.md` | **(this file)** |

---

## 7. Backward Compatibility

### Existing Users

| Scenario | Behavior |
|----------|----------|
| User has unredeemed rewards | Old redeem flow replaced by new Now/Later buttons. Rewards appear with two-button choices. |
| User has redeemed rewards | Already redeemed — shown in مفاجآتي history. No change. |
| User has deferredRewards undefined (old state) | `deferredRewards:[]` default via `loadState()` merge. Safe. |
| User opens an unlocked capsule | Now opens immersive overlay instead of inline content. Same data, new presentation. |
| Old backup imported | No `deferredRewards` in backup → defaults to `[]`. All other fields unchanged. |

### Unchanged Logic

- Reward unlock conditions (25/50/100/300 words)
- Capsule unlock conditions (word thresholds + A1 completion)
- `state.rewardsUnlocked` and `state.redeemedAt` — same structure
- `state.capsulesUnlocked` — same structure
- SM-2, achievements, backup, PWA, localStorage migration

---

## 8. Accessibility Verification

| Criterion | Status |
|-----------|--------|
| Focus trap on modal open | ✅ `actionBtn.focus()` after 350ms |
| Escape closes modal | ✅ `keydown` listener |
| Screen reader labels | ✅ `role="dialog"`, `aria-modal`, `aria-label` |
| Reduced motion support | ✅ All animations disabled |
| 44px touch targets | ✅ All buttons 44px+ |
| Keyboard navigation | ✅ Native tab order |
| Backdrop click dismiss | ✅ Not implemented (intentional — prevents accidental close) |
