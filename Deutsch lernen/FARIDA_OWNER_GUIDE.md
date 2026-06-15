# FARIDA OWNER GUIDE

**Application:** ألمانيتي (Almaniyati) — German Learning PWA for Arabic Speakers
**File:** `index.html` (single-file application)
**Profile:** Farida (single user, hardcoded name)
**Version:** 2.0.0
**Date:** 2026-06-15

> This document is for the app creator/owner only.
> It is NOT part of the user experience and must never be visible inside the application.

---

## 1. Application Overview

### Technical Facts

| Property | Value |
|----------|-------|
| Architecture | Single HTML file + Service Worker + Web Manifest |
| Language | Arabic UI, German content |
| User Profile | Farida (hardcoded in `USER_PROFILE`) |
| Data Storage | `localStorage` key `almanya_state` |
| Offline Support | Full (all logic is client-side JS, no backend) |
| PWA | Service Worker (`sw.js`), install prompt |

### Content Counts

| Data | Count | Details |
|------|-------|---------|
| **Vocabulary** | 300 words | IDs 1–300 across 18 categories |
| **Categories** | 18 | daily, food, shopping, work, travel, family, health, tech, numbers, time, education, clothing, weather, nature, animals, government, emergency |
| **Lessons (A1)** | 8 | a1-1 to a1-8 |
| **Lessons (A2)** | 10 | a2-1 to a2-10 |
| **Lessons (B1)** | 3 | b1-1 to b1-3 |
| **Total Lessons** | 21 | 8 + 10 + 3 |
| **Achievements** | 15 | word milestones, quiz, streak, lessons, SM-2 mastery |
| **Motivations** | 11 triggers | 8 standard + 3 mystery messages |
| **Phrases (Speaking)** | 26 | across 8 groups |
| **Daily Challenges** | 3 | words, quiz, listening |
| **Rewards** | 4 | farida25, farida50, farida100, farida300 |
| **Time Capsules** | 4 | capsule25, capsule50, capsuleA1, capsule200 |

### Vocabulary Difficulty Breakdown

| Difficulty | Count |
|------------|-------|
| easy | ~200 |
| medium | ~80 |
| hard | ~20 |

### Vocabulary Level Breakdown

| Level | Count |
|-------|-------|
| A1 | ~230 |
| A2 | ~50 |
| B1 | ~20 |

---

## 2. Reward System

### Data Structure (from `REWARDS` constant)

```js
const REWARDS = [
  { id: "farida25", unlockAt: 30, code: "FARIDA25", title: "🎁 صندوق سري" },
  { id: "farida50", unlockAt: 60, code: "FARIDA50", title: "✨ مفاجأة جديدة" },
  { id: "farida100", unlockAt: 110, code: "FARIDA100", title: "💜 هدية خاصة" },
  { id: "farida300", unlockAt: 275, code: "FARIDA300", title: "👑 مفاجأة استثنائية" }
];
```

### Individual Rewards

> Real-world gifts are documented here only. They never appear inside the app UI.

#### FARIDA25
| Field | Value |
|-------|-------|
| **ID** | `farida25` |
| **Unlock At** | 30 learned words |
| **Code** | `FARIDA25` |
| **Farida sees (mystery title)** | 🎁 صندوق سري |
| **Real gift (owner only)** | ☕ قهوة مميزة |
| **Teaser (before unlock)** | "المفاجأة الأولى تقترب — بقي X كلمة ✨" |
| **Teaser (after unlock, not redeemed)** | Mystery title only + "🎉 انفتحت مفاجأتكِ!" + "استلام" — **no code visible** |
| **Teaser (after unlock, subsequent rewards)** | "مفاجأة أخرى في الطريق — بقي X كلمة ✨" |

#### FARIDA50
| Field | Value |
|-------|-------|
| **ID** | `farida50` |
| **Unlock At** | 60 learned words |
| **Code** | `FARIDA50` |
| **Farida sees (mystery title)** | ✨ مفاجأة جديدة |
| **Real gift (owner only)** | 🍰 حلوى مفضلة |
| **Teaser** | "مفاجأة أخرى في الطريق — بقي X كلمة ✨" |

#### FARIDA100
| Field | Value |
|-------|-------|
| **ID** | `farida100` |
| **Unlock At** | 110 learned words |
| **Code** | `FARIDA100` |
| **Farida sees (mystery title)** | 💜 هدية خاصة |
| **Real gift (owner only)** | 🎬 ليلة فيلم |
| **Teaser** | "مفاجأة أخرى في الطريق — بقي X كلمة ✨" |

#### FARIDA300
| Field | Value |
|-------|-------|
| **ID** | `farida300` |
| **Unlock At** | 275 learned words |
| **Code** | `FARIDA300` |
| **Farida sees (mystery title)** | 👑 مفاجأة استثنائية |
| **Real gift (owner only)** | 🎁 مفاجأة خاصة |
| **Teaser** | "مفاجأة أخرى في الطريق — بقي X كلمة ✨" |

### Redemption Flow

