'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../state.js');
const {
  createInitialState, getCase, transition, advanceDay, getStatus, getMetrics,
  getTasks, getTaskStatus, runDueTasks, completeTask
} = model;

function progressToBooking(state = createInitialState()) {
  return ['notify', 'acknowledge', 'refer', 'book'].reduce(
    (next, action) => transition(next, 'A01', action), state);
}

function progressToAttendance() {
  return transition(advanceDay(advanceDay(progressToBooking())), 'A01', 'attend');
}

function readyToClose() {
  return transition(transition(progressToAttendance(), 'A01', 'review'), 'A01', 'plan');
}

test('a complete episode preserves an actor-attributed history and next-plan evidence', () => {
  const state = transition(readyToClose(), 'A01', 'close');
  const item = getCase(state, 'A01');
  assert.equal(item.stage, 6);
  assert.equal(getStatus(state, item), 'closed');
  assert.deepEqual(item.evidence, { attendance: true, review: true, nextPlan: true });
  assert.deepEqual(item.events.map(entry => entry.type), [
    'result_ready', 'notify', 'acknowledge', 'refer', 'book', 'attend', 'review', 'plan', 'close'
  ]);
  assert.equal(item.events.find(entry => entry.type === 'acknowledge').actor, 'patient');
  assert.equal(item.events.find(entry => entry.type === 'review').actor, 'clinic');
  assert.equal(item.events.at(-1).actor, 'coordinator');
  assert.equal(getMetrics(state).closed, 1);
  assert.equal(getMetrics(state).waiting, 2);
});

test('early attendance and skipped stages cannot fabricate completion', () => {
  const initial = createInitialState();
  for (const action of ['acknowledge', 'refer', 'book', 'attend', 'review', 'plan', 'close']) {
    assert.throws(() => transition(initial, 'A01', action), /expected workflow stage/);
  }
  const booked = progressToBooking();
  assert.throws(() => transition(booked, 'A01', 'attend'), /before the simulated appointment/);
  assert.equal(getCase(booked, 'A01').evidence.attendance, false);
  assert.equal(getCase(booked, 'A01').stage, 4);
});

test('closure requires every piece of evidence and duplicate records are rejected', () => {
  const attended = progressToAttendance();
  assert.throws(() => transition(attended, 'A01', 'close'), /attendance, clinical review/);
  const reviewed = transition(attended, 'A01', 'review');
  assert.throws(() => transition(reviewed, 'A01', 'close'), /next follow-up plan/);
  assert.throws(() => transition(reviewed, 'A01', 'review'), /already recorded/);
  const planned = transition(reviewed, 'A01', 'plan');
  assert.throws(() => transition(planned, 'A01', 'plan'), /already recorded/);
  const closed = transition(planned, 'A01', 'close');
  assert.throws(() => transition(closed, 'A01', 'close'), /expected workflow stage/);
  assert.throws(() => transition(closed, 'A01', 'escalate'), /closed episode/);
});

test('reminders do not reset or conceal an overdue acknowledgement', () => {
  const initial = createInitialState();
  assert.equal(getStatus(initial, getCase(initial, 'B02')), 'overdue');
  const reminded = transition(initial, 'B02', 'remind');
  assert.equal(reminded.day, initial.day);
  assert.equal(getCase(reminded, 'B02').stageDay, -3);
  assert.equal(getStatus(reminded, getCase(reminded, 'B02')), 'overdue');
  assert.throws(() => transition(reminded, 'B02', 'remind'), /one simulated reminder/);
  const nextDay = transition(advanceDay(reminded), 'B02', 'remind');
  assert.equal(getCase(nextDay, 'B02').events.filter(entry => entry.type === 'remind').length, 2);
  assert.equal(getStatus(nextDay, getCase(nextDay, 'B02')), 'overdue');
  const escalated = transition(nextDay, 'B02', 'escalate');
  assert.equal(getCase(escalated, 'B02').escalated, true);
  assert.throws(() => transition(escalated, 'B02', 'escalate'), /already been escalated/);
});

