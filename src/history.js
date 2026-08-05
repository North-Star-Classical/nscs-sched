/* Session-only undo/redo stack for schedule state (max 10 steps). */

function nscsCloneJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createHistoryStack(maxSteps) {
  return {
    max: maxSteps || 10,
    past: [],
    future: [],
    push: function (snap, label, actionTab) {
      this.past.push({ snap: nscsCloneJson(snap), label: label || "Edit", tab: actionTab || "schedule" });
      if (this.past.length > this.max) this.past.shift();
      this.future = [];
    },
    undo: function (currentSnap) {
      if (!this.past.length) return null;
      var entry = this.past.pop();
      this.future.push({ snap: nscsCloneJson(currentSnap), label: entry.label, tab: entry.tab });
      return entry;
    },
    redo: function (currentSnap) {
      if (!this.future.length) return null;
      var entry = this.future.pop();
      this.past.push({ snap: nscsCloneJson(currentSnap), label: entry.label, tab: entry.tab });
      return entry;
    },
    clear: function () {
      this.past = [];
      this.future = [];
    },
    canUndo: function () {
      return this.past.length > 0;
    },
    canRedo: function () {
      return this.future.length > 0;
    },
  };
}