1. User reaches word threshold → `checkRewards()` called from `addXP()`
2. Reward ID pushed to `state.rewardsUnlocked[]`
3. Surprise enqueued via `_enqueueSurprise()` → interrupt overlay with ownerMessage + educational word + Now/Later buttons
4. User taps "اكتشفي المفاجأة الآن" → confirmation dialog → reward redeemed → immersive overlay with code
5. On Rewards screen (if deferred): card shows mystery emoji + mystery title + "🎉 انفتحت مفاجأتكِ!" + "استلام" button — **code is hidden**
6. User clicks "استلام" from Rewards screen → custom confirm modal: `"هل تريدين فتح مفاجأتكِ الجديدة؟"`
7. If confirmed → `state.redeemedAt[id] = ISO timestamp` → `renderRewards()` called
8. **Post-redeem overlay** appears (NOT a toast):
   - 🎁 انفتحت مفاجأتكِ الجديدة!
   - Voucher-style card with code in gold gradient monospace font
   - 📋 نسخ الكود button (copies to clipboard with ripple + confetti animation)
   - Instruction: "أرسلي هذا الكود لصاحب الهدية 🎁"
   - "✨ تم!" button to dismiss
9. Code is never shown in any other context — only in this post-redeem overlay

### State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `state.rewardsUnlocked` | `string[]` | IDs of rewards that reached word threshold |
| `state.redeemedAt` | `Record<string, string>` | ISO timestamps per redeemed reward ID |
| `state.wordsLearned` | `number` | Total words learned — primary unlock metric |

---

## 3. Time Capsules

### Data Structure (from `TIME_CAPSULES` constant)

```js
const TIME_CAPSULES = [
  { id: "capsule25", unlockAt: 25,
    title: "رسالة خاصة",
    message: "{{name}}، البداية دائماً هي أصعب خطوة، وأنتِ نجحتِ فيها. 🌷" },
  { id: "capsule50", unlockAt: 50,
    title: "رسالة خاصة",
    message: "كل كلمة جديدة تتعلمينها تقرّبكِ أكثر من حياتكِ الجديدة في ألمانيا. أنا فخور بكِ. 💜" },
  { id: "capsuleA1", unlockLesson: "all_a1",
    title: "إنجاز رائع",
    message: "{{name}}، انظري كم وصلتِ بعيداً. هذا مجرد بداية لشيء أكبر. ✨" },
  { id: "capsule200", unlockAt: 200,
    title: "مفاجأة خاصة",
    message: "مئتا كلمة ليست مجرد رقم، إنها دليل على إصراركِ وقوتكِ. 🎉" }
];
```

### Individual Capsules

#### capsule25
| Field | Value |
|-------|-------|
| **ID** | `capsule25` |
| **Unlock** | 25 learned words |
| **Title** | رسالة خاصة |
| **Message** | "{{name}}، البداية دائماً هي أصعب خطوة، وأنتِ نجحتِ فيها. 🌷" |
| **Teaser (locked)** | "رسالة خاصة قادمة 💜 — بقي X كلمة ✨" |
| **Animation** | `capsule-glow` (pulsing golden box-shadow) |

#### capsule50
| Field | Value |
|-------|-------|
| **ID** | `capsule50` |
| **Unlock** | 50 learned words |
| **Title** | رسالة خاصة |
| **Message** | "كل كلمة جديدة تتعلمينها تقرّبكِ أكثر من حياتكِ الجديدة في ألمانيا. أنا فخور بكِ. 💜" |
| **Teaser (locked)** | "رسالة خاصة قادمة 💜 — بقي X كلمة ✨" |

#### capsuleA1
| Field | Value |
|-------|-------|
| **ID** | `capsuleA1` |
| **Unlock** | Complete all 8 A1 lessons (achievement `all_a1`) |
| **Title** | إنجاز رائع |
| **Message** | "{{name}}، انظري كم وصلتِ بعيداً. هذا مجرد بداية لشيء أكبر. ✨" |
| **Teaser (locked)** | "رسالة خاصة قادمة 💜 — بقي X دروس 🎯" |

#### capsule200
| Field | Value |
|-------|-------|
| **ID** | `capsule200` |
| **Unlock** | 200 learned words |
| **Title** | مفاجأة خاصة |
| **Message** | "مئتا كلمة ليست مجرد رقم، إنها دليل على إصراركِ وقوتكِ. 🎉" |
| **Teaser (locked)** | "رسالة خاصة قادمة 💜 — بقي X كلمة ✨" |

### Unlock Behavior

- When unlocked → `state.capsulesUnlocked.push(id)` → enqueued via surprise queue → interrupt overlay with Now/Later buttons
- On Capsules screen: shows 💌 emoji, `c.title`, `c.message` (with `{{name}}` replaced)
- If more capsules remain → hint: `"💌 هناك رسالة أخرى بانتظاركِ في المستقبل."`
- If all 4 opened → `"💌 كل الرسائل وصلت 💜"`
- **Locked capsules**: always show `"رسالة خاصة قادمة 💜"` — no title or message preview

### State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `state.capsulesUnlocked` | `string[]` | IDs of opened capsules |

---

## 4. Motivation Messages

### All Triggers and Messages

#### m1 — First Lesson (`lessonsCompleted >= 1`)
- 🥳 مبروك أكملت أول درس!
- 🎉 بداية رائعة يا {{name}}!
- 🌟 أول درس خلفك! استمري {{name}}

#### m2 — 7-Day Streak (`streak >= 7`)
- 🔥 أسبوع كامل من التعلم! أنتِ بطلة!
- 💪 سلسلة 7 أيام! استمري يا {{name}}!
- 📆 ٧ أيام متتالية! انتظام رائع {{name}}

