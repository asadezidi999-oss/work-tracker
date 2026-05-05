(function () {
  const state = GymState.loadState();

  const els = {
    subtitle: document.getElementById("subtitle"),
    streakValue: document.getElementById("streak-value"),
    streakPill: document.getElementById("streak-pill"),
    streakReward: document.getElementById("streak-reward"),

    tabHome: document.getElementById("tab-home"),
    tabStats: document.getElementById("tab-stats"),
    tabSettings: document.getElementById("tab-settings"),
    tabBtnHome: document.getElementById("tab-btn-home"),
    tabBtnStats: document.getElementById("tab-btn-stats"),
    tabBtnSettings: document.getElementById("tab-btn-settings"),
    navIndicator: document.getElementById("nav-indicator"),

    homeHeading: document.getElementById("home-heading"),
    homeSubheading: document.getElementById("home-subheading"),
    notesHeading: document.getElementById("notes-heading"),
    notesSubheading: document.getElementById("notes-subheading"),

    dayName: document.getElementById("day-name"),
    dayTag: document.getElementById("day-tag"),
    dayPillText: document.getElementById("day-pill-text"),
    progressFill: document.getElementById("progress-fill"),
    progressText: document.getElementById("progress-text"),
    exercisesList: document.getElementById("exercises-list"),
    addExerciseBtn: document.getElementById("add-exercise-btn"),

    timerCard: document.getElementById("timer-card"),
    timerCountdown: document.getElementById("timer-countdown"),
    timerStatusPill: document.getElementById("timer-status-pill"),
    timerCancelBtn: document.getElementById("timer-cancel-btn"),

    notesLabelText: document.getElementById("notes-label-text"),
    notesInput: document.getElementById("notes-input"),
    notesStatus: document.getElementById("notes-status"),

    skipDayBtn: document.getElementById("skip-day-btn"),
    resetBtn: document.getElementById("reset-btn"),
    hardResetBtn: document.getElementById("hard-reset-btn"),
    exportBtn: document.getElementById("export-btn"),
    importBtn: document.getElementById("import-btn"),

    statsHeading: document.getElementById("stats-heading"),
    statsSubheading: document.getElementById("stats-subheading"),
    statsList: document.getElementById("stats-list"),
    statsSummaryDays: document.getElementById("stats-summary-days"),
    statsSummaryWorkouts: document.getElementById("stats-summary-workouts") || document.getElementById("stat-total-workouts"),
    statsSummaryAvg: document.getElementById("stats-summary-avg") || document.getElementById("stat-avg-score"),
    statsSummaryRangeExercises: document.getElementById("stats-summary-range-exercises"),
    statsSummaryActiveDays: document.getElementById("stats-summary-active-days"),
    statsSummaryAvgReps: document.getElementById("stats-summary-avg-reps"),
    weeklyChart: document.getElementById("weekly-chart"),
    progressChart: document.getElementById("progress-chart"),
    range7Btn: document.getElementById("range-7"),
    range30Btn: document.getElementById("range-30"),

    settingsHeading: document.getElementById("settings-heading"),
    settingsSubheading: document.getElementById("settings-subheading"),
    settingsRestLabel: document.getElementById("settings-rest-label"),
    settingsThemeLabel: document.getElementById("settings-theme-label"),
    settingsLanguageLabel: document.getElementById("settings-language-label"),
    settingsRestSelect: document.getElementById("settings-rest-select"),
    settingsThemeSelect: document.getElementById("settings-theme-select"),
    settingsLanguageSelect: document.getElementById("settings-language-select"),
    settingsResetStatsBtn: document.getElementById("settings-reset-stats-btn"),

    modalBackdrop: document.getElementById("modal-backdrop"),
    modalTitle: document.getElementById("modal-title"),
    modalDescription: document.getElementById("modal-description"),
    modalTextarea: document.getElementById("modal-textarea"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    modalCopyBtn: document.getElementById("modal-copy-btn"),
    modalApplyBtn: document.getElementById("modal-apply-btn")
  };

  const ctx = { state: state, els: els };

  function updateNavIndicator(activeBtn) {
    if (!els.navIndicator || !activeBtn) return;
    const navRect = activeBtn.parentElement.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const x = btnRect.left - navRect.left;
    els.navIndicator.style.width = btnRect.width + "px";
    els.navIndicator.style.transform = "translateX(" + x + "px)";
  }

  function switchTab(tab) {
    ctx.state.currentTab = tab;
    GymState.saveState(ctx.state);

    [els.tabHome, els.tabStats, els.tabSettings].forEach(function (element) {
      element.classList.add("hidden");
    });

    document.getElementById("tab-" + tab).classList.remove("hidden");

    [els.tabBtnHome, els.tabBtnStats, els.tabBtnSettings].forEach(function (btn) {
      btn.classList.remove("active");
    });

    if (tab === "home") els.tabBtnHome.classList.add("active");
    if (tab === "stats") els.tabBtnStats.classList.add("active");
    if (tab === "settings") els.tabBtnSettings.classList.add("active");

    const activeBtn = tab === "home"
      ? els.tabBtnHome
      : tab === "stats"
        ? els.tabBtnStats
        : els.tabBtnSettings;

    activeBtn.classList.remove("spring");
    void activeBtn.offsetWidth;
    activeBtn.classList.add("spring");
    setTimeout(function () {
      activeBtn.classList.remove("spring");
    }, 450);

    updateNavIndicator(activeBtn);

    if (tab === "stats") {
      GymStats.renderStats(ctx);
    }
    if (tab === "settings") {
      GymSettings.renderSettings(ctx);
    }
  }

  function initNav() {
    els.tabBtnHome.addEventListener("click", function () { switchTab("home"); });
    els.tabBtnStats.addEventListener("click", function () { switchTab("stats"); });
    els.tabBtnSettings.addEventListener("click", function () { switchTab("settings"); });

    window.addEventListener("resize", function () {
      const activeBtn = document.querySelector(".tab-btn.active");
      updateNavIndicator(activeBtn);
    });
  }

  function init() {
    GymSettings.applyTheme(state);
    GymSettings.applyLanguage(ctx);

    GymHome.initHomeEvents(ctx);
    GymSettings.initSettingsEvents(ctx);
    GymStats.initStatsEvents(ctx);
    initNav();

    GymHome.renderHome(ctx);
    GymStats.renderStats(ctx);
    GymSettings.renderSettings(ctx);

    switchTab(state.currentTab || "home");
  }

  init();
})();
