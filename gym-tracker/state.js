(function () {
  const STORAGE_KEY = "gymTracker_cyberDark_v2";

  const PLAN = [
    {
      id: 1,
      name: "Brust + Trizeps",
      tag: "Push Day",
      exercises: [
        { id: "bench_press", name: "Bench Press" },
        { id: "incline_dumbbell_press", name: "Incline Dumbbell Press" },
        { id: "cable_fly", name: "Cable Fly" },
        { id: "triceps_pushdown", name: "Triceps Pushdown" }
      ]
    },
    {
      id: 2,
      name: "Rucken + Bizeps",
      tag: "Pull Day",
      exercises: [
        { id: "lat_pulldown", name: "Lat Pulldown" },
        { id: "seated_row", name: "Seated Row" },
        { id: "barbell_curl", name: "Barbell Curl" },
        { id: "hammer_curl", name: "Hammer Curl" }
      ]
    },
    {
      id: 3,
      name: "Beine",
      tag: "Leg Day",
      exercises: [
        { id: "leg_press", name: "Leg Press" },
        { id: "romanian_deadlift", name: "Romanian Deadlift" },
        { id: "leg_curl", name: "Leg Curl" },
        { id: "calf_raise", name: "Calf Raise" }
      ]
    },
    {
      id: 4,
      name: "Schultern + Bauch",
      tag: "Shoulders & Core",
      exercises: [
        { id: "shoulder_press", name: "Shoulder Press" },
        { id: "lateral_raise", name: "Lateral Raise" },
        { id: "rear_delt", name: "Rear Delt" },
        { id: "abs_exercise", name: "Core Exercise" }
      ]
    }
  ];

  const I18N = {
    de: {
      appTagline: "4-Tage Trainingsloop, Live-Progress, Streaks & smarter Rest-Timer - alles lokal gespeichert.",
      tabs: { home: "Home", stats: "Stats", settings: "Settings" },
      currentDay: "Aktueller Trainingstag",
      currentDaySub: "4-Tage Split, automatisch im Loop. Ubungen ausfullen & mit Done bestatigen.",
      notesControl: "Notizen & Steuerung",
      notesControlSub: "Notizen pro Tag, Skip, Reset & Daten-Export/Import.",
      notesLabel: "Notizen fur diesen Trainingstag",
      autosave: "Auto-Save aktiv",
      addExercise: "+ Ubung hinzufugen",
      skipDay: "Tag uberspringen",
      resetAll: "Alles zurucksetzen",
      exportData: "Daten exportieren",
      importData: "Daten importieren",
      hardReset: "Hard Reset & Cache loschen",
      statsTitle: "Performance Stats",
      statsSub: "Best PR, letzter Eintrag und Trend pro Ubung.",
      settingsTitle: "Echte Settings",
      settingsSub: "Theme, Sprache, Rest-Timer und selektives Reset.",
      restTimer: "Rest-Timer",
      resetStatsOnly: "Nur Stats zurucksetzen",
      language: "Sprache",
      theme: "Theme",
      dark: "Dark",
      light: "Light",
      streakRewards: {
        none: "Keep going",
        hot: "Hot streak",
        epic: "Epic streak",
        legendary: "Legendary streak"
      }
    },
    en: {
      appTagline: "4-day training loop, live progress, streaks & smart rest timer - all saved locally.",
      tabs: { home: "Home", stats: "Stats", settings: "Settings" },
      currentDay: "Current Training Day",
      currentDaySub: "4-day split on loop. Fill sets and confirm done.",
      notesControl: "Notes & Controls",
      notesControlSub: "Notes per day, skip, reset and data import/export.",
      notesLabel: "Notes for this training day",
      autosave: "Auto-save enabled",
      addExercise: "+ Add exercise",
      skipDay: "Skip day",
      resetAll: "Reset everything",
      exportData: "Export data",
      importData: "Import data",
      hardReset: "Hard reset & clear cache",
      statsTitle: "Performance Stats",
      statsSub: "Best PR, last workout and trend per exercise.",
      settingsTitle: "Real Settings",
      settingsSub: "Theme, language, rest timer and selective reset.",
      restTimer: "Rest timer",
      resetStatsOnly: "Reset stats only",
      language: "Language",
      theme: "Theme",
      dark: "Dark",
      light: "Light",
      streakRewards: {
        none: "Keep going",
        hot: "Hot streak",
        epic: "Epic streak",
        legendary: "Legendary streak"
      }
    },
    ar: {
      appTagline: "خطة 4 أيام مع تقدم مباشر وستريك ومؤقت راحة ذكي - كل شيء محلي.",
      tabs: { home: "الرئيسية", stats: "الإحصائيات", settings: "الإعدادات" },
      currentDay: "اليوم التدريبي الحالي",
      currentDaySub: "تقسيم 4 أيام في حلقة. أكمل الجولات ثم اضغط Done.",
      notesControl: "الملاحظات والتحكم",
      notesControlSub: "ملاحظات لكل يوم مع التخطي وإعادة الضبط والتصدير/الاستيراد.",
      notesLabel: "ملاحظات هذا اليوم",
      autosave: "حفظ تلقائي",
      addExercise: "+ إضافة تمرين",
      skipDay: "تخطي اليوم",
      resetAll: "إعادة ضبط الكل",
      exportData: "تصدير البيانات",
      importData: "استيراد البيانات",
      hardReset: "مسح كامل والذاكرة",
      statsTitle: "إحصائيات الأداء",
      statsSub: "أفضل PR وآخر تمرين واتجاه التقدم لكل تمرين.",
      settingsTitle: "إعدادات حقيقية",
      settingsSub: "الوضع، اللغة، مؤقت الراحة وإعادة ضبط الإحصائيات.",
      restTimer: "مؤقت الراحة",
      resetStatsOnly: "إعادة ضبط الإحصائيات فقط",
      language: "اللغة",
      theme: "الوضع",
      dark: "داكن",
      light: "فاتح",
      streakRewards: {
        none: "استمر",
        hot: "ستريك قوي",
        epic: "ستريك ملحمي",
        legendary: "ستريك أسطوري"
      }
    }
  };

  function createExerciseState(existing) {
    return {
      weight: existing?.weight ?? "",
      reps: existing?.reps ?? "",
      setsLeft: Number.isFinite(existing?.setsLeft) ? existing.setsLeft : 3,
      done: !!existing?.done,
      lastTrend: existing?.lastTrend || "none"
    };
  }

  function buildDay(dayTemplate, existingDay) {
    const customExercises = Array.isArray(existingDay?.customExercises)
      ? existingDay.customExercises
      : [];

    const allExercises = [...dayTemplate.exercises, ...customExercises];
    const exercises = allExercises.reduce((acc, ex) => {
      acc[ex.id] = createExerciseState(existingDay?.exercises?.[ex.id]);
      return acc;
    }, {});

    return {
      dayId: dayTemplate.id,
      notes: existingDay?.notes ?? "",
      customExercises,
      exercises
    };
  }

  function createDefaultState() {
    return {
      currentTab: "home",
      currentDayIndex: 0,
      statsRange: 7,
      restSeconds: 30,
      streak: 0,
      lastStreakDate: null,
      theme: "dark",
      language: "de",
      days: PLAN.map((day) => buildDay(day, null)),
      exerciseStats: {},
      goals: {}
    };
  }

  function sanitizeState(parsed) {
    const base = createDefaultState();
    if (!parsed || typeof parsed !== "object") return base;

    base.currentTab = ["home", "stats", "settings"].includes(parsed.currentTab)
      ? parsed.currentTab
      : "home";
    base.currentDayIndex = Math.max(0, Math.min(PLAN.length - 1, Number(parsed.currentDayIndex) || 0));
    base.statsRange = [7, 30].includes(Number(parsed.statsRange))
      ? Number(parsed.statsRange)
      : 7;
    base.restSeconds = [30, 60, 90, 120].includes(Number(parsed.restSeconds))
      ? Number(parsed.restSeconds)
      : 30;
    base.streak = Number(parsed.streak) || 0;
    base.lastStreakDate = parsed.lastStreakDate || null;
    base.theme = parsed.theme === "light" ? "light" : "dark";
    base.language = I18N[parsed.language] ? parsed.language : "de";

    if (Array.isArray(parsed.days) && parsed.days.length === PLAN.length) {
      base.days = PLAN.map((day, idx) => buildDay(day, parsed.days[idx]));
    }

    if (parsed.exerciseStats && typeof parsed.exerciseStats === "object") {
      base.exerciseStats = parsed.exerciseStats;
    }

    if (parsed.goals && typeof parsed.goals === "object") {
      base.goals = parsed.goals;
    } else if (parsed.exerciseGoals && typeof parsed.exerciseGoals === "object") {
      // Backward compatibility with older saved schema.
      base.goals = parsed.exerciseGoals;
    }

    return base;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw);
      return sanitizeState(parsed);
    } catch (error) {
      console.warn("Could not load state. Starting fresh.", error);
      return createDefaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save state.", error);
    }
  }

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  window.GymState = {
    STORAGE_KEY,
    PLAN,
    I18N,
    createDefaultState,
    sanitizeState,
    loadState,
    saveState,
    getTodayKey
  };
})();
