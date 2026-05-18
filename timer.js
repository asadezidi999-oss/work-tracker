(function(global) {
  function createTimerLoop(deps) {
    return function startTimerLoop() {
      if (deps.state.mainLoopInterval) {
        clearInterval(deps.state.mainLoopInterval);
      }

      deps.state.mainLoopTick = 0;

      deps.state.mainLoopInterval = setInterval(() => {
        try {
          deps.state.mainLoopTick += 1;

          const branch = deps.BranchService.selected();
          const log = deps.LogService.current(branch);

          if (!log) {
            deps.UIService.updateLiveTimer(0);
          } else {
            deps.guardAutoStop(log);

            if (log.end) {
              deps.UIService.updateLiveTimer(0);
            } else {
              deps.UIService.updateLiveTimer(deps.LogService.getElapsedMs(log));
            }
          }

          if (deps.state.mainLoopTick % 10 === 0) {
            deps.UIService.queueStatsRefresh();
          }

          if (deps.state.mainLoopTick % 60 === 0) {
            deps.checkForgotEnd();
            deps.checkLongSessionNotifications();
          }
        } catch (error) {
          console.error("main timer loop failed", error);
        }
      }, 1000);
    };
  }

  function createMidnightScheduler(deps) {
    function scheduleMidnightUpdate() {
      const nowDate = new Date();
      const nextMidnight = new Date(
        nowDate.getFullYear(),
        nowDate.getMonth(),
        nowDate.getDate() + 1,
        0, 0, 1
      );
      const msUntilMidnight = nextMidnight - nowDate;

      window.setTimeout(() => {
        try {
          deps.forceToday();
          deps.saveState();
          deps.updateUI();
          deps.showToast("info", "Neuer Tag 🌙", "Automatisch auf heute gewechselt");
        } catch (error) {
          console.error("midnight update failed", error);
        }

        scheduleMidnightUpdate();
      }, msUntilMidnight);
    }

    return scheduleMidnightUpdate;
  }

  global.WorkTrackerTimer = {
    createTimerLoop,
    createMidnightScheduler
  };
})(window);
