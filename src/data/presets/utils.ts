import { Waypoint, LubeTrigger } from '../../types/servok';

export const makeWps = (pts: { time: number; pos: number }[], prefix: string): Waypoint[] => {
  const maxAllowed = prefix === 'spm' ? 300 : 100;
  const result: Waypoint[] = pts.map((p, i) => ({
    id: `${prefix}-${p.time}-${i}-${Math.random().toString(36).substring(2, 6)}`,
    time: p.time,
    pos: Math.max(0, Math.min(maxAllowed, Math.round(p.pos))),
  }));
  if (result.length >= 2 && result[0].time === 0) {
    result[result.length - 1].pos = result[0].pos;
  }
  return result;
};

export const makeLubes = (trigs: { time: number; bursts: number }[]): LubeTrigger[] => {
  return trigs.map((t, i) => ({
    id: `lube-${t.time}-${i}-${Math.random().toString(36).substring(2, 6)}`,
    time: t.time,
    bursts: Math.max(1, Math.min(5, t.bursts)),
  }));
};
