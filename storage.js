(function(global) {
  function createStorageService(storage) {
    const target = storage || global.localStorage;

    return {
      getLocal(key, fallbackValue) {
        try {
          const value = target.getItem(key);
          return value == null ? fallbackValue ?? null : value;
        } catch (error) {
          console.error("localStorage get failed", key, error);
          return fallbackValue ?? null;
        }
      },
      setLocal(key, value) {
        try {
          target.setItem(key, value);
          return true;
        } catch (error) {
          console.error("localStorage set failed", key, error);
          return false;
        }
      },
      removeLocal(key) {
        try {
          target.removeItem(key);
          return true;
        } catch (error) {
          console.error("localStorage remove failed", key, error);
          return false;
        }
      }
    };
  }

  function createImportExportController(deps) {
    function buildExportData() {
      return {
        schemaVersion: deps.IMPORT_SCHEMA_VERSION,
        jobs: deps.state.jobs,
        selectedJobId: deps.state.selectedJobId,
        selectedBranchId: deps.state.selectedBranchId,
        viewMode: deps.state.viewMode,
        selectedDay: deps.state.selectedDay,
        selectedWeekStart: deps.state.selectedWeekStart,
        selectedMonth: deps.state.selectedMonth,
        weekGoal: deps.state.weekGoal,
        hourlyRate: deps.state.hourlyRate,
        autoStopHours: deps.state.autoStopHours,
        goalReached: deps.state.goalReached,
        celebrated: deps.state.celebrated
      };
    }

    function buildBackupFileName(extension) {
      const nowDate = new Date();
      const stamp = [
        nowDate.getFullYear(),
        String(nowDate.getMonth() + 1).padStart(2, "0"),
        String(nowDate.getDate()).padStart(2, "0"),
        "-",
        String(nowDate.getHours()).padStart(2, "0"),
        String(nowDate.getMinutes()).padStart(2, "0")
      ].join("");
      return `arbeitszeit-backup-${stamp}.${extension}`;
    }

    function downloadBlob(content, type, filename) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      document.body.appendChild(link);
      link.href = url;
      link.download = filename;
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    function exportCSV() {
      const escapeCSV = (value) => {
        const normalized = String(value ?? "").replace(/\r?\n/g, " ");
        return '"' + normalized.replace(/"/g, '""') + '"';
      };

      const rows = ["Date,Branch,Start,End,Duration(h),Note,Attachments"];

      deps.getBranches().forEach((branch) => {
        branch.logs.forEach((log) => {
          const start = new Date(log.start);
          const end = log.end ? new Date(log.end) : null;
          const durationHours = (deps.computeLogDuration(log, true) / 3600000).toFixed(2);

          rows.push([
            log.date || "",
            escapeCSV(branch.name),
            deps.formatTime(start),
            deps.formatTime(end),
            durationHours,
            escapeCSV(log.note || ""),
            escapeCSV(Array.isArray(log.attachments) ? log.attachments.map((attachment) => attachment.name).join(" | ") : "")
          ].join(","));
        });
      });

      downloadBlob(rows.join("\n"), "text/csv;charset=utf-8;", buildBackupFileName("csv"));
    }

    function exportJSON() {
      const data = buildExportData();
      const json = JSON.stringify(data, null, 2);
      const area = document.getElementById("json-area");
      area.value = json;
      area.select();
      deps.updateJsonImportAssist();
      deps.showToast("success", "Export", "JSON wurde in das Textfeld geschrieben.");
    }

    function downloadJSONBackup() {
      const data = buildExportData();
      downloadBlob(
        JSON.stringify(data, null, 2),
        "application/json;charset=utf-8",
        buildBackupFileName("json")
      );
      deps.showToast("success", "Backup", "JSON-Backup wurde als Datei heruntergeladen.");
    }

    function importJSON() {
      const area = document.getElementById("json-area");
      const text = area.value.trim();
      if (!text) {
        deps.setJsonImportFeedback("error", "Bitte JSON in das Textfeld einfuegen.");
        deps.showToast("error", "Import", "Bitte JSON in das Textfeld einfügen.");
        return;
      }

      const stateBackup = deps.buildPersistedStateSnapshot();

      try {
        const parsed = JSON.parse(text);
        const migrated = deps.migrateImportedState(parsed);
        const importedData = deps.validateImportedState(migrated);

        deps.resetBranchChart();
        Object.assign(deps.state, importedData);
        deps.storage.setLocal("app-data", JSON.stringify(deps.state));

        deps.state.activeBranch = "all";
        deps.state.viewMode = "all";
        deps.state.selectedBranchId = null;
        deps.state.selectedDay = null;

        deps.renderAll();
        deps.saveState();
        deps.updateJsonImportAssist();
        deps.showToast("success", "Import", "JSON erfolgreich importiert.");
      } catch (error) {
        try {
          deps.applyPersistedState(stateBackup);
        } catch (_) {}
        deps.setJsonImportFeedback("error", `Importfehler: ${error.message}`);
        deps.showToast("error", "Import", "JSON ungültig: " + error.message + " – Daten wurden wiederhergestellt.");
      }
    }

    return {
      buildExportData,
      buildBackupFileName,
      exportCSV,
      exportJSON,
      downloadJSONBackup,
      importJSON
    };
  }

  global.WorkTrackerStorage = {
    createStorageService,
    createImportExportController
  };
})(window);
