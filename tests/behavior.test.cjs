'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../state.js');
const { completionSequence, reminderCue } = require('../behavior.js');

const daily = ['medication', 'meal', 'glucose'];
const firstMood = { medication: 'feeding', meal: 'smiling', glucose: 'celebrating' };
const permutations = [
  ['medication', 'meal', 'glucose'], ['medication', 'glucose', 'meal'],
  ['meal', 'medication', 'glucose'], ['meal', 'glucose', 'medication'],
  ['glucose', 'medication', 'meal'], ['glucose', 'meal', 'medication']
];

function onDay(day) {
  let state = M.createInitialState();
  for (let i = 0; i < day; i++) state = M.advanceDay(state);
  return state;
}

function copy(state) { return JSON.parse(JSON.stringify(state)); }

test('all six daily completion orders flap only on the final distinct check-in', () => {
  for (const order of permutations) {
    let before = onDay(1);
    order.forEach((id, index) => {
      const after = M.completeTask(before, 'A01', id);
      const expected = index === 2 ? [firstMood[id], 'flapping', 'dancing'] : [firstMood[id]];
      assert.deepEqual(completionSequence(before, after, id), expected, order.join(' → ') + ' / ' + id);
      before = after;
    });
  }
});

test('a new day needs all three daily records again, then the sixth record sings after flapping', () => {
  let state = onDay(1);
  for (const id of daily) state = M.completeTask(state, 'A01', id);
  state = M.advanceDay(state);
  for (const [index, id] of daily.entries()) {
    const after = M.completeTask(state, 'A01', id);
    assert.deepEqual(completionSequence(state, after, id), index === 2
      ? ['celebrating', 'flapping', 'singing'] : [firstMood[id]]);
    state = after;
  }
});

test('a one-off task may reach a performance milestone but never supplies daily flapping', () => {
  let state = onDay(3);
  state = M.completeTask(state, 'A01', 'medication');
  state = M.completeTask(state, 'A01', 'meal');
  const tested = M.completeTask(state, 'A01', 'test');
  assert.deepEqual(completionSequence(state, tested, 'test'), ['celebrating', 'dancing']);
  const dailyComplete = M.completeTask(tested, 'A01', 'glucose');
  assert.deepEqual(completionSequence(tested, dailyComplete, 'glucose'), ['celebrating', 'flapping']);
  const visited = M.completeTask(dailyComplete, 'A01', 'visit');
  assert.deepEqual(completionSequence(dailyComplete, visited, 'visit'), ['celebrating']);
});

test('unchanged snapshots, reminder-only actions, unknown tasks and duplicate-day replays have no effects', () => {
  const before = onDay(1);
  const after = M.completeTask(before, 'A01', 'medication');
  assert.deepEqual(completionSequence(before, before, 'medication'), []);
  assert.deepEqual(completionSequence(after, copy(after), 'medication'), []);
  assert.deepEqual(completionSequence(before, M.runDueTasks(before), 'medication'), []);
  assert.deepEqual(completionSequence(before, after, 'unknown'), []);
  assert.deepEqual(completionSequence(before, after, 'medication', 'UNKNOWN'), []);
  assert.deepEqual(completionSequence(before, after, 'meal'), []);
  const replay = copy(after);
  const replayTask = replay.tasks.find(task => task.id === 'medication');
  replayTask.events.push(copy({ entry: replayTask.events.at(-1) }).entry);
  assert.deepEqual(completionSequence(after, replay, 'medication'), []);
  const stale = copy(after);
  stale.tasks.find(task => task.id === 'medication').events.at(-1).day = 0;
  assert.deepEqual(completionSequence(before, stale, 'medication'), []);
  assert.deepEqual(completionSequence(before, M.advanceDay(after), 'medication'), []);
});

test('history replacement and early fabricated completions cannot earn behavior cues', () => {
  const before = onDay(1);
  const changedHistory = M.completeTask(before, 'A01', 'meal');
  changedHistory.tasks.find(task => task.id === 'meal').events[0].day = -99;
  assert.deepEqual(completionSequence(before, changedHistory, 'meal'), []);
  const early = onDay(0);
  const invented = copy(early);
  invented.tasks.find(task => task.id === 'visit').events.push({ day: 0, dueDay: 3, type: 'completed_self_report' });
  assert.deepEqual(completionSequence(early, invented, 'visit'), []);
});