#### m3 — 50 Words (`wordsLearned >= 50`)
- 📚 ٥٠ كلمة جديدة! مذهل!
- 🌟 خمسون كلمة! أنتِ تتقدمين بسرعة {{name}}!
- 💜 ٥٠ كلمة! خطوة جديدة نحو هدفك في ألمانيا 🇩🇪

#### m4 — 100 Words (`wordsLearned >= 100`)
- 🎯 مئة كلمة! أنتِ نجمة!
- 💎 ١٠٠ كلمة! فخورة بكِ يا {{name}}!
- 🏅 أول ١٠٠ كلمة! هكذا تبدو الرحلة الرائعة ✨

#### m5 — First Successful Quiz (`quizzesCompleted >= 1 && totalCorrect > 0`)
- 🧠 أول اختبار ناجح! أحسنتِ!
- ⭐ إجابات رائعة يا {{name}}!
- 🎯 اختبار ممتاز! تقدمك واضح {{name}}

#### m6 — 5 Lessons (`lessonsCompleted >= 5`)
- 🏆 خمسة دروس كاملة!
- 🎓 تقدم مستمر {{name}}! أنتِ رائعة!
- 📖 ٥ دروس! ماشاء الله {{name}} استمري

#### m7 — 30-Day Streak (`streak >= 30`)
- 🌋 ٣٠ يوماً متتالياً! لا تتوقفي!
- 👑 شهر كامل يا {{name}}! إنجاز عظيم!
- 🔥 ٣٠ يوم تعلم! أنتِ ملهمة {{name}} ✨

#### m8 — Level 5 (`level >= 5`)
- ⚡ المستوى ٥! أنتِ محترفة!
- 🚀 وصلتِ للمستوى ٥ يا {{name}}!
- 🌟 مستوى خامس! ماشاء الله تبارك الله

#### mystery1 — Studied 5+ Days (`studyHistory.length >= 5`)
- شيء جميل ينتظركِ قريباً ✨
- استمري، هناك مفاجأة خاصة تقترب 💜
- رحلتكِ تحمل أكثر مما تتوقعين 🎁

#### mystery2 — 15+ Words (`wordsLearned >= 15`)
- كل يوم يقرّبكِ من شيء مميز 💜
- القادم أجمل مما تتخيلين ✨
- أنتِ على موعد مع مفاجأة قرياً 🎀

#### mystery3 — 3+ Lessons (`lessonsCompleted >= 3`)
- الطريق أمامكِ مليء بالجمال والدهشة 🌟
- استمري.. فهناك الكثير لا يزال ينتظركِ 💜
- كل تقدم يُقرّبكِ من مفاجأة جديدة ✨

### Rotation Logic

1. All motivations whose `check(state)` returns `true` are collected as "eligible"
2. The motivation whose ID matches `state.lastMotivationId` is excluded (prevents duplicates across sessions)
3. If all eligible are the excluded one, reset — use full eligible list
4. A random motivation is chosen from the pool
5. A random message is chosen from that motivation's `msgs[]` array
6. `{{name}}` is replaced with the user's name
7. `state.lastMotivationId` is updated and persisted via `saveState()`

### Session Limits

- Only **one** motivation toast per page load session
- Guarded by `window._motivationShown` flag (not persisted)
- On page refresh, the flag resets, allowing one more toast

### State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `state.lastMotivationId` | `string` | ID of last shown motivation (e.g. `"m3"`, `"mystery1"`) |

---

## 5. Final Celebration

### Trigger

- **Automatic**: When `state.wordsLearned >= 300` AND `state.seenFinalCelebration === false`
- Checked in `updateHomeUI()` every time the home screen renders
- Sets `state.seenFinalCelebration = true` immediately and calls `saveState()`

### Replay

- Journey screen shows "💜 إعادة عرض الاحتفال" button when `wordsLearned >= 300`
- Clicking calls `showCelebration()` again (no `seenFinalCelebration` gate)

### Full Message

**Overlay Title:**
> رحلتكِ إلى الألمانية بدأت بحلم، ووصلتِ إليها بإصراركِ 💜

**Body Message:**
> فريدة، كل كلمة تعلمتِها كانت خطوة جديدة نحو مستقبلكِ، وأنا فخور بكِ كل يوم. 🇩🇪✨

**Button:**
> ابدئي الفصل التالي

### Statistics Displayed

| Stat | Source |
|------|--------|
| كلمة تعلمتها | `state.wordsLearned` |
| كلمات متقنة | `SM2.getMastered()` |
| سلسلة الأيام | `getVerifiedStreak()` |
| إجمالي أيام الدراسة | Union of dates from SM-2 history + studyHistory |
| تاريخ أول دراسة | Earliest date from union set |
| متوسط النطق | Average of `state.pronunciationHistory[]` |

### State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `state.seenFinalCelebration` | `boolean` | Whether the celebration has been shown at least once |

---

## 6. Surprise Mode

### What Farida Sees at Each Milestone

#### New User (0 words)
- **Home**: Greeting, daily goal 0/10, no progress toward anything specific
- **Journey**: "المفاجأة الأولى تقترب — بقي 30 كلمة ✨", "رسالة خاصة قادمة — بقي 25 كلمة ✨"
- **Rewards**: "المفاجأة الأولى تقترب 🔒 — بقي 30 كلمة ✨"
- **Capsules**: 4× locked "رسالة خاصة قادمة 💜" with respective counts
- **Onboarding**: 3 slides — mystery theme, no mention of rewards/codes/XP

