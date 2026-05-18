(function(global) {
  function createBranchService(deps) {
    return {
      list() {
        return deps.getBranches();
      },
      findById(branchId) {
        return this.list().find((branch) => branch.id === branchId) || null;
      },
      findByName(name) {
        const normalized = (name || "").trim().toLowerCase();
        if (!normalized) return null;
        return this.list().find((branch) => branch.name.toLowerCase() === normalized) || null;
      },
      selected() {
        return deps.getSelectedBranch();
      },
      setSelected(branchId) {
        deps.state.selectedBranchId = branchId || null;
      },
      create(name) {
        const branch = {
          id: deps.uuid(),
          name,
          logs: []
        };
        this.list().push(branch);
        return branch;
      },
      ensureSelected() {
        deps.ensureBranchSelected();
      }
    };
  }

  function createLogService(deps) {
    return {
      current(branch) {
        return deps.getCurrentLog(branch || deps.getSelectedBranch());
      },
      getElapsedMs(log, currentTime) {
        if (!log || log.end) return 0;

        const now = typeof currentTime === "number" ? currentTime : Date.now();
        let elapsed = now - log.start;
        if (!Array.isArray(log.pauses)) {
          return Math.max(0, elapsed);
        }

        log.pauses.forEach((pause) => {
          if (!pause.start) return;
          const pauseEnd = pause.end || now;
          elapsed -= Math.max(0, pauseEnd - pause.start);
        });

        return Math.max(0, elapsed);
      },
      getWeekDurations() {
        return deps.getActiveWeekDurations();
      },
      getWeekAcrossBranches(mondayDate) {
        return deps.computeWeekAllBranches(mondayDate);
      },
      append(branch, log) {
        if (!branch) return;
        branch.logs.push(log);
      },
      removeById(branch, logId) {
        if (!branch) return;
        branch.logs = branch.logs.filter((log) => log.id !== logId);
      },
      removeByDate(branch, dateStr) {
        if (!branch) return;
        branch.logs = branch.logs.filter((log) => log.date !== dateStr);
      },
      clearBranch(branch) {
        if (!branch) return;
        branch.logs = [];
      }
    };
  }

  global.WorkTrackerBranches = {
    createBranchService,
    createLogService
  };
})(window);
