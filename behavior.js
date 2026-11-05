/*
 * Pure presentation cues for the fictional care diary.
 * Effects reflect recorded events, never clinical progress or verified adherence.
 * This module does not animate, play audio, schedule work or mutate state.
 */
(function (root, factory) {
  'use strict';
  const behavior = factory();
  if (typeof module === 'object' && module.exports) module.exports = behavior;
  else root.CareBehavior = behavior;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PRIORITY = ['medication', 'meal', 'glucose', 'test', 'visit'];
  const DAILY = ['medication', 'meal', 'glucose'];

  function ownTasks(state, caseId) {
    if (!state || !Array.isArray(state.tasks)) return [];
    return state.tasks.filter(function (task) {
      return task.caseId === caseId && PRIORITY.includes(task.id) && Array.isArray(task.events);
    });
  }

  function completedOn(task, day) {
    return task.events.some(function (entry) {
      return entry.type === 'completed_self_report' && entry.day === day;
    });
  }

  function dailyCount(tasks, day) {
    return DAILY.filter(function (id) {
      return tasks.some(function (task) { return task.id === id && completedOn(task, day); });
    }).length;
  }

  function completionCount(tasks, day) {
    // A task can have only one valid completion per demo day. Do not let duplicate
    // history rows manufacture extra growth/performance milestones.
    const completed = new Set();
    tasks.forEach(function (task) {
      task.events.forEach(function (entry) {
        if (entry.type === 'completed_self_report' && Number.isInteger(entry.day) && entry.day <= day) {
          completed.add(task.id + ':' + entry.day);
        }
      });
    });
    return completed.size;
  }

  function sameEvent(left, right) {
    return left && right && left.day === right.day && left.type === right.type && left.dueDay === right.dueDay;
  }

  function completionSequence(before, after, taskId, caseId = 'A01') {
    if (!before || !after || !Number.isInteger(after.day) || before.day !== after.day || !PRIORITY.includes(taskId)) return [];
    const beforeTasks = ownTasks(before, caseId);
    const afterTasks = ownTasks(after, caseId);
    const prior = beforeTasks.find(function (task) { return task.id === taskId; });
    const next = afterTasks.find(function (task) { return task.id === taskId; });
    if (!prior || !next || prior.complete || prior.dueDay > after.day || completedOn(prior, after.day)) return [];

    // A completion transition appends exactly one new event while retaining its
    // history. Re-rendered states, copied rows and stale-day records earn no cue.
    if (next.events.length !== prior.events.length + 1 || !prior.events.every(function (entry, index) {
      return sameEvent(entry, next.events[index]);
    })) return [];
    const added = next.events[next.events.length - 1];
    if (added.type !== 'completed_self_report' || added.day !== after.day || added.dueDay !== prior.dueDay) return [];

    const sequence = [taskId === 'medication' ? 'feeding' : taskId === 'meal' ? 'smiling' : 'celebrating'];
    if (DAILY.includes(taskId) && dailyCount(beforeTasks, after.day) < 3 && dailyCount(afterTasks, after.day) === 3) {
      sequence.push('flapping');
    }
    const total = completionCount(afterTasks, after.day);
    if (total > 0 && total % 6 === 0) sequence.push('singing');
    else if (total > 0 && total % 3 === 0) sequence.push('dancing');
    return sequence;
  }

  function reminderCue(state, caseId = 'A01') {
    if (!state || !Number.isInteger(state.day)) return null;
    let chosen = null;
    PRIORITY.forEach(function (id) {
      const task = ownTasks(state, caseId).find(function (item) { return item.id === id; });
      if (!task || task.complete || task.dueDay > state.day) return;
      if (task.events.some(function (entry) {
        return entry.type === 'completed_self_report' && entry.dueDay === task.dueDay && entry.day <= state.day;
      })) return;
      const attempt = task.events.filter(function (entry) {
        return entry.type === 'reminder_simulated' && entry.dueDay === task.dueDay && entry.day <= state.day;
      }).length;
      // Keeping the first tie preserves the documented daily-task priority.
      if (!chosen || attempt > chosen.attempt) chosen = { taskId: id, attempt, showSideEye: attempt > 3 };
    });
    return chosen;
  }

  return Object.freeze({ completionSequence, reminderCue });
});