#### 24 Words
- **Journey**: "المفاجأة الأولى تقترب — بقي 6 كلمة ✨", "رسالة خاصة قادمة — بقي 1 كلمة ✨"
- **Rewards**: "المفاجأة الأولى تقترب 🔒 — بقي 6 كلمة ✨"
- **Capsules**: capsule25 near completion (96%)

#### 25 Words (First Capsule Unlocked)
- **Toast**: "💌 رسالة جديدة في انتظاركِ"
- **Capsules**: capsule25 shows 💌 with title "رسالة خاصة", message revealed, hint for next capsule
- **Journey**: "رسالة خاصة قادمة — بقي 25 كلمة ✨" (next capsule at 50), "المفاجأة الأولى تقترب — بقي 5 كلمة ✨"
- **Rewards**: "المفاجأة الأولى تقترب 🔒 — بقي 5 كلمة ✨"

#### 30 Words (First Reward Unlocked)
- **Toast**: "🎁 انكشفت مفاجأة جديدة!" (generic, no code, no title)
- **Rewards**: farida25 visible with mystery title "🎁 صندوق سري", **code hidden**, "🎉 انفتحت مفاجأتكِ!" + "استلام" button
- **Rewards (next teaser)**: "مفاجأة أخرى في الطريق 🔒 — بقي 30 كلمة ✨" (next at 60)
- **After redemption**: Post-redeem modal reveals code FARIDA25 with copy button
- **Journey**: "مفاجأة أخرى في الطريق — بقي 30 كلمة ✨" (because hasUnlocked=true)

#### 50 Words (Second Capsule Unlocked)
- **Toast**: "💌 رسالة جديدة في انتظاركِ"
- **Capsules**: capsule50 shows 💌 with title "رسالة خاصة", message revealed
- **Journey**: reward at 60 (بقي 10 كلمة), capsule at 200 (بقي 150 كلمة)

#### 60 Words (Second Reward Unlocked)
- **Toast**: "🎁 انكشفت مفاجأة جديدة!"
- **Rewards**: farida50 visible, mystery title "✨ مفاجأة جديدة"
- **After redemption**: Post-redeem modal reveals code FARIDA50

#### A1 Completed
- **Capsules**: capsuleA1 opens — shows 💌 with title "إنجاز رائع", message revealed
- **Achievement**: "أكملت مستوى A1" unlocked

#### 110 Words (Third Reward Unlocked)
- **Rewards**: farida100 unlocked, mystery title "💜 هدية خاصة", **code hidden**
- **After redemption**: Post-redeem modal reveals code FARIDA100 with copy button
- **Journey**: next reward at 275 (بقي 165 كلمة), next capsule at 200 (بقي 90 كلمة)

#### 200 Words (Third Capsule Unlocked)
- **Toast**: "💌 رسالة جديدة في انتظاركِ"
- **Capsules**: capsule200 shows 💌 with title "مفاجأة خاصة", message revealed
- **Journey**: next reward at 275 (بقي 75 كلمة)

#### 300 Words (Celebration + Achievement)
- **Celebration overlay**: automatically appears with full stats
- **Achievement**: "👑 ثلاثمئة كلمة" unlocked
- **Journey button**: "💜 إعادة عرض الاحتفال" available
- **Home goal card**: celebration progress

#### 275 Words (Final Reward + Final Capsule Already Opened)
- **Toast**: "🎁 انكشفت مفاجأة جديدة!"
- **Rewards**: farida300 unlocked, mystery title "👑 مفاجأة استثنائية", **code hidden**
- **After redemption**: Post-redeem modal reveals code FARIDA300 with copy button
- **Journey**: "كل المفاجآت انكشفت! 💜", "كل الرسائل وصلت! 🌟"
- **Home goal card**: "🎊 كل شيء انكشف! رحلة رائعة 💜"

### What Remains Hidden Until Unlock

| Secret | Hidden Until | Where Revealed |
|--------|-------------|----------------|
| Mystery titles (e.g. "🎁 صندوق سري") | Word threshold reached | Rewards screen |
| Reward codes (FARIDA25, etc.) | Redemption confirmed via "استلام" | Post-redeem modal only |
| Real-world gift (e.g. "☕ قهوة مميزة") | Never in app | FARIDA_OWNER_GUIDE.md only |
| Capsule titles (e.g. "إنجاز رائع") | Capsule unlocked | Capsules screen |
| Capsule messages | Capsule unlocked | Capsules screen |
| 300-word celebration | `wordsLearned >= 300` | Home screen (auto) or Journey (replay) |
| Future reward thresholds (30, 60, 110, 275) | Never shown directly | Only remaining word count displayed |
| Total reward count | Never shown directly | Only the next unearned reward is shown |

---

## 7. Backup & Restore

### Export Flow

1. Profile screen → click "تصدير" button
2. Custom confirm modal: "🔐 هل تريد تشفير الملف بكلمة مرور؟"
   - Confirm → encrypted export
   - Cancel → plain JSON export
