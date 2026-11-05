/*
 * Nightingale local workflow simulation.
 * All people, records, intervals and escalation rules are fictional demo fixtures.
 * This module neither assesses clinical risk nor sends notifications or bookings.
 */
(function (root, factory) {
  'use strict';
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.CareModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function event(day, type, actor) {
    return { day, type, actor };
  }

  function createCase(id, name, stage, stageDay, appointmentDay, events) {
    return {
      id, name, stage, stageDay, appointmentDay,
      escalated: false,
      helpRequested: false,
      helpResolved: false,
      events,
      evidence: { attendance: false, review: false, nextPlan: false }
    };
  }

  function createInitialState() {
    return {
      day: 0,
      cases: [
        createCase('A01', 'Mei', 0, 0, null, [event(0, 'result_ready', 'clinic')]),
        createCase('B02', 'Sam', 1, -3, null, [
          event(-4, 'result_ready', 'clinic'),
          event(-3, 'notify', 'coordinator')
        ]),
        createCase('C03', 'Alex', 4, -4, -1, [
          event(-6, 'result_ready', 'clinic'),
          event(-6, 'notify', 'coordinator'),
          event(-5, 'acknowledge', 'patient'),
          event(-4, 'refer', 'coordinator'),
          event(-4, 'book', 'patient')
        ])
      ],
      // Authored fictional person + clinician plan. These dates and frequencies
      // are demo constants, never inferred from tests, population data or medication.
      tasks: [
        createTask('visit', 3, null),
        createTask('test', 2, null),
        createTask('glucose', 1, 1),
        createTask('medication', 1, 1),
        createTask('meal', 1, 1)
      ]
    };
  }

  function createTask(id, dueDay, repeatEvery) {
    return {
      id, caseId: 'A01', dueDay, repeatEvery,
      complete: false,
      lastRemindedDay: null,
      events: []
    };
  }

  function getCase(state, id) {
    const selected = state.cases.find(function (item) { return item.id === id; });
    if (!selected) throw new Error('Unknown fictional case: ' + id);
    return selected;
  }

  function copyState(state) {
    return {
      day: state.day,
      cases: state.cases.map(function (item) {
        return Object.assign({}, item, {
          evidence: Object.assign({}, item.evidence),
          events: item.events.map(function (entry) { return Object.assign({}, entry); })
        });
      }),
      tasks: state.tasks.map(function (task) {
        return Object.assign({}, task, {
          events: task.events.map(function (entry) { return Object.assign({}, entry); })
        });
      })
    };
  }

  function requireCondition(condition, message) {
    if (!condition) throw new Error(message);
  }

  function requireStage(item, stage, action) {
    requireCondition(item.stage === stage,
      'Cannot ' + action + ': expected workflow stage ' + stage + ', found ' + item.stage + '.');
  }

  function moveTo(item, stage, day) {
    item.stage = stage;
    item.stageDay = day;
  }

  function transition(state, id, action) {
    // Mutate only an independent copy; rejected actions leave the caller's state intact.
    const next = copyState(state);
    const item = getCase(next, id);
    const day = next.day;
    let actor;

    switch (action) {
      case 'notify':
        requireStage(item, 0, action);
        moveTo(item, 1, day);
        actor = 'coordinator';
        break;
      case 'acknowledge':
        requireStage(item, 1, action);
        moveTo(item, 2, day);
        actor = 'patient';
        break;
      case 'refer':
        requireStage(item, 2, action);
        moveTo(item, 3, day);
        actor = 'coordinator';
        break;
      case 'book':
        requireStage(item, 3, action);
        item.appointmentDay = day + 2;
        moveTo(item, 4, day);
        actor = 'patient';
        break;
      case 'attend':
        requireStage(item, 4, action);
        requireCondition(Number.isInteger(item.appointmentDay) && day >= item.appointmentDay,
          'Attendance evidence is unavailable before the simulated appointment day.');
        item.evidence.attendance = true;
        moveTo(item, 5, day);
        actor = 'clinic';
        break;
      case 'review':
        requireStage(item, 5, action);
        requireCondition(!item.evidence.review, 'The simulated clinical review is already recorded.');
        item.evidence.review = true;
        actor = 'clinic';
        break;
      case 'plan':
        requireStage(item, 5, action);
        requireCondition(!item.evidence.nextPlan, 'The next follow-up plan is already recorded.');
        item.evidence.nextPlan = true;
        actor = 'clinic';
        break;
      case 'close':
        requireStage(item, 5, action);
        requireCondition(item.evidence.attendance && item.evidence.review && item.evidence.nextPlan,
          'Episode closure needs attendance, clinical review and a next follow-up plan.');
        requireCondition(!item.helpRequested || item.helpResolved,
          'Resolve the pending help request before closing this episode.');
        moveTo(item, 6, day);
        actor = 'coordinator';
        break;
      case 'escalate':
        requireCondition(item.stage < 6, 'A closed episode cannot be escalated.');
        requireCondition(!item.escalated, 'This episode has already been escalated.');
        item.escalated = true;
        actor = 'coordinator';
        break;
      case 'ask_help':
        requireCondition(item.stage < 6,
          'This episode is closed. New support episodes are outside this demo.');
        requireCondition(!item.helpRequested || item.helpResolved,
          'A help request is already awaiting human review.');
        item.helpRequested = true;
        item.helpResolved = false;
        actor = 'patient';
        break;
      case 'resolve_help':
        requireCondition(item.helpRequested && !item.helpResolved,
          'There is no pending help request to resolve.');
        item.helpResolved = true;
        actor = 'coordinator';
        break;
      case 'reschedule':
        requireStage(item, 4, action);
        requireCondition(Number.isInteger(item.appointmentDay) && item.appointmentDay < day,
          'Only a missed simulated appointment can be rescheduled.');
        item.appointmentDay = day + 2;
        item.stageDay = day;
        actor = 'coordinator';
        break;
      case 'remind':
        requireStage(item, 1, action);
        requireCondition(!item.events.some(function (entry) {
          return entry.type === 'remind' && entry.day === day;
        }), 'Only one simulated reminder is allowed per day.');
        // A reminder is not acknowledgement and must not hide an overdue hand-off.
        actor = 'coordinator';
        break;
      default:
        throw new Error('Unknown simulation action: ' + String(action));
    }

    item.events.push(event(day, action, actor));
    return next;
  }

  function advanceDay(state) {
    const next = copyState(state);
    next.day += 1;
    return runDueTasks(next);
  }

  function getTasks(state, id) {
    // Validate the case identifier even if it has no authored demo tasks.
    getCase(state, id);
    return state.tasks.filter(function (task) { return task.caseId === id; });
  }

  function getTaskStatus(state, task) {
    if (task.complete) return 'done';
    if (task.dueDay < state.day) return 'overdue';
    if (task.dueDay === state.day) return 'due';
    return 'upcoming';
  }

  function runDueTasks(state) {
    // Day-level simulation only: displayed plan times do not drive a real clock.
    const next = copyState(state);
    next.tasks.forEach(function (task) {
      if (!task.complete && task.dueDay <= next.day && task.lastRemindedDay !== next.day) {
        task.events.push({ day: next.day, type: 'reminder_simulated', dueDay: task.dueDay });
        task.lastRemindedDay = next.day;
      }
    });
    return next;
  }

  function completeTask(state, caseId, taskId) {
    const next = copyState(state);
    const task = getTasks(next, caseId).find(function (item) { return item.id === taskId; });
    requireCondition(Boolean(task), 'Unknown fictional plan task: ' + taskId + ' for ' + caseId + '.');
    requireCondition(!task.complete, 'This fictional plan task is already complete.');
    requireCondition(next.day >= task.dueDay, 'Cannot self-report completion before the fictional due day.');
    task.events.push({ day: next.day, type: 'completed_self_report', dueDay: task.dueDay });
    if (task.repeatEvery !== null) {
      // Fictional recurrence starts from the self-report day. It is not a clinical
      // recommendation or evidence that medication was taken or care completed.
      task.dueDay = next.day + task.repeatEvery;
      task.lastRemindedDay = null;
    } else {
      task.complete = true;
    }
    // Self-report changes only this task. Clinic evidence and episode status stay intact.
    return next;
  }

  function getStatus(state, item) {
    if (item.stage === 6) return 'closed';
    if (item.stage === 4) return item.appointmentDay < state.day ? 'overdue' : 'open';
    const fictionalInterval = item.stage === 1 ? 2 : 3;
    return state.day - item.stageDay >= fictionalInterval ? 'overdue' : 'open';
  }

  function getMetrics(state) {
    const total = state.cases.length;
    const closed = state.cases.filter(function (item) { return item.stage === 6; }).length;
    const overdue = state.cases.filter(function (item) {
      return getStatus(state, item) === 'overdue';
    }).length;
    const needsHelp = state.cases.filter(function (item) {
      return item.helpRequested && !item.helpResolved;
    }).length;
    return { total, closed, overdue, waiting: total - closed, needsHelp };
  }

  return Object.freeze({
    createInitialState, getCase, transition, advanceDay, getStatus, getMetrics,
    getTasks, getTaskStatus, runDueTasks, completeTask
  });
});
