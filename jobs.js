(function(global) {
  function createUndoDeleteModule(deps) {
    let toastHideTimer = null;
    const undoState = {
      logs: []
    };

    function cloneDeletedLog(log, branchId, index) {
      const snapshot = deps.clone(log);
      snapshot.branchId = branchId;
      snapshot.restoreIndex = index;
      return snapshot;
    }

    function setLastDeletedLogs(logs) {
      undoState.logs = Array.isArray(logs) ? logs : [];
    }

    function getLastDeletedLogs() {
      return Array.isArray(undoState.logs) ? undoState.logs : [];
    }

    function ensureUndoToast() {
      let toast = document.getElementById("undo-toast");
      if (toast) return toast;

      toast = document.createElement("div");
      toast.id = "undo-toast";
      toast.className = "toast toast-info";
      toast.style.display = "none";
      toast.style.position = "fixed";
      toast.style.left = "18px";
      toast.style.bottom = "18px";
      toast.style.right = "auto";
      toast.style.zIndex = "10000";
      toast.style.alignItems = "center";
      toast.style.gap = "10px";

      const icon = document.createElement("span");
      icon.className = "toast-icon";
      icon.textContent = "↩";

      const content = document.createElement("div");
      content.className = "toast-content";
      content.textContent = "Löschung rückgängig machen?";

      const button = document.createElement("button");
      button.id = "undo-btn";
      button.className = "btn btn-ghost";
      button.type = "button";
      button.textContent = "Rückgängig";
      button.style.marginLeft = "8px";
      button.addEventListener("click", undoDeleteLogs);

      toast.appendChild(icon);
      toast.appendChild(content);
      toast.appendChild(button);
      document.body.appendChild(toast);
      return toast;
    }

    function showUndoToast() {
      const toast = ensureUndoToast();
      toast.style.display = "flex";

      if (toastHideTimer) {
        clearTimeout(toastHideTimer);
      }

      toastHideTimer = window.setTimeout(() => {
        hideUndoToast();
      }, 9000);
    }

    function hideUndoToast() {
      const toast = document.getElementById("undo-toast");
      if (toast) {
        toast.style.display = "none";
      }

      if (toastHideTimer) {
        clearTimeout(toastHideTimer);
        toastHideTimer = null;
      }
    }

    function restoreDeletedLogs(logs) {
      logs.forEach((entry) => {
        const branch = deps.state.branches.find((item) => item.id === entry.branchId);
        if (!branch) return;

        const alreadyExists = branch.logs.some((log) => log.id === entry.id);
        if (alreadyExists) return;

        const restoredLog = deps.clone(entry);
        delete restoredLog.branchId;
        const restoreIndex =
          Number.isInteger(entry.restoreIndex) &&
          entry.restoreIndex <= branch.logs.length
            ? entry.restoreIndex
            : branch.logs.length;
        delete restoredLog.restoreIndex;

        const targetIndex = Math.max(0, restoreIndex);
        branch.logs.splice(targetIndex, 0, restoredLog);
      });
    }

    function undoDeleteLogs() {
      const deletedLogs = getLastDeletedLogs();
      if (!deletedLogs.length) return;

      restoreDeletedLogs(deletedLogs);
      setLastDeletedLogs([]);
      hideUndoToast();
      deps.saveState();

      if (typeof deps.updateTimer === "function") deps.updateTimer();
      if (typeof deps.updateAfterLogChange === "function") {
        deps.updateAfterLogChange({ includeWeekBar: true, includeCharts: true, includeMonth: true });
      } else if (typeof deps.updateUI === "function") {
        deps.updateUI();
      }

      deps.showToast("success", "Undo", "Löschung rückgängig gemacht.");
    }

    function install() {
      setLastDeletedLogs([]);
      ensureUndoToast();

      const originalDeleteLog = deps.getDeleteLog();
      if (typeof originalDeleteLog === "function" && !originalDeleteLog.__undoWrapped) {
        const wrappedDeleteLog = async function(branchId, logId) {
          const branch = deps.state.branches.find((item) => item.id === branchId);
          const logIndex = branch ? branch.logs.findIndex((item) => item.id === logId) : -1;
          const log = logIndex >= 0 ? branch.logs[logIndex] : null;

          await originalDeleteLog.apply(this, arguments);

          const wasDeleted = branch && log && !branch.logs.some((item) => item.id === logId);
          if (!wasDeleted) return;

          setLastDeletedLogs([cloneDeletedLog(log, branchId, logIndex)]);
          showUndoToast();
        };
        wrappedDeleteLog.__undoWrapped = true;
        deps.setDeleteLog(wrappedDeleteLog);
      }

      const originalDeleteLogsForSelectedDayAndBranch = deps.getDeleteLogsForSelectedDayAndBranch();
      if (
        typeof originalDeleteLogsForSelectedDayAndBranch === "function" &&
        !originalDeleteLogsForSelectedDayAndBranch.__undoWrapped
      ) {
        const wrappedDeleteLogsForSelectedDayAndBranch = async function() {
          const branchId = document.getElementById("delete-branch-select")?.value;
          const dateStr = document.getElementById("delete-date-input")?.value;
          const branch = deps.state.branches.find((item) => item.id === branchId);
          const deletedLogs = branch && dateStr
            ? branch.logs
                .map((log, index) => ({ log, index }))
                .filter((entry) => entry.log.date === dateStr)
                .map((entry) => cloneDeletedLog(entry.log, branch.id, entry.index))
            : [];

          await originalDeleteLogsForSelectedDayAndBranch.apply(this, arguments);

          const wasDeleted = branch && deletedLogs.length && deletedLogs.every((entry) => {
            return !branch.logs.some((log) => log.id === entry.id);
          });

          if (!wasDeleted) return;

          setLastDeletedLogs(deletedLogs);
          showUndoToast();
        };
        wrappedDeleteLogsForSelectedDayAndBranch.__undoWrapped = true;
        deps.setDeleteLogsForSelectedDayAndBranch(wrappedDeleteLogsForSelectedDayAndBranch);
      }

      const originalDeleteAllLogsForSelectedBranch = deps.getDeleteAllLogsForSelectedBranch();
      if (
        typeof originalDeleteAllLogsForSelectedBranch === "function" &&
        !originalDeleteAllLogsForSelectedBranch.__undoWrapped
      ) {
        const wrappedDeleteAllLogsForSelectedBranch = async function() {
          const branchId = document.getElementById("delete-branch-select")?.value;
          const branch = deps.state.branches.find((item) => item.id === branchId);
          const deletedLogs = branch
            ? branch.logs.map((log, index) => cloneDeletedLog(log, branch.id, index))
            : [];

          await originalDeleteAllLogsForSelectedBranch.apply(this, arguments);

          const wasDeleted = branch && deletedLogs.length && branch.logs.length === 0;
          if (!wasDeleted) return;

          setLastDeletedLogs(deletedLogs);
          showUndoToast();
        };
        wrappedDeleteAllLogsForSelectedBranch.__undoWrapped = true;
        deps.setDeleteAllLogsForSelectedBranch(wrappedDeleteAllLogsForSelectedBranch);
      }
    }

    return {
      install,
      undoDeleteLogs
    };
  }

  function createJobsController(deps) {
    let jobActionSheetTarget = null;
    let jobSortableInstance = null;

    function showJobActionSheet(jobId) {
      const sheet = document.getElementById("job-action-sheet");
      const title = document.getElementById("job-action-sheet-title");
      if (!sheet) return;
      const job = deps.state.jobs.find((item) => item.id === jobId);
      if (!job) return;
      jobActionSheetTarget = jobId;
      if (title) title.textContent = job.name;
      sheet.classList.add("open");
      navigator.vibrate?.(10);
    }

    function closeJobActionSheet() {
      const sheet = document.getElementById("job-action-sheet");
      sheet?.classList.remove("open");
      jobActionSheetTarget = null;
      const buttons = document.getElementById("job-action-buttons");
      const form = document.getElementById("job-rename-form");
      if (buttons) buttons.style.display = "block";
      if (form) form.style.display = "none";
    }

    function openJobRenameForm(jobId) {
      const job = deps.state.jobs.find((item) => item.id === jobId);
      if (!job) return;
      const sheet = document.getElementById("job-action-sheet");
      const title = document.getElementById("job-action-sheet-title");
      const buttons = document.getElementById("job-action-buttons");
      const form = document.getElementById("job-rename-form");
      const input = document.getElementById("job-rename-input");
      if (!sheet || !buttons || !form || !input) return;
      jobActionSheetTarget = jobId;
      if (title) title.textContent = job.name;
      buttons.style.display = "none";
      form.style.display = "block";
      input.value = job.name;
      sheet.classList.add("open");
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 80);
    }

    function renameJob(jobId, newName) {
      const job = deps.state.jobs.find((item) => item.id === jobId);
      if (!job) return;
      const trimmed = newName.trim();
      if (!trimmed) return;
      job.name = trimmed;
      deps.saveState();
      deps.renderJobs();
      deps.renderCurrentJobBadges();
    }

    function duplicateJob(jobId) {
      const job = deps.state.jobs.find((item) => item.id === jobId);
      if (!job) return;
      const newJob = {
        id: "job_" + Date.now(),
        name: job.name + " (Kopie)",
        color: job.color,
        branches: JSON.parse(JSON.stringify(job.branches))
      };
      const index = deps.state.jobs.findIndex((item) => item.id === jobId);
      deps.state.jobs.splice(index + 1, 0, newJob);
      deps.saveState();
      deps.renderJobs();
    }

    function deleteJob(jobId) {
      if (deps.state.jobs.length === 1) {
        alert("Mindestens ein Job muss bleiben!");
        return;
      }

      deps.state.jobs = deps.state.jobs.filter((job) => job.id !== jobId);
      if (deps.state.selectedJobId === jobId) {
        deps.state.selectedJobId = deps.state.jobs[0].id;
      }

      deps.ensureBranchSelected();
      deps.markLogIndexDirty();
      deps.saveState();
      deps.renderJobs();
      deps.updateUI();
      deps.renderLogs();
    }

    function addJob(name) {
      if (!name || !name.trim()) return;

      const nextId = "job_" + Date.now();
      const newJob = {
        id: nextId,
        name: name.trim(),
        color: deps.getPaletteColorForSeed(nextId),
        branches: []
      };

      deps.state.jobs.push(newJob);
      deps.state.selectedJobId = newJob.id;
      deps.ensureBranchSelected();
      deps.markLogIndexDirty();
      deps.saveState();
      deps.renderJobs();
      deps.updateUI();
      deps.renderLogs();
    }

    function initJobSystem() {
      const btn = document.getElementById("job-add-btn");
      const input = document.getElementById("job-input");

      if (!btn || !input) {
        console.error("Job elements not found!");
        return;
      }

      btn.addEventListener("click", () => {
        if (!input.value.trim()) return;
        addJob(input.value);
        input.value = "";
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") btn.click();
      });
    }

    function initJobSorting() {
      const container = document.getElementById("job-list");
      if (!container) return;
      if (jobSortableInstance && jobSortableInstance.el === container) return;

      if (typeof Sortable === "undefined") {
        console.warn("SortableJS is not available; drag reorder disabled.");
        return;
      }

      jobSortableInstance = new Sortable(container, {
        animation: 150,
        ghostClass: "drag-ghost",
        chosenClass: "drag-chosen",
        dragClass: "drag-dragging",
        handle: ".drag-handle",
        draggable: ".job-chip",
        onEnd: (event) => {
          if (event.oldIndex == null || event.newIndex == null || event.oldIndex === event.newIndex) return;
          const moved = deps.state.jobs.splice(event.oldIndex, 1)[0];
          if (!moved) return;
          deps.state.jobs.splice(event.newIndex, 0, moved);
          deps.haptic();
          deps.saveState();
          deps.renderJobs();
          deps.renderCurrentJobBadges();
          deps.queueRender({
            includeStats: true,
            includeMonth: true,
            includeCharts: true,
            includeInsights: true
          });
        }
      });
    }

    function initJobActionSheet() {
      const sheet = document.getElementById("job-action-sheet");
      if (!sheet) return;

      document.getElementById("job-action-cancel")?.addEventListener("click", closeJobActionSheet);
      sheet.addEventListener("click", (e) => {
        if (e.target === sheet) closeJobActionSheet();
      });

      document.getElementById("job-action-rename")?.addEventListener("click", () => {
        openJobRenameForm(jobActionSheetTarget);
      });

      function confirmRename() {
        const input = document.getElementById("job-rename-input");
        if (!input) return;
        renameJob(jobActionSheetTarget, input.value);
        closeJobActionSheet();
      }

      document.getElementById("job-rename-confirm")?.addEventListener("click", confirmRename);
      document.getElementById("job-rename-input")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmRename();
        }
        if (e.key === "Escape") closeJobActionSheet();
      });
      document.getElementById("job-rename-cancel")?.addEventListener("click", closeJobActionSheet);

      document.getElementById("job-action-duplicate")?.addEventListener("click", () => {
        closeJobActionSheet();
        duplicateJob(jobActionSheetTarget);
      });

      document.getElementById("job-action-delete")?.addEventListener("click", () => {
        closeJobActionSheet();
        deleteJob(jobActionSheetTarget);
      });
    }

    return {
      showJobActionSheet,
      closeJobActionSheet,
      openJobRenameForm,
      renameJob,
      duplicateJob,
      deleteJob,
      addJob,
      initJobSystem,
      initJobSorting,
      initJobActionSheet
    };
  }

  global.WorkTrackerJobs = {
    createUndoDeleteModule,
    createJobsController
  };
})(window);