3. If encrypted:
   - Modal prompts for password (masked input)
   - Modal prompts for password confirmation
   - If mismatch → error toast "❌ كلمة المرور غير متطابقة"
4. Build backup data via `_buildBackupData()`
5. If encrypted + `crypto.subtle` available → download `Farida-Backup-{date}.secure.json`
6. If encrypted + no `crypto.subtle` → error toast "❌ التشفير غير متاح في هذا المتصفح"
7. If plain → download `Farida-Backup-{date}.json`
8. Success toast: "💾 تم التصدير بنجاح"

### Encryption Details

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2 with SHA-256 |
| Iterations | 600,000 |
| Salt | 16 random bytes (per export) |
| IV | 12 random bytes (per export) |
| Output format | JSON envelope: `{ version, encrypted:true, exportedAt, ciphertext, iv, salt }` |
| Filename | `.secure.json` |

**Default password:** None.

The owner chooses the password during export. If no password is provided, the export is cancelled.

### Import Flow

1. Profile screen → click "استيراد" → file picker (accepts `.json`, `.secure.json`)
2. File is read and parsed as JSON
3. If `pkg.encrypted === true`:
   - Checks `crypto.subtle` availability
   - Modal prompts for decryption password
   - If wrong password → error toast "❌ كلمة مرور خاطئة أو الملف تالف"
4. If filename contains `.secure` but `encrypted !== true` → error toast
5. Structure validated: must have `data` object and `version` field
6. Custom confirm modal: warns about data replacement, mentions safety backup
7. Auto-downloads safety backup: `Farida-AutoSafety-{date}.json`
8. State keys copied from backup (only keys that exist in state schema)
9. `saveState()` → `location.reload()`

### Exported Fields

The following 24 fields are included in `_buildBackupData()`:

```
xp, streak, wordsLearned, level, learnedWords, favoriteWords,
quizzesCompleted, perfectQuizzes, lessonsCompleted, completedLessons,
totalCorrect, totalAnswers, name,
sm2Data, pronunciationHistory,
rewardsUnlocked, redeemedCodes, redeemedAt,
capsulesUnlocked, memoryWords,
lastVerifiedStudyAt, studyHistory, backupVersion,
seenFinalCelebration, lastMotivationId
```

### Excluded Fields

| Field | Reason |
|-------|--------|
| `dailyWordsToday` | Resets daily |
| `dailyDate` | Resets daily |
| `lastStudyDate` | Derivable from SM-2 data |
| `listenedToday` | Daily counter |
| `quizHistory` | Large array, not essential |
| `onboardingDone` | User already onboarded |
| `speechSpeed` | User preference (TTS speed) |
| `notifications` | User preference |
| `level` | Recalculated from XP on load? No — it IS included |

### backupVersion

- Default: `1`
- Exported in every backup
- Checked on import: if `undefined`, file is rejected as invalid
- Future use: schema migration

---

## 8. LocalStorage Reference

All data is stored under the single key `almanya_state` in `localStorage`.

### State Fields (Personalization & Progress)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `xp` | number | 0 | Total experience points |
| `streak` | number | 0 | Consecutive study days (verified from actual data) |
| `wordsLearned` | number | 0 | Total unique words learned |
| `level` | number | 1 | Level = floor(xp / 100) + 1 |
| `name` | string | "Farida" | User display name |
| `lastStudyDate` | string | `''` | Last date any study action occurred (ISO date string) |
| `dailyWordsToday` | number | 0 | Words learned today (resets daily) |
| `dailyDate` | string | `''` | Current daily counter date |
| `learnedWords` | `Record<id, timestamp>` | `{}` | Word IDs mapped to Unix timestamp of when learned |
| `favoriteWords` | number[] | `[]` | Word IDs marked as favorites |
| `quizzesCompleted` | number | 0 | Total quizzes finished |
| `perfectQuizzes` | number | 0 | Quizzes with 100% score |
| `totalCorrect` | number | 0 | Total correct answers across all quizzes |
| `totalAnswers` | number | 0 | Total quiz questions answered |
| `lessonsCompleted` | number | 0 | Total lessons finished |
| `completedLessons` | string[] | `[]` | Lesson IDs (e.g. `"a1-1"`, `"a2-3"`) |
| `quizHistory` | object[] | `[]` | Records of past quiz attempts |
| `speechSpeed` | number | 0.7 | TTS speech rate (0.1–2.0) |
| `listenedToday` | number | 0 | How many phrases listened to today |
| `onboardingDone` | boolean | false | Whether onboarding guide was completed |
| `notifications` | boolean | false | Whether notifications are enabled |
| `sm2Data` | `Record<id, card>` | `{}` | SM-2 spaced repetition cards |
| `pronunciationHistory` | number[] | `[]` | Scores from speaking exercises |
| `rewardsUnlocked` | string[] | `[]` | Reward IDs that reached word threshold |
| `redeemedCodes` | string[] | `[]` | Legacy — deprecated, migrated to `redeemedAt` |
| `redeemedAt` | `Record<id, string>` | `{}` | Reward IDs → ISO timestamp of redemption |
| `capsulesUnlocked` | string[] | `[]` | Time capsule IDs that have been opened |
| `memoryWords` | number[] | `[]` | Word IDs saved as memories |
| `lastVerifiedStudyAt` | string | `''` | Last date a word was learned (anti-cheat) |
| `studyHistory` | `[{date, wordId, timestamp}]` | `[]` | Every word-learn event with date and word ID |
| `backupVersion` | number | 1 | Schema version for backup compatibility |
| `seenFinalCelebration` | boolean | false | Whether 300-word celebration was shown |
| `lastMotivationId` | string | `''` | ID of the last shown motivation message |

