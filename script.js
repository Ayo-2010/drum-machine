const padsEl = document.getElementById('pads');
const volumeEl = document.getElementById('volume');
const volumeOut = document.getElementById('volumeOut');

const PADS = [
  { name: 'Kick', key: '1' },
  { name: 'Snare', key: '2' },
  { name: 'Hi-hat', key: '3' },
  { name: 'Clap', key: '4' },
  { name: 'Tom', key: '5' },
  { name: 'Rim', key: '6' },
  { name: 'Cowbell', key: '7' },
  { name: 'Crash', key: '8' },
];

let ctx = null;
let master = null;
const buttons = [];

function ensureAudio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = Number(volumeEl.value);
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function noiseSource(duration) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

function envelope(time, peak, length) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  return gain;
}

function kick(time) {
  const osc = ctx.createOscillator();
  const gain = envelope(time, 0.9, 0.4);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(165, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.18);
  osc.connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + 0.42);
}

function snare(time) {
  const source = noiseSource(0.24);
  const filter = ctx.createBiquadFilter();
  const gain = envelope(time, 0.55, 0.2);

  filter.type = 'highpass';
  filter.frequency.value = 1200;
  source.connect(filter).connect(gain).connect(master);
  source.start(time);

  const osc = ctx.createOscillator();
  const tone = envelope(time, 0.35, 0.12);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(190, time);
  osc.frequency.exponentialRampToValueAtTime(120, time + 0.1);
  osc.connect(tone).connect(master);
  osc.start(time);
  osc.stop(time + 0.14);
}

function hat(time) {
  const source = noiseSource(0.09);
  const filter = ctx.createBiquadFilter();
  const gain = envelope(time, 0.3, 0.07);

  filter.type = 'highpass';
  filter.frequency.value = 7000;
  source.connect(filter).connect(gain).connect(master);
  source.start(time);
}

function clap(time) {
  [0, 0.022, 0.044].forEach((offset, index) => {
    const source = noiseSource(0.12);
    const filter = ctx.createBiquadFilter();
    const gain = envelope(time + offset, index === 2 ? 0.42 : 0.26, index === 2 ? 0.16 : 0.05);

    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 1.4;
    source.connect(filter).connect(gain).connect(master);
    source.start(time + offset);
  });
}

function tom(time) {
  const osc = ctx.createOscillator();
  const gain = envelope(time, 0.6, 0.3);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(240, time);
  osc.frequency.exponentialRampToValueAtTime(105, time + 0.24);
  osc.connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + 0.32);
}

function rim(time) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = envelope(time, 0.35, 0.05);

  osc.type = 'square';
  osc.frequency.value = 1700;
  filter.type = 'bandpass';
  filter.frequency.value = 1700;
  filter.Q.value = 3;
  osc.connect(filter).connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + 0.06);
}

function cowbell(time) {
  [540, 800].forEach((frequency) => {
    const osc = ctx.createOscillator();
    const gain = envelope(time, 0.18, 0.28);

    osc.type = 'square';
    osc.frequency.value = frequency;
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.3);
  });
}

function crash(time) {
  const source = noiseSource(1.3);
  const filter = ctx.createBiquadFilter();
  const gain = envelope(time, 0.34, 1.2);

  filter.type = 'highpass';
  filter.frequency.value = 5000;
  source.connect(filter).connect(gain).connect(master);
  source.start(time);
}

const SOUNDS = { Kick: kick, Snare: snare, 'Hi-hat': hat, Clap: clap, Tom: tom, Rim: rim, Cowbell: cowbell, Crash: crash };

function trigger(name, index) {
  ensureAudio();
  SOUNDS[name](ctx.currentTime);

  const button = buttons[index];
  button.classList.add('hit');
  setTimeout(() => button.classList.remove('hit'), 130);
}

PADS.forEach((pad, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pad';
  button.innerHTML = `<span class="name">${pad.name}</span><span class="key">${pad.key}</span>`;
  button.addEventListener('click', () => trigger(pad.name, index));

  padsEl.appendChild(button);
  buttons.push(button);
});

document.addEventListener('keydown', (event) => {
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < PADS.length && !event.repeat) {
    trigger(PADS[index].name, index);
  }
});

volumeEl.addEventListener('input', () => {
  const value = Number(volumeEl.value);
  volumeOut.textContent = `${Math.round(value * 100)}%`;
  if (master) master.gain.value = value;
});
