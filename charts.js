(function(global) {
  function createChart(ctx, type, data, options) {
    return new Chart(ctx, {
      type,
      data,
      options
    });
  }

  function createLineChart(ctx, data, options) {
    return createChart(ctx, "line", data, options);
  }

  function createOrUpdateChart(currentChart, createFn, updateFn, mode) {
    const nextMode = mode || "none";
    if (!currentChart) {
      return createFn();
    }

    updateFn(currentChart);
    currentChart.update(nextMode);
    return currentChart;
  }

  function formatDurationAxisTick(value) {
    if (value === 0) return "0h";
    if (value < 1) return Math.round(value * 60) + "m";
    return Math.round(value) + "h";
  }

  function createChartXAxis(tickColor, font) {
    return {
      ticks: {
        color: tickColor || "#94a3b8",
        ...(font ? { font } : {})
      },
      grid: { display: false }
    };
  }

  function createDurationYAxis(options) {
    const config = options || {};
    const {
      tickColor = "#94a3b8",
      font = null,
      gridColor = "rgba(255,255,255,0.06)",
      min = undefined,
      suggestedMax = undefined,
      drawBorder = false,
      tickLength = 6
    } = config;

    return {
      ...(min !== undefined ? { min } : {}),
      ...(suggestedMax !== undefined ? { suggestedMax } : {}),
      ticks: {
        color: tickColor,
        ...(font ? { font } : {}),
        callback: function(value) {
          return formatDurationAxisTick(value);
        }
      },
      grid: {
        color: gridColor,
        drawBorder,
        tickLength
      }
    };
  }

  function createChartTooltip(options) {
    const config = options || {};
    const {
      backgroundColor,
      bodyColor,
      borderColor,
      titleColor = "#ffffff",
      borderWidth = 1,
      padding = 12,
      cornerRadius = 12,
      labelFormatter,
      titleFormatter
    } = config;

    return {
      backgroundColor,
      titleColor,
      bodyColor,
      borderColor,
      borderWidth,
      padding,
      cornerRadius,
      displayColors: false,
      callbacks: {
        title: function(context) {
          if (typeof titleFormatter === "function") {
            return titleFormatter(context);
          }
          return context[0]?.label || "";
        },
        label: function(context) {
          if (typeof labelFormatter === "function") {
            return labelFormatter(context);
          }
          return context.formattedValue || "";
        }
      }
    };
  }

  function setChartEmptyState(canvasId, isEmpty) {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas?.closest(".chart-wrapper");
    if (!canvas || !wrapper) return;

    let stateEl = wrapper.querySelector(".chart-empty-state");
    if (!stateEl) {
      stateEl = document.createElement("div");
      stateEl.className = "chart-empty-state hidden";
      stateEl.innerHTML = "<div>📭 Keine ausreichenden Daten</div><div>Starte mit deinem ersten Eintrag.</div>";
      wrapper.appendChild(stateEl);
    }

    stateEl.classList.toggle("hidden", !isEmpty);
    canvas.style.opacity = isEmpty ? "0.25" : "1";
  }

  function setChartInsightLayer(canvasId, text, hidden) {
    const canvas = document.getElementById(canvasId);
    const wrapper = canvas?.closest(".chart-wrapper");
    if (!canvas || !wrapper) return;

    let insightEl = wrapper.querySelector(".chart-insight-layer");
    if (!insightEl) {
      insightEl = document.createElement("div");
      insightEl.className = "chart-insight-layer hidden";
      wrapper.appendChild(insightEl);
    }

    insightEl.textContent = text || "";
    insightEl.classList.toggle("hidden", Boolean(hidden) || !text);
  }

  function createChartsController(deps) {
    Chart.defaults.animation.duration = 300;
    Chart.defaults.font.family = "system-ui";

    const chartState = {
      weekChart: null,
      monthChart: null,
      globalChart: null,
      branchChart: null,
      branchHideTimeout: null,
      lastInsightsHash: ""
    };

    function resetBranchChart() {
      if (chartState.branchChart) {
        chartState.branchChart.destroy();
        chartState.branchChart = null;
      }
    }

    function renderMonthChart() {
      const canvas = document.getElementById("monthChart");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const jobColor = deps.getJobColor(deps.getSelectedJob());
      const monthDate = new Date(deps.state.selectedMonth);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      const data = days.map((day) => {
        const d = new Date(year, month, day);
        const dateStr = deps.toDateOnlyString(d);
        return deps.computeDayDurationAllBranches(dateStr) / 3600000;
      });

      chartState.monthChart = createOrUpdateChart(
        chartState.monthChart,
        () => createLineChart(ctx, {
          labels: days,
          datasets: [{
            data,
            borderColor: jobColor,
            backgroundColor: deps.hexToRgba(jobColor, 0.14),
            tension: 0.35,
            fill: true
          }]
        }, {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: createChartXAxis(),
            y: createDurationYAxis({
              gridColor: "rgba(255,255,255,0.05)",
              drawBorder: undefined,
              tickLength: undefined
            })
          }
        }),
        (instance) => {
          instance.data.labels = days;
          instance.data.datasets[0].data = data;
          instance.data.datasets[0].borderColor = jobColor;
          instance.data.datasets[0].backgroundColor = deps.hexToRgba(jobColor, 0.14);
        }
      );
    }

    function destroyCharts() {
      if (chartState.branchHideTimeout) {
        clearTimeout(chartState.branchHideTimeout);
        chartState.branchHideTimeout = null;
      }

      [chartState.weekChart, chartState.monthChart, chartState.globalChart, chartState.branchChart].forEach((instance) => {
        if (instance) {
          instance.destroy();
        }
      });

      chartState.weekChart = null;
      chartState.monthChart = null;
      chartState.globalChart = null;
      chartState.branchChart = null;
    }

    function filterByDay(dateStr) {
      if (!dateStr) return;
      deps.state.selectedDay = dateStr;
      deps.saveState();
      deps.queueRender({
        includeLogs: true,
        includeStats: true,
        includeInsights: true,
        includeWeekBar: true
      });
    }

    function renderChart() {
      const canvas = document.getElementById("weekChart");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const jobColor = deps.getJobColor(deps.getSelectedJob());
      const durations = deps.LogService.getWeekDurations();

      const rawHours = durations.map((d) => +(d / 3600000).toFixed(2));
      const totalHours = rawHours.reduce((sum, value) => sum + value, 0);
      const visualMax = Math.max(...rawHours, 8);
      const minVisual = 0.4;
      const displayHours = rawHours.map((h) => (h === 0 ? minVisual : h));
      const smoothedTrend = rawHours.map((value, index, arr) => {
        const prev = arr[index - 1] ?? value;
        const next = arr[index + 1] ?? value;
        return +((prev + value + next) / 3).toFixed(2);
      });
      const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
      const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
      const bestValue = Math.max(...rawHours);
      const bestIndex = rawHours.indexOf(bestValue);
      const avg = totalHours / 7;

      setChartEmptyState("weekChart", totalHours === 0);
      setChartInsightLayer(
        "weekChart",
        totalHours === 0
          ? ""
          : `Stärkster Tag: ${dayNames[bestIndex]} (${deps.formatDurationHM(bestValue * 3600000)}) | Ø Woche: ${deps.formatDurationHM(avg * 3600000)}`,
        totalHours === 0
      );

      const data = {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Stunden",
            data: displayHours,
            backgroundColor: rawHours.map((v) => {
              if (v >= 10) return "rgba(239,68,68,0.7)";
              if (v >= 6) return deps.hexToRgba(jobColor, 0.72);
              if (v > 0) return deps.hexToRgba(jobColor, 0.48);
              return "rgba(100,116,139,0.2)";
            }),
            borderColor: deps.hexToRgba(jobColor, 0.95),
            borderWidth: 1,
            borderRadius: 10,
            hoverBackgroundColor: deps.hexToRgba(jobColor, 0.82)
          },
          {
            type: "line",
            label: "Trend",
            data: smoothedTrend,
            borderColor: jobColor,
            backgroundColor: deps.hexToRgba(jobColor, 0.2),
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 5,
            pointBackgroundColor: jobColor
          },
          {
            type: "line",
            label: "Goal",
            data: Array(7).fill(8),
            borderColor: "rgba(250,204,21,0.8)",
            borderDash: [6, 6],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0
          }
        ]
      };

      chartState.weekChart = createOrUpdateChart(
        chartState.weekChart,
        () => createChart(ctx, "bar", data, {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          onClick: (evt, elements) => {
            if (!elements.length) return;
            const index = elements[0].index;
            const weekStart = new Date(deps.state.selectedWeekStart);
            const clicked = new Date(weekStart);
            clicked.setDate(weekStart.getDate() + index);
            filterByDay(deps.toDateOnlyString(clicked));
          },
          plugins: {
            legend: { display: false },
            tooltip: createChartTooltip({
              backgroundColor: "rgba(15,23,42,0.95)",
              bodyColor: "#e2e8f0",
              borderColor: deps.hexToRgba(jobColor, 0.45),
              titleFormatter: function(context) {
                return "📅 " + context[0].label;
              },
              labelFormatter: function(context) {
                if (context.datasetIndex === 2) return "🎯 Tagesziel: 8h";
                const value = rawHours[context.dataIndex] || 0;
                if (value === 0) return "Kein Eintrag";
                return "⏱ " + deps.formatDurationHM(value * 3600000);
              }
            })
          },
          scales: {
            x: createChartXAxis(),
            y: createDurationYAxis({
              min: 0,
              suggestedMax: Math.max(12, Math.ceil(visualMax))
            })
          }
        }),
        (instance) => {
          instance.data.labels = labels;
          instance.data.datasets[0].data = displayHours;
          instance.data.datasets[0].backgroundColor = rawHours.map((v) => {
            if (v >= 10) return "rgba(239,68,68,0.7)";
            if (v >= 6) return deps.hexToRgba(jobColor, 0.72);
            if (v > 0) return deps.hexToRgba(jobColor, 0.48);
            return "rgba(100,116,139,0.2)";
          });
          instance.data.datasets[0].borderColor = deps.hexToRgba(jobColor, 0.95);
          instance.data.datasets[0].hoverBackgroundColor = deps.hexToRgba(jobColor, 0.82);
          instance.data.datasets[1].data = smoothedTrend;
          instance.data.datasets[1].borderColor = jobColor;
          instance.data.datasets[1].backgroundColor = deps.hexToRgba(jobColor, 0.2);
          instance.data.datasets[1].pointBackgroundColor = jobColor;
        }
      );
    }

    function renderGlobalChart() {
      const canvas = document.getElementById("globalChart");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const jobColor = deps.getJobColor(deps.getSelectedJob());
      const monday = new Date(deps.state.selectedWeekStart);

      const durations = deps.LogService.getWeekAcrossBranches(monday);
      const hours = durations.map((d) => +(d / 3600000).toFixed(2));
      const totalHours = hours.reduce((sum, value) => sum + value, 0);
      const smoothed = hours.map((value, index, arr) => {
        const prev = arr[index - 1] ?? value;
        const next = arr[index + 1] ?? value;
        return +((prev + value + next) / 3).toFixed(2);
      });
      setChartEmptyState("globalChart", totalHours === 0);

      const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
      const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
      const bestValue = Math.max(...hours);
      const bestIndex = hours.indexOf(bestValue);
      const avg = totalHours / 7;
      setChartInsightLayer(
        "globalChart",
        totalHours === 0
          ? ""
          : `Stärkster Tag: ${dayNames[bestIndex]} (${deps.formatDurationHM(bestValue * 3600000)}) | Ø Woche: ${deps.formatDurationHM(avg * 3600000)}`,
        totalHours === 0
      );

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight);
      gradient.addColorStop(0, deps.hexToRgba(jobColor, 0.98));
      gradient.addColorStop(0.45, deps.hexToRgba(jobColor, 0.62));
      gradient.addColorStop(1, deps.hexToRgba(jobColor, 0.16));

      const data = {
        labels,
        datasets: [{
          label: "Gesamtstunden",
          data: smoothed,
          backgroundColor: gradient,
          borderColor: jobColor,
          tension: 0.35,
          fill: true,
          pointRadius: hours.map((v) => (v > 0 ? 4 : 2)),
          pointHoverRadius: 5
        }]
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: "easeOutCubic"
        },
        transitions: {
          active: {
            animation: { duration: 400 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: createChartTooltip({
            backgroundColor: "rgba(15,23,42,0.94)",
            bodyColor: "#dbeafe",
            borderColor: deps.hexToRgba(jobColor, 0.7),
            cornerRadius: 14,
            titleFormatter: function(context) {
              return "📅 " + context[0].label;
            },
            labelFormatter: function(context) {
              const value = hours[context.dataIndex] || 0;
              if (value === 0) return "Kein Eintrag";
              return "⏱ " + deps.formatDurationHM(value * 3600000);
            }
          })
        },
        scales: {
          x: createChartXAxis("#cbd5f5", { size: 13, weight: "500" }),
          y: createDurationYAxis({
            tickColor: "#9ca3af",
            font: { size: 11 },
            gridColor: "rgba(255,255,255,0.08)"
          })
        }
      };

      chartState.globalChart = createOrUpdateChart(
        chartState.globalChart,
        () => createLineChart(ctx, data, options),
        (instance) => {
          instance.data.labels = labels;
          instance.data.datasets[0].data = smoothed;
          instance.data.datasets[0].backgroundColor = gradient;
          instance.data.datasets[0].borderColor = jobColor;
          instance.data.datasets[0].pointRadius = hours.map((v) => (v > 0 ? 4 : 2));
        }
      );
    }

    function renderBranchPieChart() {
      const raw = deps.getBranchDistribution(deps.state.selectedMonth);
      const data = raw.filter((d) => d.total > 0);
      const ctx = document.getElementById("branch-pie");
      if (!ctx) return;

      if (!data.length) {
        resetBranchChart();
        return;
      }

      const labels = data.map((d) => d.name);
      const values = data.map((d) => d.total / 3600000);

      if (!values.length) {
        resetBranchChart();
        return;
      }

      if (chartState.branchChart) {
        chartState.branchChart.data.labels = labels;
        chartState.branchChart.data.datasets[0].data = values;
        chartState.branchChart.update();
        return;
      }

      chartState.branchChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              "#22c55e",
              "#3b82f6",
              "#a855f7",
              "#f97316",
              "#ef4444"
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 400
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#cbd5e1" }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const ms = (context.raw || 0) * 3600000;
                  return deps.formatDurationHM(ms);
                }
              }
            }
          },
          cutout: "60%"
        }
      });
    }

    function renderMainBranchBadge() {
      const badge = document.getElementById("main-branch-badge");
      if (!badge) return;

      const top = deps.getTopBranch(deps.state.selectedMonth);
      if (!top || !top.name || top.percent === 0) {
        badge.innerHTML = "";
        return;
      }

      badge.innerHTML = `
          🏆 Hauptfiliale: <strong>${top.name}</strong> (${top.percent}%)
        `;
    }

    function renderBranchSection() {
      const section = document.getElementById("branch-section");
      const empty = document.getElementById("branch-empty");
      const canvas = document.getElementById("branch-pie");
      const badge = document.getElementById("main-branch-badge");

      if (!section || !empty || !canvas || !badge) return;

      const hasData = deps.hasMonthData(deps.state.selectedMonth);

      if (!hasData) {
        if (chartState.branchHideTimeout) {
          clearTimeout(chartState.branchHideTimeout);
          chartState.branchHideTimeout = null;
        }

        canvas.style.display = "none";
        badge.style.display = "none";
        empty.style.display = "block";
        resetBranchChart();
        return;
      }

      if (chartState.branchHideTimeout) {
        clearTimeout(chartState.branchHideTimeout);
        chartState.branchHideTimeout = null;
      }

      section.style.display = "";
      canvas.style.display = "block";
      badge.style.display = "inline-block";
      empty.style.display = "none";

      renderBranchPieChart();
      renderMainBranchBadge();
    }

    function renderInsight() {
      const insightBox = document.getElementById("insight-box");
      if (!insightBox) return;

      const smartInsights = deps.generateSmartInsights(deps.getActiveWeekDurations());
      const summaryText = smartInsights[0]?.text || deps.getWeekInsight(deps.getActiveWeekTotal());
      const isDuplicate = smartInsights.some((item) => item.text === summaryText);

      if (isDuplicate) {
        insightBox.textContent = "";
        insightBox.style.display = "none";
        return;
      }

      insightBox.style.display = "";
      insightBox.textContent = summaryText;
    }

    function renderInsights() {
      const container = document.getElementById("ai-insights");
      if (!container) return;

      const durations = deps.getActiveWeekDurations();
      const insights = deps.generateSmartInsights(durations);
      const hash = JSON.stringify(insights);

      if (hash === chartState.lastInsightsHash) return;
      chartState.lastInsightsHash = hash;

      container.innerHTML = "";

      const mainIndex = insights.findIndex((item) => item.type === "warning");

      insights.forEach((ins, index) => {
        const el = document.createElement("div");
        const isPrimary = index === mainIndex || (mainIndex === -1 && index === 0);
        el.className = isPrimary
          ? "insight-item insight insight-primary insight-main"
          : "insight-item insight insight-secondary";
        el.innerHTML = `
            <span class="insight-icon">${ins.icon}</span>
            <span class="insight-text">${ins.text}</span>
          `;
        container.appendChild(el);
      });
    }

    function resizeCharts() {
      [chartState.weekChart, chartState.monthChart, chartState.globalChart].forEach((instance) => {
        if (instance) {
          instance.resize();
        }
      });
    }

    return {
      renderChart,
      renderMonthChart,
      renderGlobalChart,
      renderBranchPieChart,
      renderMainBranchBadge,
      renderBranchSection,
      renderInsight,
      renderInsights,
      filterByDay,
      destroyCharts,
      resizeCharts,
      resetBranchChart
    };
  }

  global.WorkTrackerCharts = {
    createChart,
    createLineChart,
    createOrUpdateChart,
    createChartXAxis,
    createDurationYAxis,
    createChartTooltip,
    setChartEmptyState,
    setChartInsightLayer,
    createChartsController
  };
})(window);
