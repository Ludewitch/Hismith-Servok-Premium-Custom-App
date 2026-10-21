export type ControlMode = 'position' | 'auto_cycle' | 'idle';

export interface BlePacketLog {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX' | 'INFO' | 'ERR' | 'SIM';
  hex: string;
  description: string;
}

export type WaveformType = 'sine' | 'triangle' | 'sawtooth' | 'ramp' | 'pulse' | 'random' | 'organic_chaos' | 'crescendo' | 'climax_curve';

export interface Waypoint {
  id: string;
  time: number; // in Millisekunden
  pos: number;  // in Prozent (0 bis 100)
}

export interface Subsection {
  id: string;
  name: string;
  startTime: number; // in Millisekunden
  endTime: number;   // in Millisekunden
  color?: string;
}

export interface LubeTrigger {
  id: string;
  time: number;   // in Millisekunden
  bursts: number; // Pumpstöße (1 bis 5)
}

export interface SnippetConfig {
  type: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'exponential' | 'bounce';
  amplitude: number;  // 10 bis 100%
  duration: number;   // 200 bis 5000 ms
  cycles: number;     // 1 bis 10 Oszillationen
  offset: number;     // 0 bis 100% Mittelpunkt
  targetLayer: 'active' | 'minDepth' | 'maxDepth' | 'spm' | 'hardness' | 'all';
}

export type PresetId = string;

export interface PresetDefinition {
  id: PresetId;
  icon: string;
  durationGroup: 'short' | 'medium' | 'long';
  duration: string;
  category: string;
  intensity: 'soft' | 'medium' | 'intense';
  title: string;
  desc: string;
  specs: string;
  color: string;
  durationMs: number;
  waypointsMinDepth: Waypoint[];
  waypointsMaxDepth: Waypoint[];
  waypointsSpm: Waypoint[];
  waypointsHardness: Waypoint[];
  lubeTriggers: LubeTrigger[];
  subsections: Subsection[];
  recommendedMode?: ControlMode;
  recommendedSmoothness?: number; // 0-10
  isCustom?: boolean;
  createdAt?: string;
}
