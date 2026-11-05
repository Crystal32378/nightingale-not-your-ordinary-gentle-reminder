const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { SOURCE, makePlan, createPlayer } = require('../audio.js');

function harness() {
  const pending = [];
  const listeners = {};
  const frames = new Map();
  const timers = new Map();
  const mouths = [];
  const statuses = [];
  let serial = 0;
  const audio = {
    currentTime: 0, volume: 1, ended: false, paused: true, pauseCount: 0,
    addEventListener(type, handler) { listeners[type] = handler; },
    pause() { this.paused = true; this.pauseCount += 1; },
    play() {
      return new Promise((resolve, reject) => pending.push({
        resolve() { audio.paused = false; resolve(); }, reject
      }));
    }
  };
  const player = createPlayer({
    audio,
    onMouth: shape => mouths.push(shape),
    onStatus: status => statuses.push(status),
    requestFrame: callback => { const id = ++serial; frames.set(id, callback); return id; },
    cancelFrame: id => frames.delete(id),
    setTimer: callback => { const id = ++serial; timers.set(id, callback); return id; },
    clearTimer: id => timers.delete(id)
  });
  function frameAt(time) {
    audio.currentTime = time;
    const current = [...frames.values()];
    frames.clear();
    current.forEach(fn => fn());
  }
  return { player, audio, pending, listeners, frames, timers, mouths, statuses, frameAt };
}

test('playback plans use the selected recording with bounded duration, intensity and volume', () => {
  assert.equal(SOURCE, 'assets/nightjar-chiayi-chiuluan.wav');
  assert.deepEqual(makePlan('due', 0, { volume: 100 }), {
    duration: 1.45, maxMouth: 1, volume: 0.45, volumeScale: 0.45
  });
  const gentle = makePlan('late', 8, { volume: 80, intensity: 'gentle' });
  assert.equal(gentle.maxMouth, 1);
  assert.equal(gentle.volume, 0.8 * 0.45);
  const playful = makePlan('late', 8, { volume: 100, intensity: 'playful' });
  assert.equal(playful.volumeScale, 0.81);
  const spirited = makePlan('late', 8, { volume: 200, intensity: 'spirited' });
  assert.equal(spirited.volume, 1);
  assert.equal(spirited.maxMouth, 3);
  assert.equal(spirited.duration, 9.7);
  assert.equal(makePlan('meal', 0, {}).duration, 2.3);
  assert.equal(makePlan('glucose', 0, {}).duration, 6.5);
  assert.equal(makePlan('song', 0, {}).maxMouth, 3);
  assert.equal(makePlan('due', -3, { volume: -20 }).volume, 0);
  assert.equal(makePlan('due', NaN, { volume: NaN }).volume, 0);
  assert.equal(makePlan('due', 3, { explicit: true, intensity: 'gentle' }).duration, 9.7);
});

test('the first three reminder attempts grow in duration, mouth shape and volume within the chosen style', () => {
  for (const intensity of ['gentle', 'playful', 'spirited']) {
    const plans = [0, 1, 2].map(attemptIndex => makePlan('reminder', attemptIndex, { volume: 60, intensity }));
    for (let i = 0; i < plans.length; i += 1) {
      assert.ok(plans[i].volume >= 0 && plans[i].volume <= 0.6);
      if (i) {
        assert.ok(plans[i].volume >= plans[i - 1].volume);
        assert.ok(plans[i].duration >= plans[i - 1].duration);
      }
    }
    if (intensity === 'gentle') {
      assert.deepEqual(plans.map(plan => plan.duration), [1.45, 1.45, 1.45]);
      assert.deepEqual(plans.map(plan => plan.maxMouth), [1, 1, 1]);
      assert.ok(plans.every(plan => plan.volume === 0.6 * 0.45));
    } else {
      assert.deepEqual(plans.map(plan => plan.duration), [1.45, 4.8, 9.7]);
      assert.deepEqual(plans.map(plan => plan.maxMouth), [1, 2, 3]);
      assert.ok(plans[1].volume > plans[0].volume);
      assert.ok(plans[2].volume > plans[1].volume);
    }
  }
});

test('fourth and later reminders respect volume limits and zero volume in every style', () => {
  for (const intensity of ['gentle', 'playful', 'spirited']) {
    for (const volume of [0, 35, 100]) {
      for (const attemptIndex of [3, 4, 100]) {
        const plan = makePlan('reminder', attemptIndex, { volume, intensity });
        assert.ok(plan.volume >= 0 && plan.volume <= volume / 100);
        assert.ok(plan.duration <= 9.7);
        assert.ok(plan.maxMouth <= 3);
        if (volume === 0) assert.equal(plan.volume, 0);
        if (intensity === 'gentle') assert.equal(plan.volumeScale, 0.45);
        if (intensity === 'playful') assert.equal(plan.volumeScale, 0.81);
      }
    }
  }
  assert.equal(makePlan('reminder', 3, { volume: 100, intensity: 'spirited' }).volume, 0.99);
  assert.equal(makePlan('reminder', 4, { volume: 100, intensity: 'spirited' }).volume, 1);
});