### SM-2 Card Structure

```js
{
  ef: 2.5,           // Easiness factor (1.3+)
  interval: 0,        // Days until next review
  repetitions: 0,     // Consecutive correct reviews
  nextReview: "2026-06-15",  // ISO date string
  history: [           // Array of review events
    { date: "2026-06-10", quality: 4, interval: 0 }
  ]
}
```

### `studyHistory` Entry Structure

```js
{ date: "2026-06-10", wordId: 1, timestamp: 1718467200000 }
```

---

## 9. Compatibility

### SM-2 Spaced Repetition

| Item | Status |
|------|--------|
| Algorithm | Unchanged — full SM-2 in `SM2` object |
| Data format | Unchanged — `sm2Data[wordId]` |
| Mastered calculation | `repetitions >= 3 && ef >= 2.5` |
| Due calculation | `nextReview <= today` |
| Review flow | `SM2.review(wordId, quality)` |

### Flashcards

| Item | Status |
|------|--------|
| Flashcard screen | Unchanged |
| Keyboard shortcuts | ArrowRight/Left, 1/2/3 |
| SM-2 integration | Uses `SM2.review()` |
| Flip/rate flow | Unchanged |

### Quizzes

| Item | Status |
|------|--------|
| Quiz screen | Unchanged |
| Multiple choice | Unchanged |
| History tracking | `quizHistory[]` — not touched |

### Pronunciation Training

| Item | Status |
|------|--------|
| Speaking screen | Unchanged |
| Web Speech API | Same recognition/synthesis |
| Score tracking | `pronunciationHistory[]` — only appended |

### Search & Filters

| Item | Status |
|------|--------|
| Vocabulary search | Unchanged |
| Category filter | Same pill-based filtering |
| Difficulty filter | Same button logic |

### Statistics

| Item | Status |
|------|--------|
| Profile stats | Unchanged |
| Journey stats | Unchanged (words learned, mastered, streak, XP, level, lessons) |

### PWA

| Item | Status |
|------|--------|
| Service Worker | `sw.js` registered on init |
| Install prompt | `beforeinstallprompt` listener |
| Manifest | Linked in `<head>` |

### Offline Mode

| Item | Status |
|------|--------|
| Core app | Fully offline (all logic client-side) |
| Backup encryption | Requires HTTPS (`crypto.subtle`) — gracefully errors on `file://` |
| localStoage | Works offline — `almanya_state` key |

### Old localStorage Data Migration

When an existing user's data is loaded via `loadState()`:

1. `Object.assign(state, JSON.parse(s))` merges saved data with defaults
2. New fields default to their initial values (e.g. `seenFinalCelebration: false`)
3. **Explicit migration 1**: if `state.redeemedCodes` is an array with entries and `redeemedAt` is empty, convert:
   ```js
   Array.isArray(state.redeemedCodes) && state.redeemedCodes.length
     && !Object.keys(state.redeemedAt||{}).length
   → state.redeemedCodes.forEach(id => state.redeemedAt[id] = '2026-01-01T00:00:00Z')
   ```
4. **Explicit migration 2** (surprise spacing): old capsule IDs renamed for spacing:
   ```js
   const capMap={'capsule100':'capsule50','capsule300':'capsule200'};
   state.capsulesUnlocked=state.capsulesUnlocked.map(id=>capMap[id]||id);
   ```
5. Deferred rewards are filtered to only include valid reward IDs
6. `checkStreak()` runs to sync streak from actual study data

No data is lost; old fields in localStorage that aren't in the state object are simply ignored.

---

## 10. Testing Checklist

### 10.1 Unlock First Capsule (25 words)

- [ ] Learn 24 words — verify Journey shows "رسالة خاصة قادمة — بقي 1 كلمة ✨"
- [ ] Learn 1 more word (25 total)
- [ ] Verify interrupt overlay appears with capsule25 (ownerMessage + educational word)
- [ ] Tap "اكتشفي المفاجأة الآن" or "لوقت لاحق"
- [ ] Verify `state.capsulesUnlocked` contains `"capsule25"`

### 10.2 Unlock First Reward (30 words)

- [ ] Continue from 25 words, learn 5 more words (30 total)
- [ ] Verify interrupt overlay appears with farida25 mystery title
- [ ] Tap "اكتشفي المفاجأة الآن"
- [ ] Verify post-redeem overlay with code FARIDA25 in premium voucher card
- [ ] Tap copy button — verify ripple + confetti + "✅ تم النسخ!"
- [ ] Navigate to Rewards — verify farida25 shows as redeemed
- [ ] Verify next teaser shows "مفاجأة أخرى في الطريق 🔒 — بقي 30 كلمة ✨" (next at 60)
- [ ] Verify `state.rewardsUnlocked` contains `"farida25"`
- [ ] Verify `state.redeemedAt["farida25"]` is set

### 10.3 Unlock Second Capsule (50 words)

- [ ] Continue to 50 words
- [ ] Verify interrupt overlay appears with capsule50
- [ ] Verify `state.capsulesUnlocked` contains `"capsule50"`

