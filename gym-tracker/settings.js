(function () {
  function setLabel(el, text) {
    if (!el) return;
    const label = el.querySelector(".btn-label");
    if (label) {
      label.textContent = text;
    } else {
      el.textContent = text;
    }
  }

  function applyTheme(state) {
    document.body.setAttribute("data-theme", state.theme);
  }

  function applyLanguage(ctx) {
    const lang = ctx.state.language;
    const dict = GymState.I18N[lang] || GymState.I18N.de;

    ctx.els.subtitle.textContent = dict.appTagline;
    ctx.els.homeHeading.textContent = dict.currentDay;
    ctx.els.homeSubheading.textContent = dict.currentDaySub;
    ctx.els.notesHeading.textContent = dict.notesControl;
    ctx.els.notesSubheading.textContent = dict.notesControlSub;
    ctx.els.notesLabelText.textContent = dict.notesLabel;
    ctx.els.notesStatus.textContent = dict.autosave;
    setLabel(ctx.els.addExerciseBtn, dict.addExercise);
    setLabel(ctx.els.skipDayBtn, dict.skipDay);
    setLabel(ctx.els.resetBtn, dict.resetAll);
    setLabel(ctx.els.exportBtn, dict.exportData);
    setLabel(ctx.els.importBtn, dict.importData);
    setLabel(ctx.els.hardResetBtn, dict.hardReset);
    ctx.els.statsHeading.textContent = dict.statsTitle;
    ctx.els.statsSubheading.textContent = dict.statsSub;
    ctx.els.settingsHeading.textContent = dict.settingsTitle;
    ctx.els.settingsSubheading.textContent = dict.settingsSub;
    ctx.els.settingsRestLabel.textContent = dict.restTimer;
    setLabel(ctx.els.settingsResetStatsBtn, dict.resetStatsOnly);
    ctx.els.settingsLanguageLabel.textContent = dict.language;
    ctx.els.settingsThemeLabel.textContent = dict.theme;

    const homeLabel = ctx.els.tabBtnHome.querySelector(".tab-label");
    const statsLabel = ctx.els.tabBtnStats.querySelector(".tab-label");
    const settingsLabel = ctx.els.tabBtnSettings.querySelector(".tab-label");

    if (homeLabel && statsLabel && settingsLabel) {
      homeLabel.textContent = dict.tabs.home;
      statsLabel.textContent = dict.tabs.stats;
      settingsLabel.textContent = dict.tabs.settings;
    } else {
      ctx.els.tabBtnHome.textContent = dict.tabs.home;
      ctx.els.tabBtnStats.textContent = dict.tabs.stats;
      ctx.els.tabBtnSettings.textContent = dict.tabs.settings;
    }

    if (lang === "ar") {
      document.documentElement.lang = "ar";
      document.body.setAttribute("dir", "rtl");
    } else {
      document.documentElement.lang = lang;
      document.body.setAttribute("dir", "ltr");
    }
  }

  function resetStatsOnly(ctx) {
    if (!confirm("Reset only performance stats?")) return;
    ctx.state.exerciseStats = {};
    ctx.state.days.forEach(function (day) {
      Object.values(day.exercises).forEach(function (ex) {
        ex.lastTrend = "none";
      });
    });
    GymState.saveState(ctx.state);
    GymStats.renderStats(ctx);
    GymHome.renderHome(ctx);
  }

  function softReset(ctx) {
    if (!confirm("Reset all training data?")) return;
    const defaults = GymState.createDefaultState();
    ctx.state.currentDayIndex = 0;
    ctx.state.streak = 0;
    ctx.state.lastStreakDate = null;
    ctx.state.days = defaults.days;
    ctx.state.exerciseStats = {};
    ctx.state.goals = {};
    GymState.saveState(ctx.state);
    GymHome.stopTimer(ctx);
    GymHome.renderHome(ctx);
    GymStats.renderStats(ctx);
  }

  function hardReset(ctx) {
    if (!confirm("Hard reset all data and settings?")) return;
    Object.assign(ctx.state, GymState.createDefaultState());
    GymState.saveState(ctx.state);
    GymHome.stopTimer(ctx);
    renderSettings(ctx);
    GymHome.renderHome(ctx);
    GymStats.renderStats(ctx);
    applyTheme(ctx.state);
    applyLanguage(ctx);
  }

  function exportData(ctx) {
    const text = JSON.stringify(ctx.state, null, 2);
    ctx.els.modalTitle.textContent = "Export Data";
    ctx.els.modalDescription.textContent = "Copy this JSON and save it safely.";
    ctx.els.modalTextarea.value = text;
    setLabel(ctx.els.modalApplyBtn, "Close");
    ctx.els.modalApplyBtn.dataset.mode = "export";
    ctx.els.modalBackdrop.classList.remove("hidden");
  }

  function importData(ctx) {
    ctx.els.modalTitle.textContent = "Import Data";
    ctx.els.modalDescription.textContent = "Paste exported JSON. Current data will be replaced.";
    ctx.els.modalTextarea.value = "";
    setLabel(ctx.els.modalApplyBtn, "Import");
    ctx.els.modalApplyBtn.dataset.mode = "import";
    ctx.els.modalBackdrop.classList.remove("hidden");
  }

  function applyModal(ctx) {
    const mode = ctx.els.modalApplyBtn.dataset.mode;
    if (mode === "export") {
      ctx.els.modalBackdrop.classList.add("hidden");
      return;
    }

    try {
      const parsed = JSON.parse(ctx.els.modalTextarea.value.trim());
      Object.assign(ctx.state, GymState.sanitizeState(parsed));
      GymState.saveState(ctx.state);
      ctx.els.modalBackdrop.classList.add("hidden");
      renderSettings(ctx);
      applyTheme(ctx.state);
      applyLanguage(ctx);
      GymHome.renderHome(ctx);
      GymStats.renderStats(ctx);
    } catch (_) {
      alert("Invalid JSON");
    }
  }

  function renderSettings(ctx) {
    ctx.els.settingsRestSelect.value = String(ctx.state.restSeconds);
    ctx.els.settingsThemeSelect.value = ctx.state.theme;
    ctx.els.settingsLanguageSelect.value = ctx.state.language;
  }

  function initSettingsEvents(ctx) {
    ctx.els.settingsRestSelect.addEventListener("change", function () {
      ctx.state.restSeconds = Number(ctx.els.settingsRestSelect.value) || 30;
      GymState.saveState(ctx.state);
    });

    ctx.els.settingsThemeSelect.addEventListener("change", function () {
      ctx.state.theme = ctx.els.settingsThemeSelect.value === "light" ? "light" : "dark";
      GymState.saveState(ctx.state);
      applyTheme(ctx.state);
    });

    ctx.els.settingsLanguageSelect.addEventListener("change", function () {
      ctx.state.language = ctx.els.settingsLanguageSelect.value;
      GymState.saveState(ctx.state);
      applyLanguage(ctx);
    });

    ctx.els.resetBtn.addEventListener("click", function () {
      softReset(ctx);
    });

    ctx.els.hardResetBtn.addEventListener("click", function () {
      hardReset(ctx);
    });

    ctx.els.settingsResetStatsBtn.addEventListener("click", function () {
      resetStatsOnly(ctx);
    });

    ctx.els.exportBtn.addEventListener("click", function () {
      exportData(ctx);
    });

    ctx.els.importBtn.addEventListener("click", function () {
      importData(ctx);
    });

    ctx.els.modalCloseBtn.addEventListener("click", function () {
      ctx.els.modalBackdrop.classList.add("hidden");
    });

    ctx.els.modalCopyBtn.addEventListener("click", function () {
      const text = ctx.els.modalTextarea.value;
      if (!text) return;
      navigator.clipboard?.writeText(text).catch(function () {});
    });

    ctx.els.modalApplyBtn.addEventListener("click", function () {
      applyModal(ctx);
    });

    ctx.els.modalBackdrop.addEventListener("click", function (event) {
      if (event.target === ctx.els.modalBackdrop) {
        ctx.els.modalBackdrop.classList.add("hidden");
      }
    });
  }

  window.GymSettings = {
    renderSettings,
    initSettingsEvents,
    applyTheme,
    applyLanguage
  };
})();
