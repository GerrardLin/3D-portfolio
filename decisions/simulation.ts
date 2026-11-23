const sampleRate = 44100;
export const modes = [
  { title: "数字原音", rate: 44100, bits: 16, tag: "44.1 kHz · 16 bit" },
  { title: "接近唱片原型", rate: 11000, bits: 6, tag: "11 kHz · 6 bit" },
  { title: "更低精度", rate: 2000, bits: 3, tag: "2 kHz · 3 bit" },
];
const melody = [60, 64, 67, 72, 71, 67, 64, 67, 62, 65, 69, 74, 72, 67, 64, 60];
const period = .215;
const duration = melody.length * period;
export function tone(time: number) {
  const note = melody[Math.floor(time / period)] ?? 60;
  const local = time % period;
  const f = 440 * Math.pow(2, (note - 69) / 12);
  const env = Math.min(local * 140, 1) * Math.pow(Math.max(0, 1 - local / period), .55);
  return (.39 * Math.sin(time * f * 6.283) + .19 * Math.sin(time * f * 12.566) + .12 * Math.sin(time * f * 18.85)) * env;
}
export function samples(mode: number, time: number) {
  const selected = modes[mode];
  const levels = 2 ** (selected.bits - 1) - 1;
  return Math.round(tone(Math.floor(time * selected.rate) / selected.rate) * levels) / levels;
}
export function makeAudio(context: AudioContext, mode: number) {
  const clip = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = clip.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = samples(mode, i / sampleRate);
  return clip;
}
export function reachable(layout: "central" | "distributed", offline: boolean) {
  if (!offline) return [true, true, true];
  return layout === "central" ? [false, false, false] : [true, false, true];
}