test('stop during an unresolved play request prevents late playback resurrection', async () => {
  const h = harness();
  const result = h.player.play(makePlan('late', 3, { volume: 40 }));
  assert.equal(h.player.getState().status, 'starting');
  h.player.stop();
  h.pending[0].resolve();
  assert.equal(await result, false);
  assert.equal(h.audio.paused, true);
  assert.equal(h.player.getState().status, 'stopped');
  assert.equal(h.player.getState().mouth, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.statuses, ['stopped']);
});

test('a superseded play resolution does not pause a newer active recording', async () => {
  const h = harness();
  const old = h.player.play(makePlan('due', 0, {}));
  const current = h.player.play(makePlan('song', 0, {}));
  h.pending[1].resolve();
  assert.equal(await current, true);
  const pauses = h.audio.pauseCount;
  h.pending[0].resolve();
  assert.equal(await old, false);
  assert.equal(h.audio.pauseCount, pauses);
  assert.equal(h.audio.paused, false);
  assert.equal(h.player.getState().plan.duration, 9.7);
  assert.equal(h.player.getState().playing, true);
  assert.equal(h.frames.size, 1);
  h.player.stop();
});

test('a superseded play rejection does not report failure for the newer call', async () => {
  const h = harness();
  const old = h.player.play(makePlan('due', 0, {}));
  const current = h.player.play(makePlan('meal', 0, {}));
  h.pending[1].resolve();
  await current;
  h.pending[0].reject(new Error('Old request interrupted by pause'));
  assert.equal(await old, false);
  assert.equal(h.player.getState().playing, true);
  assert.deepEqual(h.statuses, ['playing']);
  h.player.stop();
});

test('the live volume slider keeps intensity gain and zero truly silences playback', async () => {
  const h = harness();
  const start = h.player.play(makePlan('due', 0, { volume: 60 }));
  h.pending[0].resolve();
  await start;
  h.player.setVolume(20);
  assert.equal(h.audio.volume, 0.2 * 0.45);
  assert.equal(h.player.getState().volumeLimit, 20);
  h.player.setVolume(0);
  assert.equal(h.audio.volume, 0);
  h.player.setVolume(999);
  assert.equal(h.audio.volume, 0.45);
  h.player.stop();
});

test('mouth shapes follow actual recording time, cap at the requested level and reset on stop', async () => {
  const h = harness();
  const start = h.player.play(makePlan('medication', 1, { volume: 50, explicit: true }));
  h.pending[0].resolve();
  await start;
  h.frameAt(0.1);
  assert.equal(h.player.getState().mouth, 0); // Selected file's opening silence.
  h.frameAt(0.22);
  assert.equal(h.player.getState().mouth, 2); // Loud waveform, capped at medium.
  h.frameAt(2.0);
  assert.equal(h.player.getState().mouth, 0);
  h.frameAt(4.1);
  assert.equal(h.player.getState().mouth, 2);
  h.player.stop();
  assert.equal(h.player.getState().mouth, 0);
  assert.equal(h.audio.currentTime, 0);
  assert.equal(h.mouths.at(-1), 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
});

test('excerpt duration is bounded by recording time and a fallback timer', async () => {
  const h = harness();
  const start = h.player.play(makePlan('due', 0, {}));
  h.pending[0].resolve();
  await start;
  h.frameAt(1.46);
  assert.equal(h.player.getState().status, 'stopped');
  assert.equal(h.audio.paused, true);
  assert.equal(h.timers.size, 0);
  const again = h.player.play(makePlan('song', 0, {}));
  h.pending[1].resolve();
  await again;
  [...h.timers.values()][0]();
  assert.equal(h.player.getState().status, 'stopped');
  assert.equal(h.frames.size, 0);
});

test('media failure ends playback without a synthesized fallback', async () => {
  const h = harness();
  const start = h.player.play(makePlan('song', 0, {}));
  h.pending[0].reject(new Error('Asset cannot decode'));
  assert.equal(await start, false);
  assert.equal(h.player.getState().status, 'error');
  assert.equal(h.audio.paused, true);
  assert.equal(h.player.getState().mouth, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.pending.length, 1);
  assert.deepEqual(h.statuses, ['error']);
});

test('a recording already ended at play resolution does not leave a fallback timer', async () => {
  const h = harness();
  const start = h.player.play(makePlan('song', 0, {}));
  h.audio.ended = true;
  h.pending[0].resolve();
  assert.equal(await start, false);
  assert.equal(h.player.getState().status, 'stopped');
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
});

test('natural end and a current media error close the mouth and cancel work', async () => {
  const h = harness();
  let start = h.player.play(makePlan('song', 0, {}));
  h.pending[0].resolve();
  await start;
  h.audio.ended = true;
  h.listeners.ended();
  assert.equal(h.player.getState().status, 'stopped');
  h.audio.ended = false;
  start = h.player.play(makePlan('song', 0, {}));
  h.pending[1].resolve();
  await start;
  h.listeners.error();
  assert.equal(h.player.getState().status, 'error');
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
});

test('plain browser script exports NightjarAudio without requiring a network or decoder', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../audio.js'), 'utf8'), context);
  assert.equal(context.NightjarAudio.SOURCE, SOURCE);
  assert.equal(context.NightjarAudio.makePlan('due', 0, {}).duration, 1.45);
});
