(function () {
  let chartInstance = null;

  function getBestPR(state, exId) {
    const history = state.exerciseStats[exId]?.history || [];
    let best = 0;
    history.forEach(function (h) {
      const score = Number(h.weight || 0) * Number(h.reps || 0);
      if (score > best) best = score;
    });
    return best;
  }

  function getLastWorkout(state, exId) {
    const history = state.exerciseStats[exId]?.history || [];
    if (history.length === 0) return null;
    return history[history.length - 1];
  }

  function getTrend(state, exId) {
    const history = state.exerciseStats[exId]?.history || [];
    if (history.length < 2) return "flat";
    const prev = history[history.length - 2];
    const last = history[history.length - 1];

    const prevScore = Number(prev.weight || 0) * Number(prev.reps || 0);
    const lastScore = Number(last.weight || 0) * Number(last.reps || 0);

    if (lastScore > prevScore) return "up";
    if (lastScore < prevScore) return "down";
    return "flat";
  }

  function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString();
  }

  function getDayKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function buildTimeBuckets(state, days) {
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
    const today = new Date();
    const points = [];
    const byDay = {};

    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(today.getDate() - i);
      const key = getDayKey(d);
      points.push({
        key: key,
        label: formatter.format(d),
        score: 0,
        sessions: 0
      });
      byDay[key] = points[points.length - 1];
    }

    Object.keys(state.exerciseStats).forEach(function (exId) {
      const history = state.exerciseStats[exId]?.history || [];
      history.forEach(function (entry) {
        if (!entry?.date) return;
        const entryDay = getDayKey(new Date(entry.date));
        const bucket = byDay[entryDay];
        if (!bucket) return;
        bucket.score += Number(entry.weight || 0) * Number(entry.reps || 0);
        bucket.sessions += 1;
      });
    });

    return points;
  }

  function updateRangeButtons(ctx) {
    ctx.els.range7Btn?.classList.toggle("active", ctx.state.statsRange === 7);
    ctx.els.range30Btn?.classList.toggle("active", ctx.state.statsRange === 30);
  }

  function buildChartData(points) {
    return {
      labels: points.map(function (point) { return point.label; }),
      values: points.map(function (point) { return point.score; }),
      sessions: points.map(function (point) { return point.sessions; })
    };
  }

  function renderLineChart(ctx, points) {
    if (!ctx.els.progressChart) return;

    if (typeof Chart === "undefined") {
      ctx.els.weeklyChart.innerHTML = "Chart.js failed to load.";
      return;
    }

    const chartData = buildChartData(points);
    const chartContext = ctx.els.progressChart.getContext("2d");
    if (!chartContext) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    chartInstance = new Chart(chartContext, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Performance",
            data: chartData.values,
            borderColor: "rgba(104, 169, 255, 0.96)",
            backgroundColor: "rgba(104, 169, 255, 0.22)",
            fill: true,
            pointBackgroundColor: "rgba(70, 219, 161, 0.95)",
            pointBorderColor: "rgba(7, 11, 20, 0.92)",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 550,
          easing: "easeOutCubic"
        },
        plugins: {
          legend: {
            labels: {
              color: "rgba(229, 231, 235, 0.9)"
            }
          },
          tooltip: {
            callbacks: {
              label: function (item) {
                const sessions = chartData.sessions[item.dataIndex] || 0;
                return "Score " + item.raw + " · Sessions " + sessions;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: "rgba(156, 163, 175, 0.9)"
            },
            grid: {
              color: "rgba(120, 144, 176, 0.18)"
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "rgba(156, 163, 175, 0.9)"
            },
            grid: {
              color: "rgba(120, 144, 176, 0.16)"
            }
          }
        }
      }
    });
  }

  function renderWeeklyProgressChart(ctx) {
    const points = buildTimeBuckets(ctx.state, ctx.state.statsRange || 7);
    renderLineChart(ctx, points);
    updateRangeButtons(ctx);

    return points;
  }

  function summarizeRange(points, state) {
    let rangeExercises = 0;
    let totalReps = 0;
    let repsEntries = 0;

    const activeDays = points.filter(function (p) { return p.sessions > 0; }).length;

    Object.keys(state.exerciseStats).forEach(function (exId) {
      const history = state.exerciseStats[exId]?.history || [];
      history.forEach(function (entry) {
        const day = getDayKey(new Date(entry.date));
        if (!points.some(function (point) { return point.key === day; })) {
          return;
        }
        rangeExercises += 1;
        totalReps += Number(entry.reps || 0);
        repsEntries += 1;
      });
    });

    const avgReps = repsEntries > 0 ? (totalReps / repsEntries) : 0;
    return {
      rangeExercises: rangeExercises,
      activeDays: activeDays,
      avgReps: avgReps
    };
  }

  function renderStats(ctx) {
    const baseExercises = GymState.PLAN.flatMap(function (day) { return day.exercises; });
    const customExercises = ctx.state.days.flatMap(function (day) {
      return Array.isArray(day.customExercises) ? day.customExercises : [];
    });
    const allExercises = baseExercises.concat(customExercises).filter(function (exercise, index, arr) {
      return arr.findIndex(function (item) { return item.id === exercise.id; }) === index;
    });
    ctx.els.statsList.innerHTML = "";

    let totalSetsDone = 0;
    let bestPR = 0;
    let avgSum = 0;
    let avgCount = 0;

    ctx.state.days.forEach(function (day) {
      totalSetsDone += Object.values(day.exercises || {}).filter(function (exercise) {
        return exercise.done;
      }).length;
    });

    allExercises.forEach(function (ex) {
      const best = getBestPR(ctx.state, ex.id);
      const last = getLastWorkout(ctx.state, ex.id);
      const trend = getTrend(ctx.state, ex.id);

      const row = document.createElement("article");
      row.className = "stats-row";

      const name = document.createElement("div");
      name.className = "stats-name";
      name.textContent = ex.name;

      const bestEl = document.createElement("div");
      bestEl.className = "stats-best";
      bestEl.textContent = "Best PR: " + best;

      const lastEl = document.createElement("div");
      lastEl.className = "stats-last";
      lastEl.textContent = last
        ? "Last: " + last.weight + "kg x " + last.reps + " @ " + formatDate(last.date)
        : "Last: -";

      const trendEl = document.createElement("span");
      trendEl.className = "trend-pill " + (trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : "trend-same");
      trendEl.textContent = trend === "up" ? "Trend Up" : trend === "down" ? "Trend Down" : "Trend Flat";

      row.appendChild(name);
      row.appendChild(bestEl);
      row.appendChild(lastEl);
      row.appendChild(trendEl);

      ctx.els.statsList.appendChild(row);

      const history = ctx.state.exerciseStats[ex.id]?.history || [];
      history.forEach(function (h) {
        const score = Number(h.weight || 0) * Number(h.reps || 0);
        if (score > bestPR) bestPR = score;
        avgSum += score;
        avgCount += 1;
      });
    });

    const avg = avgCount > 0 ? Math.round(avgSum / avgCount) : 0;
    ctx.els.statsSummaryDays.textContent = String(ctx.state.streak);
    ctx.els.statsSummaryWorkouts.textContent = String(totalSetsDone);
    ctx.els.statsSummaryAvg.textContent = String(avg);

    const statTotalWorkouts = document.getElementById("stat-total-workouts");
    const statAvgScore = document.getElementById("stat-avg-score");
    const statBestPR = document.getElementById("stat-best-pr");
    if (statTotalWorkouts) statTotalWorkouts.textContent = String(totalSetsDone);
    if (statAvgScore) statAvgScore.textContent = String(avg);
    if (statBestPR) statBestPR.textContent = String(bestPR);

    const points = renderWeeklyProgressChart(ctx);
    const rangeSummary = summarizeRange(points, ctx.state);
    if (ctx.els.statsSummaryRangeExercises) {
      ctx.els.statsSummaryRangeExercises.textContent = String(rangeSummary.rangeExercises);
    }
    if (ctx.els.statsSummaryActiveDays) {
      ctx.els.statsSummaryActiveDays.textContent = String(rangeSummary.activeDays);
    }
    if (ctx.els.statsSummaryAvgReps) {
      ctx.els.statsSummaryAvgReps.textContent = rangeSummary.avgReps.toFixed(1);
    }
  }

  function setRange(ctx, range) {
    if (![7, 30].includes(range)) return;
    ctx.state.statsRange = range;
    GymState.saveState(ctx.state);
    renderStats(ctx);
  }

  function initStatsEvents(ctx) {
    ctx.els.range7Btn?.addEventListener("click", function () {
      setRange(ctx, 7);
    });

    ctx.els.range30Btn?.addEventListener("click", function () {
      setRange(ctx, 30);
    });
  }

  window.GymStats = {
    renderStats,
    getBestPR,
    initStatsEvents
  };
})();
