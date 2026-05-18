(function(global) {
  function runAfterFrames(callback, frames) {
    const remainingFrames = Math.max(1, Number(frames) || 1);

    requestAnimationFrame(() => {
      if (remainingFrames === 1) {
        callback();
        return;
      }

      runAfterFrames(callback, remainingFrames - 1);
    });
  }

  function debounce(callback, wait) {
    const delay = typeof wait === "number" ? wait : 300;
    let timerId = null;

    return function(...args) {
      const context = this;
      clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        timerId = null;
        callback.apply(context, args);
      }, delay);
    };
  }

  function fadeIn(el) {
    if (!el) return;
    el.classList.add("fade-enter");
    runAfterFrames(() => el.classList.add("fade-enter-active"), 2);
    window.setTimeout(() => {
      el.classList.remove("fade-enter", "fade-enter-active");
    }, 300);
  }

  function createUIService(deps) {
    return {
      updateLiveTimer(ms) {
        deps.updateTimer(ms);
      },
      queueStatsRefresh() {
        deps.queueRender({
          includeStats: true,
          includeInsights: true
        });
      },
      handleLogMutation(options) {
        deps.updateTimer();
        if (typeof deps.updateAfterLogChange === "function") {
          deps.updateAfterLogChange(options || { includeWeekBar: true, includeCharts: true, includeMonth: true });
        } else {
          deps.updateUI();
        }
      },
      refreshApp() {
        deps.updateUI();
      }
    };
  }

  function createRenderScheduler(deps) {
    const renderQueueDefaults = {
      includeLogs: false,
      includeStats: false,
      includeWeekBar: false,
      includeMonth: false,
      includeCharts: false,
      includeInsights: false
    };
    let pendingRenderQueue = null;
    let renderFrameQueued = false;

    function flushRenderQueue() {
      if (!pendingRenderQueue) {
        renderFrameQueued = false;
        return;
      }

      const queue = pendingRenderQueue;
      pendingRenderQueue = null;
      renderFrameQueued = false;
      const activeTab = deps.getActiveTabName();
      const shouldRenderStatsTab = activeTab === "stats";

      if (queue.includeLogs) deps.renderLogs();
      if (queue.includeStats && shouldRenderStatsTab) deps.renderStats();
      if (queue.includeWeekBar && shouldRenderStatsTab) deps.renderWeekBar();
      if (queue.includeMonth && shouldRenderStatsTab) deps.renderMonth();

      if (queue.includeCharts && shouldRenderStatsTab) {
        deps.renderChart();
        deps.renderMonthChart();
        deps.renderGlobalChart();
      }

      if (queue.includeInsights && shouldRenderStatsTab) {
        deps.renderInsight();
        deps.renderInsights();
      }

      fadeIn(deps.getActivePage());
    }

    function queueRender(flags) {
      if (!pendingRenderQueue) {
        pendingRenderQueue = { ...renderQueueDefaults };
      }

      Object.keys(renderQueueDefaults).forEach((key) => {
        if (flags?.[key]) {
          pendingRenderQueue[key] = true;
        }
      });

      if (!renderFrameQueued) {
        renderFrameQueued = true;
        requestAnimationFrame(flushRenderQueue);
      }
    }

    return {
      queueRender,
      flushRenderQueue
    };
  }

  function createTabController(deps) {
    function activateTab(tab, direction, options) {
      const navigationDirection = direction || "left";
      const config = options || {};
      const { withHaptics = true, persist = true } = config;
      const allowedTabs = ["home", "stats", "logs", "settings"];
      const nextTab = allowedTabs.includes(tab) ? tab : "home";

      if (withHaptics) {
        navigator.vibrate?.(12);
      }

      if (persist) {
        deps.persistTab(nextTab);
      }

      const navButtons = document.querySelectorAll(".nav-btn");
      const pages = document.querySelectorAll(".tab-page");

      navButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === nextTab);
      });

      pages.forEach((page) => {
        page.classList.remove("slide-left", "slide-right");

        if (page.id === "tab-" + nextTab) {
          page.classList.add(navigationDirection === "left" ? "slide-left" : "slide-right");
          page.classList.add("active");
        } else {
          page.classList.remove("active");
        }
      });

      applyStagger("tab-" + nextTab);
      return nextTab;
    }

    function setupStaggerTargets() {
      document.querySelectorAll(".tab-page").forEach((page) => {
        const directTargets = page.querySelectorAll(":scope > .card, :scope > .layout, :scope > .home-layout, :scope > .settings-tabs, :scope > .settings-section");
        directTargets.forEach((el) => el.classList.add("stagger-item"));

        const nestedCards = page.querySelectorAll(":scope > .home-layout > .card");
        nestedCards.forEach((el) => el.classList.add("stagger-item"));
      });
    }

    function applyStagger(pageId) {
      const items = document.querySelectorAll(`#${pageId} .stagger-item`);
      items.forEach((el) => {
        el.classList.remove("visible");
      });

      items.forEach((el, i) => {
        runAfterFrames(() => el.classList.add("visible"), i + 1);
      });
    }

    function showPage(id) {
      document.querySelectorAll(".page").forEach((page) => {
        page.classList.toggle("active", page.id === id);
      });

      document.querySelectorAll(".nav-btn").forEach((btn) => {
        const pageId = btn.dataset.page || (btn.dataset.tab ? `tab-${btn.dataset.tab}` : "");
        btn.classList.toggle("active", pageId === id);
      });

      applyStagger(id);
    }

    function syncTabView(tab) {
      if (tab === "stats") {
        requestAnimationFrame(() => {
          deps.safe(deps.renderStats, "renderStats[syncTabView]");
          deps.safe(deps.renderWeekBar, "renderWeekBar[syncTabView]");
          deps.safe(deps.renderMonth, "renderMonth[syncTabView]");
          deps.safe(deps.renderChart, "renderChart[syncTabView]");
          deps.safe(deps.renderMonthChart, "renderMonthChart[syncTabView]");
          deps.safe(deps.renderGlobalChart, "renderGlobalChart[syncTabView]");
          deps.safe(deps.renderInsight, "renderInsight[syncTabView]");
          deps.safe(deps.renderInsights, "renderInsights[syncTabView]");
          deps.safe(deps.scrollToActiveDay, "scrollToActiveDay[syncTabView]");
          deps.safe(deps.resizeCharts, "resizeCharts[syncTabView]");
        });
      } else {
        deps.destroyCharts();
      }

      if (tab === "logs") {
        deps.renderLogs();
      }

      if (tab === "home") {
        deps.updateModeToggle();
        deps.updateTimer();
        deps.renderBranchToggle();
      }
    }

    return {
      activateTab,
      setupStaggerTargets,
      applyStagger,
      showPage,
      syncTabView
    };
  }

  global.WorkTrackerUI = {
    runAfterFrames,
    debounce,
    fadeIn,
    createUIService,
    createRenderScheduler,
    createTabController
  };
})(window);