### 10.4 Unlock Second Reward (60 words)

- [ ] Continue to 60 words
- [ ] Verify interrupt overlay appears with farida50
- [ ] Verify code FARIDA50 is shown after redemption

### 10.3 Redeem Reward

- [ ] Navigate to Rewards with an unlocked reward
- [ ] Verify card shows mystery title only — **no code visible** anywhere on screen
- [ ] Click "استلام" button
- [ ] Verify custom confirm modal appears with generic message "هل تريدين فتح مفاجأتكِ الجديدة؟" — **no code, no real title**
- [ ] Click "تأكيد"
- [ ] Verify card disappears from rewards list
- [ ] Verify **post-redeem modal** appears with:
  - Title "🎉 انفتحت مفاجأتكِ الجديدة!"
  - Code displayed in large yellow text
  - "📋 نسخ الكود" copy button
  - Instruction text including "انسخي الكود وأرسليه لي"
- [ ] Click "📋 نسخ الكود" — verify button text changes to "✅ تم النسخ!" for 2 seconds
- [ ] Click "تم" — verify modal closes
- [ ] Verify `state.redeemedAt[id]` is set to ISO timestamp
- [ ] Refresh page — verify reward still shows as redeemed (no longer in pending list)

### 10.4 Export Backup (Plain)

- [ ] Navigate to Profile → click "تصدير"
- [ ] In confirm modal, click "إلغاء" (or wait for it and click "إلغاء")
- [ ] Verify `.json` file is downloaded
- [ ] Open file — verify it contains `{ version: 1, exportedAt: "...", data: {...} }`
- [ ] Verify all expected fields are present

### 10.5 Export Backup (Encrypted)

- [ ] Navigate to Profile → click "تصدير"
- [ ] In confirm modal, click "تأكيد"
- [ ] Enter a password → click "تأكيد"
- [ ] Confirm password → click "تأكيد"
- [ ] Verify `.secure.json` file is downloaded
- [ ] Open file — verify structure: `{ version: 1, encrypted: true, ciphertext, iv, salt }`
- [ ] Verify plaintext is not visible in the file

### 10.6 Import Backup

- [ ] Have a backup file ready (plain `.json`)
- [ ] Navigate to Profile → click "استيراد" → select the file
- [ ] Verify confirm modal: warns about data replacement
- [ ] Click "تأكيد"
- [ ] Verify safety backup file is auto-downloaded (`Farida-AutoSafety-{date}.json`)
- [ ] Verify page reloads
- [ ] Verify data is restored

### 10.7 Import Encrypted Backup

- [ ] Have an encrypted `.secure.json` backup ready
- [ ] Navigate to Profile → click "استيراد" → select the file
- [ ] Verify password prompt modal appears
- [ ] Enter the correct password → click "تأكيد"
- [ ] Verify confirm modal appears → click "تأكيد"
- [ ] Verify safety backup + page reload + data restored

### 10.8 Wrong Password on Import

- [ ] Select an encrypted `.secure.json` file
- [ ] Enter a wrong password
- [ ] Verify error toast: "❌ كلمة مرور خاطئة أو الملف تالف"
- [ ] Verify file input is cleared
- [ ] Verify data is NOT changed

### 10.9 Trigger Final Reward (275 words)

- [ ] Continue from 200 words, learn 75 more words (275 total)
- [ ] Verify interrupt overlay appears with farida300 mystery title "👑 مفاجأة استثنائية"
- [ ] Verify code FARIDA300 shown after redemption
- [ ] Verify Journey shows next: celebration at 300

### 10.10 Trigger Final Celebration (300 words)

- [ ] Reach 300 words
- [ ] Verify celebration overlay appears automatically
- [ ] Verify stats are displayed correctly (including achievement ثلاثمئة كلمة)
- [ ] Press Escape — verify overlay closes
- [ ] Navigate to Journey — verify "💜 إعادة عرض الاحتفال" button is visible
- [ ] Click the button — verify overlay appears again
- [ ] Click "ابدئي الفصل التالي" — verify overlay closes, focus returns to greeting

### 10.11 Anti-Cheat Verification

- [ ] Study on 3 consecutive days
- [ ] Set device time back 2 days
- [ ] Refresh page — verify streak is still 3 (not 0, not increased)
- [ ] Study on a new day — verify streak increases to 4
- [ ] Skip a day — verify streak resets to 1

### 10.12 Capsule Title Verification

- [ ] Unlock capsule25 at 25 words — title shows "رسالة خاصة"
- [ ] Complete all A1 lessons — capsuleA1 shows title "إنجاز رائع"
- [ ] Reach 200 words — capsule200 shows title "مفاجأة خاصة"

### 10.13 Motivation Duplicate Prevention

- [ ] Open app → note the motivation toast shown
- [ ] Close and reopen app (same session — already shown, so no second toast)
- [ ] Refresh page → new session → verify motivation ID differs from previous session's
- [ ] Repeat 5 times → verify no two consecutive sessions show the same motivation ID

### 10.14 Reduced Motion

- [ ] Enable "prefers-reduced-motion" in OS/browser
- [ ] Verify all animations are disabled:
  - Screen transitions
  - Flashcard flips
  - Capsule glow
  - Celebrations (background pulse, heart float, content fade)
  - Toast animations
  - XP float