test('daily checks, performance totals and transitions stay inside the requested case', () => {
  let before = onDay(1);
  before = M.completeTask(before, 'A01', 'medication');
  before = M.completeTask(before, 'A01', 'meal');
  const otherTasks = M.createInitialState().tasks.map(task => ({ ...task, caseId: 'B02' }));
  before.tasks.push(...otherTasks);
  const after = M.completeTask(before, 'B02', 'glucose');
  assert.deepEqual(completionSequence(before, after, 'glucose'), []);
  assert.deepEqual(completionSequence(before, after, 'glucose', 'B02'), ['celebrating']);
  const ownAfter = M.completeTask(after, 'A01', 'glucose');
  assert.deepEqual(completionSequence(after, ownAfter, 'glucose'), ['celebrating', 'flapping', 'dancing']);
});

test('reminder attempts one through three do not side-eye; the fourth does', () => {
  let state = M.createInitialState();
  assert.equal(reminderCue(state), null);
  for (let attempt = 1; attempt <= 4; attempt++) {
    state = M.advanceDay(state);
    assert.deepEqual(reminderCue(state), { taskId: 'medication', attempt, showSideEye: attempt > 3 });
    assert.deepEqual(reminderCue(M.runDueTasks(state)), reminderCue(state));
  }
});

test('reminder selection uses highest current attempt, then stable task priority', () => {
  const state = onDay(4);
  state.tasks.reverse();
  assert.deepEqual(reminderCue(state), { taskId: 'medication', attempt: 4, showSideEye: true });
  let next = M.completeTask(state, 'A01', 'medication');
  assert.equal(reminderCue(next).taskId, 'meal');
  next = M.completeTask(next, 'A01', 'meal');
  assert.equal(reminderCue(next).taskId, 'glucose');
  next = M.completeTask(next, 'A01', 'glucose');
  assert.deepEqual(reminderCue(next), { taskId: 'test', attempt: 3, showSideEye: false });
  next = M.completeTask(next, 'A01', 'test');
  assert.deepEqual(reminderCue(next), { taskId: 'visit', attempt: 2, showSideEye: false });
  next = M.completeTask(next, 'A01', 'visit');
  assert.equal(reminderCue(next), null);
});

test('fulfilling an overdue occurrence resets its reminder cue when the next occurrence becomes due', () => {
  let state = onDay(4);
  for (const id of ['medication', 'meal', 'glucose', 'test', 'visit']) state = M.completeTask(state, 'A01', id);
  assert.equal(reminderCue(state), null);
  state = M.advanceDay(state);
  assert.deepEqual(reminderCue(state), { taskId: 'medication', attempt: 1, showSideEye: false });
  const current = state.tasks.find(task => task.id === 'medication');
  assert.equal(current.events.filter(entry => entry.type === 'reminder_simulated').length, 5);
  assert.equal(current.dueDay, 5);
});

test('future due tasks and another case cannot influence reminder urgency', () => {
  const state = onDay(1);
  const other = copy(state.tasks.find(task => task.id === 'medication'));
  other.caseId = 'B02';
  other.events = [1, 2, 3, 4].map(day => ({ day: 0, dueDay: 1, type: 'reminder_simulated' }));
  state.tasks.push(other);
  assert.deepEqual(reminderCue(state), { taskId: 'medication', attempt: 1, showSideEye: false });
  assert.deepEqual(reminderCue(state, 'B02'), { taskId: 'medication', attempt: 4, showSideEye: true });
  const future = state.tasks.find(task => task.id === 'test');
  future.events = [0, 0, 0, 0, 0].map(day => ({ day, dueDay: 2, type: 'reminder_simulated' }));
  assert.deepEqual(reminderCue(state), { taskId: 'medication', attempt: 1, showSideEye: false });
  assert.equal(reminderCue(state, 'C03'), null);
});

test('helpers are pure and a due task without a logged execution has attempt zero', () => {
  const before = onDay(1);
  const after = M.completeTask(before, 'A01', 'meal');
  const snapshots = [JSON.stringify(before), JSON.stringify(after)];
  completionSequence(before, after, 'meal');
  reminderCue(before);
  assert.deepEqual([JSON.stringify(before), JSON.stringify(after)], snapshots);
  const unexecuted = M.createInitialState();
  unexecuted.day = 1;
  assert.deepEqual(reminderCue(unexecuted), { taskId: 'medication', attempt: 0, showSideEye: false });
  assert.equal(reminderCue(null), null);
  assert.deepEqual(completionSequence(null, null, 'medication'), []);
});

test('browser script exports CareBehavior without imports or side effects', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'behavior.js'), 'utf8'), context);
  assert.equal(typeof context.CareBehavior.completionSequence, 'function');
  assert.equal(typeof context.CareBehavior.reminderCue, 'function');
});