test('fictional deadline boundaries separate acknowledgement and appointment waits', () => {
  let state = transition(createInitialState(), 'A01', 'notify');
  state = advanceDay(state);
  assert.equal(getStatus(state, getCase(state, 'A01')), 'open');
  state = advanceDay(state);
  assert.equal(getStatus(state, getCase(state, 'A01')), 'overdue');
  let booked = progressToBooking();
  booked = advanceDay(advanceDay(booked));
  assert.equal(getStatus(booked, getCase(booked, 'A01')), 'open');
  booked = advanceDay(booked);
  assert.equal(getStatus(booked, getCase(booked, 'A01')), 'overdue');
  let initial = createInitialState();
  initial = advanceDay(advanceDay(initial));
  assert.equal(getStatus(initial, getCase(initial, 'A01')), 'open');
  initial = advanceDay(initial);
  assert.equal(getStatus(initial, getCase(initial, 'A01')), 'overdue');
});

test('a missed appointment can be rescheduled without recording attendance', () => {
  const initial = createInitialState();
  assert.equal(getStatus(initial, getCase(initial, 'C03')), 'overdue');
  const state = transition(initial, 'C03', 'reschedule');
  const item = getCase(state, 'C03');
  assert.equal(item.appointmentDay, 2);
  assert.equal(item.stage, 4);
  assert.equal(item.stageDay, 0);
  assert.equal(item.evidence.attendance, false);
  assert.equal(getStatus(state, item), 'open');
  assert.throws(() => transition(state, 'C03', 'reschedule'), /Only a missed/);
  assert.throws(() => transition(state, 'C03', 'attend'), /before the simulated appointment/);
});

test('pending human help blocks closure; resolving it permits closure and a new question', () => {
  let state = readyToClose();
  assert.throws(() => transition(state, 'A01', 'resolve_help'), /no pending help/);
  state = transition(state, 'A01', 'ask_help');
  assert.equal(getMetrics(state).needsHelp, 1);
  assert.throws(() => transition(state, 'A01', 'ask_help'), /already awaiting/);
  assert.throws(() => transition(state, 'A01', 'close'), /pending help request/);
  state = transition(state, 'A01', 'resolve_help');
  assert.equal(getMetrics(state).needsHelp, 0);
  assert.throws(() => transition(state, 'A01', 'resolve_help'), /no pending help/);
  const nextQuestion = transition(state, 'A01', 'ask_help');
  assert.equal(getMetrics(nextQuestion).needsHelp, 1);
  assert.equal(getCase(transition(state, 'A01', 'close'), 'A01').stage, 6);
});

test('closed episodes cannot hide a newly unresolved help request', () => {
  let state = transition(readyToClose(), 'A01', 'ask_help');
  state = transition(state, 'A01', 'resolve_help');
  state = transition(state, 'A01', 'close');
  const before = JSON.stringify(state);
  assert.throws(() => transition(state, 'A01', 'ask_help'), /episode is closed/);
  assert.equal(JSON.stringify(state), before);
  assert.equal(getMetrics(state).needsHelp, 0);
  assert.equal(getStatus(state, getCase(state, 'A01')), 'closed');
});

test('successful and rejected actions never mutate input or unrelated cases', () => {
  const initial = createInitialState();
  const before = JSON.stringify(initial);
  const changed = transition(initial, 'A01', 'notify');
  assert.equal(JSON.stringify(initial), before);
  assert.deepEqual(getCase(changed, 'B02'), getCase(initial, 'B02'));
  assert.deepEqual(getCase(changed, 'C03'), getCase(initial, 'C03'));
  getCase(changed, 'B02').events[0].type = 'changed by caller';
  getCase(changed, 'B02').evidence.review = true;
  assert.equal(JSON.stringify(initial), before);
  assert.throws(() => transition(initial, 'A01', 'close'));
  assert.throws(() => transition(initial, 'UNKNOWN', 'notify'), /Unknown fictional case/);
  assert.throws(() => transition(initial, 'A01', 'invented_action'), /Unknown simulation action/);
  assert.equal(JSON.stringify(initial), before);
  const tomorrow = advanceDay(initial);
  tomorrow.cases[0].events[0].type = 'changed by caller';
  assert.equal(JSON.stringify(initial), before);
  assert.equal(tomorrow.day, 1);
});