### 10.15 Old User Data Migration

- [ ] Create an old localStorage state (without `seenFinalCelebration`, `studyHistory`, `lastMotivationId`, etc.)
- [ ] Load the app
- [ ] Verify no errors
- [ ] Verify new fields default to their initial values
- [ ] Verify existing data (words, XP, lessons) is intact

---

## OWNER SUMMARY

### All Reward Codes

> The mystery titles shown in the app and the real-world gifts known only to the owner.

| Code | Unlock | Mystery Title (App) | Real Gift (Owner Guide) |
|------|--------|---------------------|-------------------------|
| `FARIDA25` | 30 words | 🎁 صندوق سري | ☕ قهوة مميزة |
| `FARIDA50` | 60 words | ✨ مفاجأة جديدة | 🍰 حلوى مفضلة |
| `FARIDA100` | 110 words | 💜 هدية خاصة | 🎬 ليلة فيلم |
| `FARIDA300` | 275 words | 👑 مفاجأة استثنائية | 🎁 مفاجأة خاصة |

### All Unlock Conditions

| Trigger | Reward/Capsule/Achievement |
|---------|---------------------------|
| 1 word learned | Achievement: الكلمة الأولى |
| 10 words | Achievement: عشر كلمات |
| 15 words | Mystery motivation: mystery2 |
| 25 words | Capsule: capsule25 |
| 30 words | Reward: FARIDA25 |
| 50 words | Capsule: capsule50, Achievement: خمسون كلمة |
| 60 words | Reward: FARIDA50 |
| 100 words | Achievement: مئة كلمة |
| 110 words | Reward: FARIDA100 |
| 200 words | Capsule: capsule200, Achievement: مئتا كلمة |
| 300 words | Celebration |
| 275 words | Reward: FARIDA300 |
| 300 words | Celebration, Achievement: ثلاثمئة كلمة |
| 3-day streak | Achievement: 3 أيام متتالية |
| 7-day streak | Achievement: أسبوع كامل, Motivation: m2 |
| 30-day streak | Motivation: m7 |
| 1 lesson completed | Achievement: أول درس, Motivation: m1 |
| 3 lessons | Mystery motivation: mystery3 |
| 5 lessons | Achievement: خمسة دروس, Motivation: m6 |
| All 8 A1 lessons | Achievement: أكملت مستوى A1, Capsule: capsuleA1 |
| 5 study days | Mystery motivation: mystery1 |
| 1 quiz passed | Achievement: أول اختبار, Motivation: m5 |
| 1 perfect quiz | Achievement: درجة مثالية |
| 100 XP | Achievement: 100 نقطة |
| Level 5 | Motivation: m8 |
| 10 mastered (SM-2) | Achievement: 10 كلمات متقنة |
| 30 mastered (SM-2) | Achievement: 30 كلمة متقنة |
| 100 mastered (SM-2) | Achievement: 100 كلمة متقنة |
| Avg EF >= 3.0 | Achievement: عامل سهولة عالي |

### All Hidden Messages

#### Capsule Messages (revealed upon unlock)

| Capsule | Message |
|---------|---------|
| capsule25 | "{{name}}، البداية دائماً هي أصعب خطوة، وأنتِ نجحتِ فيها. 🌷" |
| capsule50 | "كل كلمة جديدة تتعلمينها تقرّبكِ أكثر من حياتكِ الجديدة في ألمانيا. أنا فخور بكِ. 💜" |
| capsuleA1 | "{{name}}، انظري كم وصلتِ بعيداً. هذا مجرد بداية لشيء أكبر. ✨" |
| capsule200 | "مئتا كلمة ليست مجرد رقم، إنها دليل على إصراركِ وقوتكِ. 🎉" |

#### Celebration Message

> رحلتكِ إلى الألمانية بدأت بحلم، ووصلتِ إليها بإصراركِ 💜
>
> فريدة، كل كلمة تعلمتِها كانت خطوة جديدة نحو مستقبلكِ، وأنا فخور بكِ كل يوم. 🇩🇪✨

### All Surprise Triggers

| Trigger | What Happens |
|---------|-------------|
| 25 words | capsule25 opens + toast |
| 30 words | Mystery reward "🎁 صندوق سري" unlocked + toast |
| 50 words | capsule50 opens + toast |
| 60 words | Mystery reward "✨ مفاجأة جديدة" unlocked + toast |
| 110 words | Mystery reward "💜 هدية خاصة" unlocked + toast |
| All A1 lessons | capsuleA1 opens + toast |
| 200 words | capsule200 opens + toast |
| 300 words | Celebration overlay |
| 275 words | Mystery reward "👑 مفاجأة استثنائية" unlocked + toast |

### Code Reveal Flow

| Step | What Farida Sees |
|------|------------------|
| Word threshold reached | Interrupt overlay: ownerMessage + educational word + Now/Later buttons |
| Rewards screen (if deferred) | Mystery title only — code hidden |
| Confirmation dialog | "هل تريدين فتح مفاجأتكِ الجديدة؟" — no code |
| Post-redeem overlay | Voucher card with gold code + copy button (ripple+confetti) + instruction "أرسلي هذا الكود لصاحب الهدية 🎁" |
| Owner guide only | Real-world gift mapped to each code |

### Default Password

> There is no default password. The owner chooses the password during export.
