(function () {
  let timerInterval = null;
  let timerRemaining = 0;
  let timerActive = false;
  let lastRewardTier = "none";

  function getStreakTier(streak) {
    if (streak >= 30) return "legendary";
    if (streak >= 14) return "epic";
    if (streak >= 7) return "hot";
    return "none";
  }

  function getRewardText(state, tier) {
    const lang = state.language || "de";
    const dict = GymState.I18N[lang] || GymState.I18N.de;
    return dict.streakRewards?.[tier] || dict.streakRewards?.none || "Keep going";
  }

  function triggerRewardBurst(ctx) {
    ctx.els.streakPill.classList.remove("reward-pop");
    void ctx.els.streakPill.offsetWidth;
    ctx.els.streakPill.classList.add("reward-pop");
    setTimeout(function () {
      ctx.els.streakPill.classList.remove("reward-pop");
    }, 600);
  }

  function formatSeconds(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? m + ":" + String(r).padStart(2, "0") : r + "s";
  }

  function playBeep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {
      // no-op
    }
  }

  function stopTimer(ctx) {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerActive = false;
    timerRemaining = 0;
    updateTimerUI(ctx);
  }

  function startTimer(ctx) {
    stopTimer(ctx);
    timerRemaining = ctx.state.restSeconds;
    timerActive = true;
    updateTimerUI(ctx);
    timerInterval = setInterval(function () {
      timerRemaining -= 1;
      if (timerRemaining <= 0) {
        stopTimer(ctx);
        playBeep();
      } else {
        updateTimerUI(ctx);
      }
    }, 1000);
  }

  function updateTimerUI(ctx) {
    const els = ctx.els;
    if (!timerActive) {
      els.timerCountdown.textContent = "Ready";
      els.timerCard.classList.remove("timer-active");
      els.timerStatusPill.textContent = "No active timer";
      els.timerStatusPill.classList.remove("active");
      return;
    }
    els.timerCountdown.textContent = formatSeconds(timerRemaining);
    els.timerCard.classList.add("timer-active");
    els.timerStatusPill.textContent = "Rest running";
    els.timerStatusPill.classList.add("active");
  }

  function getAllExercisesForDay(state) {
    const dayPlan = GymState.PLAN[state.currentDayIndex];
    const dayState = state.days[state.currentDayIndex];
    return [...dayPlan.exercises, ...(dayState.customExercises || [])];
  }

  function computeProgressForCurrentDay(state) {
    const dayState = state.days[state.currentDayIndex];
    const allExercises = getAllExercisesForDay(state);
    const total = allExercises.length;
    let done = 0;
    allExercises.forEach(function (ex) {
      if (dayState.exercises[ex.id] && dayState.exercises[ex.id].setsLeft === 0) done += 1;
    });
    return { done: done, total: total };
  }

  function getBestPR(state, exId) {
    const history = state.exerciseStats[exId]?.history || [];
    let best = 0;
    history.forEach(function (entry) {
      const score = Number(entry.weight || 0) * Number(entry.reps || 0);
      if (score > best) best = score;
    });
    return best;
  }

  function getTrendForExercise(state, exId, weight, reps) {
    const w = Number(weight);
    const r = Number(reps);
    if (!w && !r) return "none";

    const stats = state.exerciseStats[exId];
    if (!stats || !Array.isArray(stats.history) || stats.history.length === 0) {
      return "none";
    }

    const prev = stats.history[stats.history.length - 1];
    const prevScore = Number(prev.weight || 0) * Number(prev.reps || 0);
    const newScore = w * r;

    if (newScore > prevScore) return "up";
    if (newScore < prevScore) return "down";
    return "same";
  }

  function updateProgressUI(ctx) {
    const progress = computeProgressForCurrentDay(ctx.state);
    const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
    ctx.els.progressFill.style.width = percent + "%";
    ctx.els.progressText.textContent = percent + "% · " + progress.done + " / " + progress.total + " exercises";
  }

  function updateDayHeaderUI(ctx) {
    const dayPlan = GymState.PLAN[ctx.state.currentDayIndex];
    ctx.els.dayName.textContent = "Day " + dayPlan.id + " - " + dayPlan.name;
    ctx.els.dayTag.textContent = dayPlan.tag;
    ctx.els.dayPillText.textContent = "Day " + dayPlan.id + " / " + GymState.PLAN.length;
  }

  function updateStreakUI(ctx) {
    ctx.els.streakValue.textContent = String(ctx.state.streak);
    const tier = getStreakTier(ctx.state.streak);

    ctx.els.streakPill.classList.remove("streak-high", "tier-epic", "tier-legendary");
    if (tier !== "none") {
      ctx.els.streakPill.classList.add("streak-high");
    }
    if (tier === "epic") {
      ctx.els.streakPill.classList.add("tier-epic");
    }
    if (tier === "legendary") {
      ctx.els.streakPill.classList.add("tier-legendary");
    }

    ctx.els.streakReward.textContent = getRewardText(ctx.state, tier);
  }

  function updateNotesUI(ctx) {
    ctx.els.notesInput.value = ctx.state.days[ctx.state.currentDayIndex].notes || "";
  }

  function ensureExerciseStatsBucket(state, exId) {
    if (!state.exerciseStats[exId]) {
      state.exerciseStats[exId] = { lastWeight: null, lastReps: null, history: [] };
    }
  }

  function getSmartSuggestion(state, exId) {
    const bucket = state.exerciseStats[exId];
    const lastWeight = Number(bucket?.lastWeight || 0);
    const lastReps = Number(bucket?.lastReps || 0);
    if (!lastWeight) return null;

    const nextWeight = lastReps >= 8 ? lastWeight + 2.5 : lastWeight;
    return {
      baseline: lastWeight,
      suggested: Math.max(0, Number(nextWeight.toFixed(1))),
      lastReps: lastReps
    };
  }

  function getGoalProgress(state, exId, currentWeight) {
    const goal = Number(state.goals?.[exId] || 0);
    if (!goal) {
      return { goal: 0, current: Number(currentWeight || 0), percent: 0 };
    }

    const current = Number(currentWeight || 0);
    const percent = Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
    return { goal: goal, current: current, percent: percent };
  }

  function setGoal(ctx, exId) {
    const existing = Number(ctx.state.goals?.[exId] || 0);
    const input = prompt("Goal (kg)?", existing > 0 ? String(existing) : "");
    if (input === null) return;

    const value = Number(input);
    if (!Number.isFinite(value) || value <= 0) {
      if (ctx.state.goals && ctx.state.goals[exId]) {
        delete ctx.state.goals[exId];
      }
      GymState.saveState(ctx.state);
      renderHome(ctx);
      return;
    }

    if (!ctx.state.goals) {
      ctx.state.goals = {};
    }
    ctx.state.goals[exId] = value;
    GymState.saveState(ctx.state);
    renderHome(ctx);
  }

  function handleExerciseDone(ctx, exId, exState, cardEl) {
    const weight = exState.weight;
    const reps = exState.reps;
    const trend = getTrendForExercise(ctx.state, exId, weight, reps);

    exState.done = true;
    exState.lastTrend = trend;

    ensureExerciseStatsBucket(ctx.state, exId);

    const bucket = ctx.state.exerciseStats[exId];
    const history = Array.isArray(bucket.history) ? bucket.history : [];
    bucket.history = history;

    const currentScore = Number(weight || 0) * Number(reps || 0);
    const bestBefore = getBestPR(ctx.state, exId);
    let isPR = false;

    history.push({
      date: new Date().toISOString(),
      weight: Number(weight || 0),
      reps: Number(reps || 0)
    });

    bucket.lastWeight = Number(weight || 0);
    bucket.lastReps = Number(reps || 0);

    if (currentScore > bestBefore) {
      exState.lastTrend = "pr";
      isPR = true;
      if (cardEl) {
        cardEl.classList.remove("pulse");
        void cardEl.offsetWidth;
        cardEl.classList.add("pulse");
      }
    }

    return isPR;
  }

  function updateStreakIfNeeded(ctx) {
    const progress = computeProgressForCurrentDay(ctx.state);
    if (progress.done !== progress.total) return;

    const todayKey = GymState.getTodayKey();
    if (ctx.state.lastStreakDate === todayKey) return;

    ctx.state.streak += 1;
    ctx.state.lastStreakDate = todayKey;
    GymState.saveState(ctx.state);

    const tier = getStreakTier(ctx.state.streak);
    if (tier !== "none" && tier !== lastRewardTier) {
      triggerRewardBurst(ctx);
    }
    lastRewardTier = tier;

    updateStreakUI(ctx);
  }

  function maybeAdvanceDay(ctx) {
    const progress = computeProgressForCurrentDay(ctx.state);
    if (progress.done === progress.total && progress.total > 0) {
      setTimeout(function () {
        advanceDay(ctx);
      }, 350);
    }
  }

  function advanceDay(ctx) {
    ctx.state.currentDayIndex = (ctx.state.currentDayIndex + 1) % GymState.PLAN.length;
    const newDay = ctx.state.days[ctx.state.currentDayIndex];
    Object.values(newDay.exercises).forEach(function (ex) {
      ex.setsLeft = 3;
      ex.done = false;
      ex.lastTrend = "none";
    });

    GymState.saveState(ctx.state);
    renderHome(ctx);
    stopTimer(ctx);
  }

  function addExercise(ctx) {
    const name = prompt("Exercise name?");
    if (!name) return;

    const id = "ex_" + Date.now();
    const dayState = ctx.state.days[ctx.state.currentDayIndex];
    dayState.customExercises = dayState.customExercises || [];
    dayState.customExercises.push({ id: id, name: name.trim() });
    dayState.exercises[id] = {
      weight: "",
      reps: "",
      setsLeft: 3,
      done: false,
      lastTrend: "none"
    };

    GymState.saveState(ctx.state);
    renderHome(ctx);
  }

  function deleteExercise(ctx, exId) {
    const dayState = ctx.state.days[ctx.state.currentDayIndex];
    const isCustom = (dayState.customExercises || []).some(function (e) { return e.id === exId; });

    if (!isCustom) {
      alert("Base exercises cannot be deleted.");
      return;
    }

    if (!confirm("Delete this custom exercise?")) return;

    dayState.customExercises = dayState.customExercises.filter(function (ex) {
      return ex.id !== exId;
    });
    delete dayState.exercises[exId];
    delete ctx.state.exerciseStats[exId];

    GymState.saveState(ctx.state);
    renderHome(ctx);
  }

  function toggleGoalUI(exId) {
    const el = document.getElementById("goal-ui-" + exId);
    if (el) el.classList.toggle("hidden");
  }

  function saveGoal(ctx, exId) {
    const input = document.getElementById("goal-input-" + exId);
    const val = Number(input && input.value);
    if (!val || val <= 0) return;
    if (!ctx.state.goals) ctx.state.goals = {};
    ctx.state.goals[exId] = val;
    GymState.saveState(ctx.state);
    renderHome(ctx);
  }

  function removeGoal(ctx, exId) {
    if (ctx.state.goals) delete ctx.state.goals[exId];
    GymState.saveState(ctx.state);
    renderHome(ctx);
  }

  function renderGoal(ctx, ex) {
    var exId = ex.id;
    var dayState = ctx.state.days[ctx.state.currentDayIndex];
    var exState = dayState.exercises[exId];
    var current = Number(exState && exState.weight) || 0;
    var goal = ctx.state.goals && ctx.state.goals[exId];

    var bar = document.getElementById("goal-bar-" + exId);
    var label = document.getElementById("goal-label-" + exId);
    var inputEl = document.getElementById("goal-input-" + exId);

    if (!bar || !label) return;

    if (!goal) {
      label.textContent = "🎯 Set your goal";
      bar.style.width = "0%";
      return;
    }

    if (inputEl) inputEl.value = String(goal);
    var percent = Math.min(100, Math.round((current / goal) * 100));
    bar.style.width = percent + "%";

    if (percent >= 100) {
      label.textContent = "🔥 Goal reached! (" + goal + "kg)";
    } else {
      label.textContent = current + "kg / " + goal + "kg → " + percent + "%";
    }
  }

  function renderSuggestion(ctx, ex) {
    var exId = ex.id;
    var stats = ctx.state.exerciseStats && ctx.state.exerciseStats[exId];
    var el = document.getElementById("suggestion-" + exId);
    if (!el) return;

    if (!stats || !stats.lastWeight) {
      el.textContent = "Start training to unlock AI suggestion 🤖";
      el.style.opacity = "0.6";
      el.onclick = null;
      return;
    }

    var sug = Number(stats.lastWeight) + 2.5;
    el.textContent = "🔥 Suggested: " + sug + "kg";
    el.style.opacity = "1";

    el.onclick = function () {
      var dayState = ctx.state.days[ctx.state.currentDayIndex];
      if (dayState.exercises[exId]) {
        dayState.exercises[exId].weight = String(sug);
      }
      GymState.saveState(ctx.state);
      renderHome(ctx);
    };
  }

  function pulseCard(exId) {
    var card = document.querySelector("[data-id='" + exId + "']");
    if (!card) return;
    card.classList.remove("pulse");
    void card.offsetWidth;
    card.classList.add("pulse");
  }

  function renderExercises(ctx) {
    const dayState = ctx.state.days[ctx.state.currentDayIndex];
    const exercises = getAllExercisesForDay(ctx.state);
    let touchedState = false;

    ctx.els.exercisesList.innerHTML = "";

    exercises.forEach(function (ex) {
      const exState = dayState.exercises[ex.id];
      if (!exState) return;

      const card = document.createElement("article");
      card.className = "exercise-card" + (exState.setsLeft === 0 ? " exercise-done" : "");
      card.setAttribute("data-id", ex.id);

      const header = document.createElement("div");
      header.className = "exercise-header";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h3");
      title.className = "exercise-name";
      title.textContent = ex.name;
      titleWrap.appendChild(title);

      const trend = document.createElement("span");
      trend.className = "trend-pill trend-same";
      trend.textContent = "No history";

      if (exState.lastTrend === "pr") {
        trend.className = "trend-pill trend-up";
        trend.textContent = "NEW PR";
      } else if (exState.lastTrend === "up") {
        trend.className = "trend-pill trend-up";
        trend.textContent = "Up";
      } else if (exState.lastTrend === "down") {
        trend.className = "trend-pill trend-down";
        trend.textContent = "Down";
      } else if (exState.lastTrend === "same") {
        trend.className = "trend-pill trend-same";
        trend.textContent = "Same";
      }

      header.appendChild(titleWrap);
      header.appendChild(trend);

      const body = document.createElement("div");
      body.className = "exercise-body";

      const weightGroup = document.createElement("label");
      weightGroup.className = "input-group";
      weightGroup.textContent = "Weight (kg)";
      const weightInput = document.createElement("input");
      weightInput.type = "number";
      weightInput.min = "0";
      weightInput.step = "0.5";
      const smart = getSmartSuggestion(ctx.state, ex.id);

      if (!exState.weight && smart?.baseline) {
        exState.weight = String(smart.baseline);
        touchedState = true;
      }

      weightInput.value = exState.weight || "";

      const suggestionValue = smart?.suggested || 0;
      if (suggestionValue > 0) {
        weightInput.placeholder = "Try " + suggestionValue.toFixed(1);
      } else {
        weightInput.placeholder = "e.g. 60";
      }

      weightInput.addEventListener("input", function () {
        exState.weight = weightInput.value;
        GymState.saveState(ctx.state);
      });
      weightGroup.appendChild(weightInput);

      const repsGroup = document.createElement("label");
      repsGroup.className = "input-group";
      repsGroup.textContent = "Reps";
      const repsInput = document.createElement("input");
      repsInput.type = "number";
      repsInput.min = "0";
      repsInput.step = "1";
      repsInput.value = exState.reps || "";
      repsInput.placeholder = "e.g. 8";
      repsInput.addEventListener("input", function () {
        exState.reps = repsInput.value;
        GymState.saveState(ctx.state);
      });
      repsGroup.appendChild(repsInput);

      const actions = document.createElement("div");
      actions.className = "exercise-actions";

      const suggestBtn = document.createElement("button");
      suggestBtn.className = "btn btn-outline";
      suggestBtn.type = "button";
      suggestBtn.textContent = smart?.suggested ? "Use " + smart.suggested : "+2.5";
      suggestBtn.addEventListener("click", function () {
        const next = smart?.suggested || (Number(ctx.state.exerciseStats[ex.id]?.lastWeight || 0) + 2.5);
        if (next > 0) {
          exState.weight = String(next);
          weightInput.value = exState.weight;
          GymState.saveState(ctx.state);
        }
      });

      const doneBtn = document.createElement("button");
      doneBtn.className = "btn btn-primary";
      doneBtn.type = "button";
      doneBtn.textContent = exState.setsLeft > 0 ? "Set (" + exState.setsLeft + ")" : "Done";
      doneBtn.disabled = exState.setsLeft === 0;
      doneBtn.addEventListener("click", function () {
        if (!exState.weight || !exState.reps) {
          weightInput.focus();
          return;
        }

        if (exState.setsLeft > 0) {
          exState.setsLeft -= 1;
          let isPR = false;
          if (exState.setsLeft === 0) {
            isPR = handleExerciseDone(ctx, ex.id, exState, card);
          }

          GymState.saveState(ctx.state);

          if (isPR) {
            setTimeout(function () {
              renderHome(ctx);
              startTimer(ctx);
              updateStreakIfNeeded(ctx);
              maybeAdvanceDay(ctx);
            }, 420);
          } else {
            renderHome(ctx);
            startTimer(ctx);
            updateStreakIfNeeded(ctx);
            maybeAdvanceDay(ctx);
          }
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", function () {
        deleteExercise(ctx, ex.id);
      });

      actions.appendChild(suggestBtn);
      actions.appendChild(doneBtn);
      actions.appendChild(deleteBtn);

      body.appendChild(weightGroup);
      body.appendChild(repsGroup);
      body.appendChild(actions);

      // GOAL TOGGLE BUTTON
      const goalToggleBtn = document.createElement("button");
      goalToggleBtn.type = "button";
      goalToggleBtn.className = "btn btn-outline";
      goalToggleBtn.textContent = "🎯 Goal";
      goalToggleBtn.style.fontSize = "0.74rem";
      goalToggleBtn.style.padding = "5px 10px";
      goalToggleBtn.addEventListener("click", function () {
        toggleGoalUI(ex.id);
      });

      // GOAL UI (hidden by default)
      const goalUI = document.createElement("div");
      goalUI.className = "goal-ui hidden";
      goalUI.id = "goal-ui-" + ex.id;

      const goalInputEl = document.createElement("input");
      goalInputEl.type = "number";
      goalInputEl.className = "goal-input";
      goalInputEl.id = "goal-input-" + ex.id;
      goalInputEl.placeholder = "Goal kg";
      goalInputEl.min = "0";
      goalInputEl.step = "0.5";

      const goalActionsEl = document.createElement("div");
      goalActionsEl.className = "goal-actions";

      const goalSaveBtn = document.createElement("button");
      goalSaveBtn.type = "button";
      goalSaveBtn.className = "goal-save";
      goalSaveBtn.textContent = "Save";
      goalSaveBtn.addEventListener("click", function () {
        saveGoal(ctx, ex.id);
      });

      const goalRemoveBtn = document.createElement("button");
      goalRemoveBtn.type = "button";
      goalRemoveBtn.className = "goal-remove";
      goalRemoveBtn.textContent = "✕";
      goalRemoveBtn.addEventListener("click", function () {
        removeGoal(ctx, ex.id);
      });

      goalActionsEl.appendChild(goalSaveBtn);
      goalActionsEl.appendChild(goalRemoveBtn);
      goalUI.appendChild(goalInputEl);
      goalUI.appendChild(goalActionsEl);

      // GOAL LABEL
      const goalLabelEl = document.createElement("div");
      goalLabelEl.className = "goal-label";
      goalLabelEl.id = "goal-label-" + ex.id;

      // GOAL BAR
      const goalBarWrapEl = document.createElement("div");
      goalBarWrapEl.className = "goal-bar-wrap";
      const goalBarEl = document.createElement("div");
      goalBarEl.className = "goal-bar";
      goalBarEl.id = "goal-bar-" + ex.id;
      goalBarWrapEl.appendChild(goalBarEl);

      // SUGGESTION
      const suggestionEl = document.createElement("div");
      suggestionEl.className = "suggestion";
      suggestionEl.id = "suggestion-" + ex.id;

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(goalToggleBtn);
      card.appendChild(goalUI);
      card.appendChild(goalLabelEl);
      card.appendChild(goalBarWrapEl);
      card.appendChild(suggestionEl);
      ctx.els.exercisesList.appendChild(card);

      // Render goal + suggestion after DOM insertion
      (function (capturedEx) {
        setTimeout(function () {
          renderGoal(ctx, capturedEx);
          renderSuggestion(ctx, capturedEx);
        }, 0);
      }(ex));
    });

    if (touchedState) {
      GymState.saveState(ctx.state);
    }
  }

  function renderHome(ctx) {
    lastRewardTier = getStreakTier(ctx.state.streak);
    updateDayHeaderUI(ctx);
    updateProgressUI(ctx);
    updateStreakUI(ctx);
    updateNotesUI(ctx);
    updateTimerUI(ctx);
    renderExercises(ctx);
  }

  function initHomeEvents(ctx) {
    ctx.els.addExerciseBtn.addEventListener("click", function () {
      addExercise(ctx);
    });

    ctx.els.skipDayBtn.addEventListener("click", function () {
      advanceDay(ctx);
    });

    ctx.els.timerCancelBtn.addEventListener("click", function () {
      stopTimer(ctx);
    });

    ctx.els.notesInput.addEventListener("input", function () {
      const dayState = ctx.state.days[ctx.state.currentDayIndex];
      dayState.notes = ctx.els.notesInput.value;
      ctx.els.notesStatus.textContent = "Saved";
      GymState.saveState(ctx.state);
      setTimeout(function () {
        ctx.els.notesStatus.textContent = "Auto-save enabled";
      }, 700);
    });
  }

  window.GymHome = {
    renderHome,
    initHomeEvents,
    computeProgressForCurrentDay,
    advanceDay,
    stopTimer
  };
})();