test('reset creates independent fixtures with exact metric denominators', () => {
  const one = createInitialState();
  one.cases[0].evidence.attendance = true;
  one.cases[0].events.push({ day: 0, type: 'test', actor: 'system' });
  const fresh = createInitialState();
  assert.equal(fresh.cases[0].evidence.attendance, false);
  assert.equal(fresh.cases[0].events.length, 1);
  assert.deepEqual(getMetrics(fresh), { total: 3, closed: 0, overdue: 2, waiting: 3, needsHelp: 0 });
});

test('plain browser script attaches CareModel without require or network dependencies', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'state.js'), 'utf8'), context);
  assert.equal(typeof context.CareModel.transition, 'function');
  assert.equal(context.CareModel.createInitialState().cases.length, 3);
  assert.equal(context.CareModel.createInitialState().day, 0);
});

test('person and clinician demo plan has explicit fixed tasks, not inferred dates', () => {
  const state = createInitialState();
  assert.deepEqual(getTasks(state, 'A01').map(({ id, dueDay, repeatEvery }) => ({ id, dueDay, repeatEvery })), [
    { id: 'visit', dueDay: 3, repeatEvery: null },
    { id: 'test', dueDay: 2, repeatEvery: null },
    { id: 'glucose', dueDay: 1, repeatEvery: 1 },
    { id: 'medication', dueDay: 1, repeatEvery: 1 },
    { id: 'meal', dueDay: 1, repeatEvery: 1 }
  ]);
  assert.deepEqual(getTasks(state, 'B02'), []);
  assert.deepEqual(getTasks(state, 'C03'), []);
  assert.throws(() => getTasks(state, 'UNKNOWN'), /Unknown fictional case/);
  assert.deepEqual(transition(state, 'A01', 'notify').tasks, state.tasks);
  assert.ok(state.tasks.every(task => getTaskStatus(state, task) === 'upcoming'));
});

test('advancing the demo clock runs due tasks once per day without real reminders', () => {
  const initial = createInitialState();
  assert.ok(runDueTasks(initial).tasks.every(task => task.events.length === 0));
  const firstDay = advanceDay(initial);
  const glucose = getTasks(firstDay, 'A01').find(task => task.id === 'glucose');
  assert.equal(getTaskStatus(firstDay, glucose), 'due');
  assert.deepEqual(glucose.events, [{ day: 1, type: 'reminder_simulated', dueDay: 1 }]);
  assert.deepEqual(runDueTasks(firstDay), firstDay);
  assert.equal(firstDay.tasks.filter(task => task.lastRemindedDay === 1).length, 3);
  assert.ok(initial.tasks.every(task => task.events.length === 0));
  const secondDay = advanceDay(firstDay);
  const lateGlucose = getTasks(secondDay, 'A01').find(task => task.id === 'glucose');
  assert.equal(getTaskStatus(secondDay, lateGlucose), 'overdue');
  assert.equal(lateGlucose.dueDay, 1);
  assert.deepEqual(lateGlucose.events.at(-1), { day: 2, type: 'reminder_simulated', dueDay: 1 });
  assert.equal(getTaskStatus(secondDay, getTasks(secondDay, 'A01').find(task => task.id === 'test')), 'due');
  assert.deepEqual(runDueTasks(secondDay), secondDay);
});

