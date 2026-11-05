/*
 * User-selected chiuluan nightjar recording, played locally without synthesis.
 * See docs/audio-attribution.md for the recording's license and processing history.
 * Mouth movement follows a 20 ms RMS envelope of the bundled, unchanged WAV.
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NightjarAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const SOURCE = 'assets/nightjar-chiayi-chiuluan.wav';
  const RECORDING_SECONDS = 9.7;
  const ENVELOPE_SECONDS = 0.02;
  // Generated from the selected 32 kHz PCM WAV; thresholds 0.025 / 0.05 / 0.09 RMS.
  const MOUTH_ENVELOPE = [0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,2,3,3,2,2,2,2,2,2,2,2,3,3,2,2,3,2,2,2,2,2,2,2,1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,3,3,1,3,2,0,3,2,2,2,3,3,2,1,2,1,1,1,0,3,3,2,2,2,1,0,0,1,1,1,0,1,1,1,3,2,3,3,1,2,2,2,2,3,3,2,3,3,2,2,2,2,2,1,1,1,1,1,0,1,0,0,0,0,0,1,0,1,1,3,2,2,1,1,2,1,2,1,0,2,1,0,1,0,1,0,0,0,0,0,0,0,1,1,2,0,1,1,0,1,1,1,0,1,0,3,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2,1,3,1,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

  function bounded(value, low, high, fallback) {
    const number = Number(value);
    return Math.min(high, Math.max(low, Number.isFinite(number) ? number : fallback));
  }

  function makePlan(kind, lateDays, preferences) {
    const prefs = preferences || {};
    let delay = bounded(lateDays, 0, Number.MAX_SAFE_INTEGER, 0);
    if (!prefs.explicit) {
      if (prefs.intensity === 'gentle') delay = 0;
      else if (prefs.intensity !== 'spirited') delay = Math.min(2, delay);
    }
    const level = delay >= 2 ? 3 : delay >= 1 ? 2 : 1;
    const lengths = { due: 1.45, medication: 4.8, meal: 2.3, glucose: 6.5, late: 9.7, song: 9.7 };
    // For reminders, lateDays is the zero-based attempt index supplied by the UI.
    const duration = prefs.explicit || kind === 'reminder'
      ? [1.45, 4.8, 9.7][level - 1] : (lengths[kind] || lengths.due);
    const volumeScale = Math.min(1, 0.45 + delay * 0.18);
    const volumeLimit = bounded(prefs.volume === undefined ? 45 : prefs.volume, 0, 100, 0);
    return Object.freeze({
      duration,
      maxMouth: kind === 'song' && !prefs.explicit ? 3 : level,
      volume: volumeLimit / 100 * volumeScale,
      volumeScale
    });
  }

  function createPlayer(options) {
    const opts = options || {};
    const media = opts.audio || new root.Audio(SOURCE);
    const requestFrame = opts.requestFrame || (root.requestAnimationFrame
      ? root.requestAnimationFrame.bind(root) : callback => setTimeout(callback, 16));
    const cancelFrame = opts.cancelFrame || (root.cancelAnimationFrame
      ? root.cancelAnimationFrame.bind(root) : clearTimeout);
    const setTimer = opts.setTimer || setTimeout;
    const clearTimer = opts.clearTimer || clearTimeout;
    const onMouth = typeof opts.onMouth === 'function' ? opts.onMouth : function () {};
    const onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : function () {};
    let generation = 0;
    let status = 'stopped';
    let activePlan = null;
    let mouth = 0;
    let frame = null;
    let timer = null;
    let volumeLimit = 45;
    media.preload = 'none';
    media.loop = false;
    media.playbackRate = 1;

    function setMouth(shape) {
      if (shape === mouth) return;
      mouth = shape;
      onMouth(shape);
    }

    function setStatus(next) {
      if (status === next) return;
      status = next;
      onStatus(next);
    }

    function clearWork() {
      if (frame !== null) cancelFrame(frame);
      if (timer !== null) clearTimer(timer);
      frame = null;
      timer = null;
    }

    function pauseAndRewind() {
      media.pause();
      try { media.currentTime = 0; } catch (_) { /* Metadata may not exist yet. */ }
    }

    function halt(nextStatus) {
      generation += 1;
      clearWork();
      pauseAndRewind();
      activePlan = null;
      setMouth(0);
      setStatus(nextStatus);
    }

    function inspect(token) {
      if (token !== generation || status !== 'playing' || !activePlan) return;
      const time = Number(media.currentTime) || 0;
      if (media.ended || time >= activePlan.duration) {
        halt('stopped');
        return;
      }
      const envelope = MOUTH_ENVELOPE[Math.max(0, Math.floor(time / ENVELOPE_SECONDS))] || 0;
      setMouth(Math.min(activePlan.maxMouth, envelope));
    }

    function tick(token) {
      frame = null;
      inspect(token);
      if (token === generation && status === 'playing') {
        frame = requestFrame(function () { tick(token); });
      }
    }

    async function play(plan) {
      const candidate = plan || makePlan('due', 0, {});
      const normalized = {
        duration: bounded(candidate.duration, 0.1, RECORDING_SECONDS, 1.45),
        maxMouth: Math.round(bounded(candidate.maxMouth, 1, 3, 1)),
        volume: bounded(candidate.volume, 0, 1, 0),
        volumeScale: bounded(candidate.volumeScale === undefined ? 1 : candidate.volumeScale, 0, 1, 1)
      };
      const token = ++generation;
      clearWork();
      pauseAndRewind();
      setMouth(0);
      activePlan = normalized;
      volumeLimit = normalized.volumeScale ? bounded(normalized.volume / normalized.volumeScale * 100, 0, 100, 0) : 0;
      media.volume = normalized.volume;
      // "starting" is readable via getState; callbacks only receive settled states.
      status = 'starting';
      try {
        await media.play();
        if (token !== generation) {
          // A cancelled old promise must not resurrect sound, or pause a newer call.
          if (status === 'stopped' || status === 'error') pauseAndRewind();
          return false;
        }
        setStatus('playing');
        tick(token);
        if (token !== generation || status !== 'playing') return false;
        // Also bound playback when the page's animation frames are throttled.
        timer = setTimer(function () {
          if (token === generation) halt('stopped');
        }, normalized.duration * 1000);
        return true;
      } catch (_) {
        if (token === generation) halt('error');
        return false;
      }
    }

    function stop() { halt('stopped'); }

    function setVolume(value) {
      volumeLimit = bounded(value, 0, 100, 0);
      const volumeScale = activePlan ? activePlan.volumeScale : 1;
      media.volume = volumeLimit / 100 * volumeScale;
      if (activePlan) activePlan.volume = media.volume;
    }

    function getState() {
      return {
        status, playing: status === 'playing', generation, mouth,
        currentTime: Number(media.currentTime) || 0,
        volume: media.volume,
        volumeLimit,
        plan: activePlan ? Object.assign({}, activePlan) : null
      };
    }

    media.addEventListener('timeupdate', function () { inspect(generation); });
    media.addEventListener('ended', function () {
      if (media.ended && (status === 'playing' || status === 'starting')) halt('stopped');
    });
    media.addEventListener('error', function () {
      if (status === 'playing' || status === 'starting') halt('error');
    });

    return Object.freeze({ play, stop, setVolume, getState });
  }

  return Object.freeze({ SOURCE, makePlan, createPlayer });
});