test('one-off self-reports reject early or duplicate completion and stop future reminders', () => {
  let state = createInitialState();
  assert.throws(() => completeTask(state, 'A01', 'test'), /before the fictional due day/);
  assert.throws(() => completeTask(state, 'A01', 'unknown'), /Unknown fictional plan task/);
  assert.throws(() => completeTask(state, 'B02', 'test'), /Unknown fictional plan task/);
  state = advanceDay(advanceDay(state));
  const done = completeTask(state, 'A01', 'test');
  const task = getTasks(done, 'A01').find(task => task.id === 'test');
  assert.equal(getTaskStatus(done, task), 'done');
  assert.deepEqual(task.events.at(-1), { day: 2, type: 'completed_self_report', dueDay: 2 });
  assert.throws(() => completeTask(done, 'A01', 'test'), /already complete/);
  assert.deepEqual(getTasks(advanceDay(done), 'A01').find(task => task.id === 'test').events, task.events);
  assert.equal(getTasks(state, 'A01').find(task => task.id === 'test').complete, false);
});

test('missed recurring tasks stay overdue until self-report, then start one new occurrence', () => {
  let state = createInitialState();
  for (let i = 0; i < 4; i++) state = advanceDay(state);
  const overdue = getTasks(state, 'A01').find(task => task.id === 'medication');
  assert.equal(overdue.dueDay, 1);
  assert.equal(getTaskStatus(state, overdue), 'overdue');
  const completed = completeTask(state, 'A01', 'medication');
  const nextOccurrence = getTasks(completed, 'A01').find(task => task.id === 'medication');
  assert.equal(nextOccurrence.complete, false);
  assert.equal(nextOccurrence.dueDay, 5);
  assert.equal(nextOccurrence.lastRemindedDay, null);
  assert.equal(getTaskStatus(completed, nextOccurrence), 'upcoming');
  assert.deepEqual(nextOccurrence.events.at(-1), { day: 4, type: 'completed_self_report', dueDay: 1 });
  assert.equal(nextOccurrence.events.length, overdue.events.length + 1);
  assert.throws(() => completeTask(completed, 'A01', 'medication'), /before the fictional due day/);
  assert.deepEqual(runDueTasks(completed), completed);
  const followingDay = advanceDay(completed);
  assert.deepEqual(getTasks(followingDay, 'A01').find(task => task.id === 'medication').events.at(-1),
    { day: 5, type: 'reminder_simulated', dueDay: 5 });
});

test('self-report and reminder scheduling do not supply clinical proof or close an episode', () => {
  let state = createInitialState();
  state = advanceDay(advanceDay(advanceDay(state)));
  const casesBefore = JSON.stringify(state.cases);
  for (const id of ['visit', 'test', 'glucose', 'medication', 'meal']) state = completeTask(state, 'A01', id);
  assert.equal(JSON.stringify(state.cases), casesBefore);
  assert.deepEqual(getCase(state, 'A01').evidence, { attendance: false, review: false, nextPlan: false });
  assert.throws(() => transition(state, 'A01', 'close'), /expected workflow stage/);
  assert.equal(getMetrics(state).closed, 0);
});

test('task state and histories are independent across transitions, scheduler runs and resets', () => {
  const initial = createInitialState();
  const today = advanceDay(initial);
  const before = JSON.stringify(today);
  const scheduled = runDueTasks(today);
  scheduled.tasks[0].dueDay = 99;
  scheduled.tasks[2].events[0].day = 99;
  assert.equal(JSON.stringify(today), before);
  const notified = transition(today, 'A01', 'notify');
  notified.tasks[2].events[0].day = 99;
  assert.equal(JSON.stringify(today), before);
  const completed = completeTask(today, 'A01', 'glucose');
  completed.tasks[3].events[0].day = 99;
  assert.equal(JSON.stringify(today), before);
  assert.deepEqual(createInitialState(), initial);
  assert.ok(createInitialState().tasks.every(task => !task.complete && task.lastRemindedDay === null && task.events.length === 0));
});
