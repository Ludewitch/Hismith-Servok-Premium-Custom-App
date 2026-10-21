import { BlePacketLog, ControlMode } from '../types/servok';

/**
 * ============================================================================
 * HISMITH SERVOK PREMIUM (H2 / S2) - HARDWARE STEUERUNGS-SERVICE
 * ============================================================================
 * Physischer Hub:  0 bis 168 mm (16.8 cm / 17mm–170mm effektiv)
 * GATT-Service:   0000ffe5-0000-1000-8000-00805f9b34fb (0xffe5)
 * TX (Schreiben): 0000ffe9-0000-1000-8000-00805f9b34fb (0xffe9)
 * RX (Feedback):  0000ffe4-0000-1000-8000-00805f9b34fb (0xffe4)
 * Paketformat (4 Bytes):
 * [0xCC, COMMAND, VALUE, CHECKSUM] mit CHECKSUM = (COMMAND + VALUE) & 0xFF
 *
 * Befehlssatz:
 * CC 01 A1 A2 : Position Control Modus (erlaubt 0x0A Zielbefehle)
 * CC 01 A0 A1 : Auto-Cycle Modus (Hardware-Oszillation zwischen 0x07 & 0x08)
 * CC 01 00 01 : Idle / Setup Reset
 * CC 02 00 02 : Standby / Not-Aus (Power Off / Kill-Switch)
 * CC 03 [0-100] [chk] : Hardware-Geschwindigkeit (Auto-Modus)
 * CC 07 [0-99]  [chk] : Min-Hub % (100% = 168mm) -> Garantiert Hub nach hinten
 * CC 08 [1-100] [chk] : Max-Hub % (100% = 168mm) -> Garantiert Hub nach vorne
 * CC 09 [0-10]  [chk] : Smoothness / Beschleunigung (0 = hart, 10 = weich)
 * CC 0A [0-100] [chk] : Absolute Soll-Position (im Position Control Mode)
 * ============================================================================
 */

export const SERVOK_PHYSICAL_STROKE_MM = 168; // 168 mm Maximalhub (Servok H2/S2)
export const SERVOK_PHYSICAL_STROKE_CM = 16.8;

interface QueuedBleCommand {
  cmdKey: string; // e.g., 'cmd-10' for 0x0A, 'emergency' for 0x02
  bytes: Uint8Array;
  description: string;
  priority: boolean;
  silent?: boolean;
  resolve?: (ok: boolean) => void;
}

export class ServokBleService {
  private device: any = null;
  private txChar: any = null;
  private rxChar: any = null;

  public status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  public activeMode: ControlMode = 'position';
  public deviceName: string = 'Nicht verbunden';
  public livePosition: number | null = null; // Sensorwert von RX 0xffe4
  public isSimulated: boolean = false;

  // RSSI & Verbindungs-Telemetrie
  public rssiDbm: number = -54; // Signalstärke in dBm (-40 exzellent bis -95 schwach)
  public lastTxLatencyMs: number = 6;
  public reconnectAttempts: number = 0;
  public isReconnecting: boolean = false;
  private manualDisconnectRequested: boolean = false;
  private rssiTimer: number | null = null;

  // Intelligente GATT Message-Queue & Command-Throttling
  private commandQueue: QueuedBleCommand[] = [];
  private isProcessingQueue: boolean = false;
  private lastTransmitTimeMs: number = 0;
  private readonly MIN_BLE_INTERVAL_MS = 18; // ~55Hz Hardware-sicheres GATT-Fenster

  // Caching für Auto-Cycle Register (verhindert BLE-Spamming bei kontinuierlichem Playback)
  private lastAutoSettings = {
    min: -1,
    max: -1,
    speed: -1,
    smoothness: -1,
  };

  // Simulator State
  private simCurrentPos: number = 0;
  private simTargetPos: number = 0;
  private simSpeed: number = 35;
  private simSmoothness: number = 5;
  private simMin: number = 10;
  private simMax: number = 85;
  private simAnimFrame: number | null = null;
  private lastSimTick: number = 0;
  private simAutoDirection: 1 | -1 = 1;

  public get isConnected(): boolean {
    return this.status === 'connected';
  }

  public get connected(): boolean {
    return this.status === 'connected';
  }

  public get queueDepth(): number {
    return this.commandQueue.length;
  }

  public get signalQuality(): 'excellent' | 'good' | 'fair' | 'weak' | 'offline' {
    if (this.status !== 'connected') return 'offline';
    if (this.rssiDbm >= -58) return 'excellent';
    if (this.rssiDbm >= -70) return 'good';
    if (this.rssiDbm >= -82) return 'fair';
    return 'weak';
  }

  private onLogCallback?: (log: BlePacketLog) => void;
  private onStatusCallback?: (status: 'disconnected' | 'connecting' | 'connected' | 'error', errorMsg?: string) => void;
  private onPositionCallback?: (posPct: number) => void;
  private onTelemetryCallback?: (rssi: number, latencyMs: number, queueLen: number) => void;

  public setCallbacks(
    onLog?: (log: BlePacketLog) => void,
    onStatus?: (status: 'disconnected' | 'connecting' | 'connected' | 'error', errorMsg?: string) => void,
    onPosition?: (posPct: number) => void,
    onTelemetry?: (rssi: number, latencyMs: number, queueLen: number) => void
  ) {
    this.onLogCallback = onLog;
    this.onStatusCallback = onStatus;
    this.onPositionCallback = onPosition;
    this.onTelemetryCallback = onTelemetry;
  }

  public log(direction: 'TX' | 'RX' | 'INFO' | 'ERR' | 'SIM', hex: string, description: string) {
    const now = new Date();
    const timeStr =
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) +
      '.' +
      String(now.getMilliseconds()).padStart(3, '0');

    const entry: BlePacketLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timeStr,
      direction,
      hex,
      description,
    };

    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
  }

  /**
   * Prüfsummen-Berechnung: (CMD + VALUE) & 0xFF
   */
  public calculateChecksum(cmd: number, val: number): number {
    return (cmd + val) & 0xff;
  }

  /**
   * Intelligentes Command-Throttling & Priority Queue Dispatcher
   * Verhindert GATT-Puffer-Überlauf bei schnellen Gesten und priorisiert Not-Aus (0x02).
   */
  public enqueueCommand(
    bytes: Uint8Array,
    description: string,
    options: { priority?: boolean; silent?: boolean } = {}
  ): Promise<boolean> {
    const cmdByte = bytes.length >= 2 ? bytes[1] : 0xff;
    const cmdKey = options.priority ? `prio-${Date.now()}` : `cmd-${cmdByte}`;

    return new Promise((resolve) => {
      if (options.priority) {
        // Bei Not-Aus oder kritischem Moduswechsel alle veralteten Bewegungsbefehle verwerfen
        this.commandQueue = [];
        this.commandQueue.unshift({
          cmdKey,
          bytes,
          description,
          priority: true,
          silent: options.silent,
          resolve,
        });
      } else {
        // Coalescing / Debouncing: Überschreibe ausstehenden Befehl gleichen Typs in der Queue
        const existingIdx = this.commandQueue.findIndex((item) => item.cmdKey === cmdKey && !item.priority);
        if (existingIdx !== -1) {
          if (this.commandQueue[existingIdx].resolve) {
            this.commandQueue[existingIdx].resolve!(true);
          }
          this.commandQueue[existingIdx] = {
            cmdKey,
            bytes,
            description,
            priority: false,
            silent: options.silent,
            resolve,
          };
        } else {
          this.commandQueue.push({
            cmdKey,
            bytes,
            description,
            priority: false,
            silent: options.silent,
            resolve,
          });
        }
      }

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const nextItem = this.commandQueue.shift()!;
      const now = performance.now();
      const elapsed = now - this.lastTransmitTimeMs;

      if (!nextItem.priority && elapsed < this.MIN_BLE_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, this.MIN_BLE_INTERVAL_MS - elapsed));
      }

      const t0 = performance.now();
      const ok = await this.writeRawImmediate(nextItem.bytes, nextItem.description, nextItem.silent);
      const dt = Math.round(performance.now() - t0);
      this.lastTransmitTimeMs = performance.now();
      this.lastTxLatencyMs = Math.max(2, Math.min(120, dt));

      // Dynamisches RSSI-Schätzmodell basierend auf GATT-Ack-Latenz, falls Browser kein watchAdvertisements liefert
      if (!this.isSimulated) {
        const estimatedRssi = Math.max(-92, Math.min(-42, Math.round(-48 - this.lastTxLatencyMs * 0.65)));
        this.rssiDbm = Math.round(this.rssiDbm * 0.75 + estimatedRssi * 0.25);
      }

      if (this.onTelemetryCallback) {
        this.onTelemetryCallback(this.rssiDbm, this.lastTxLatencyMs, this.commandQueue.length);
      }

      if (nextItem.resolve) {
        nextItem.resolve(ok);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Unmittelbarer Low-Level Schreibbefehl an reale Hardware oder internen Simulator
   */
  private async writeRawImmediate(bytes: Uint8Array, description: string, silent: boolean = false): Promise<boolean> {
    const hexString = Array.from(bytes)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');

    if (this.isSimulated) {
      if (!silent) {
        this.log('SIM', hexString, `[Virtuell] ${description}`);
      }
      if (bytes[0] === 0xcc && bytes.length >= 3) {
        const cmd = bytes[1];
        const val = bytes[2];
        if (cmd === 0x0a) {
          this.simTargetPos = val;
        } else if (cmd === 0x03) {
          this.simSpeed = val;
        } else if (cmd === 0x07) {
          this.simMin = val;
        } else if (cmd === 0x08) {
          this.simMax = val;
        } else if (cmd === 0x09) {
          this.simSmoothness = val;
        } else if (cmd === 0x02) {
          this.simSpeed = 0;
          this.activeMode = 'idle';
        } else if (cmd === 0x01) {
          if (val === 0xa1) this.activeMode = 'position';
          else if (val === 0xa0) this.activeMode = 'auto_cycle';
          else if (val === 0x00) this.activeMode = 'idle';
        }
      }
      return true;
    }

    if (!this.txChar) {
      if (!silent) {
        this.log('ERR', '', 'Konnte nicht senden: Kein aktives TX-Merkmal geöffnet.');
      }
      return false;
    }

    try {
      let written = false;
      const props = this.txChar.properties;
      const canWriteNoResp = !props || props.writeWithoutResponse === true;

      if (canWriteNoResp && typeof this.txChar.writeValueWithoutResponse === 'function') {
        try {
          await this.txChar.writeValueWithoutResponse(bytes);
          written = true;
        } catch (e1) {
          // writeValueWithoutResponse unsupported/failed -> fallback to with-response
        }
      }

      if (!written && typeof this.txChar.writeValueWithResponse === 'function') {
        try {
          await this.txChar.writeValueWithResponse(bytes);
          written = true;
        } catch (e2) {
          // writeValueWithResponse failed -> try generic write
        }
      }

      if (!written && typeof this.txChar.writeValue === 'function') {
        await this.txChar.writeValue(bytes);
        written = true;
      }

      if (!silent) {
        this.log('TX', hexString, description);
      }
      return written;
    } catch (err: any) {
      if (!silent) {
        this.log('ERR', hexString, `Schreibfehler: ${err.message || err}`);
      }
      return false;
    }
  }

  /**
   * Öffentlicher Schreibbefehl über die gedrosselte Message-Queue
   */
  public async writeRaw(bytes: Uint8Array, description: string, priority: boolean = false): Promise<boolean> {
    return this.enqueueCommand(bytes, description, { priority });
  }

  /**
   * Paket-Assembler mit Checksumme: [0xCC, CMD, VAL, CHECKSUM]
   */
  public async sendCommand(cmd: number, val: number, description: string, priority: boolean = false): Promise<boolean> {
    const clampedVal = Math.max(0, Math.min(255, Math.round(val)));
    const checksum = (cmd + clampedVal) & 0xff;
    const packet = new Uint8Array([0xcc, cmd, clampedVal, checksum]);
    return await this.writeRaw(packet, description, priority);
  }

  /**
   * Modus-Umschalter:
   * 'position'   -> CC 01 A1 A2 (Position Control Mode)
   * 'auto_cycle' -> CC 01 A0 A1 (Firmware Auto-Cycle Mode)
   * 'idle'       -> CC 01 00 01 (Standby / Idle / Stop)
   */
  public async applyControlMode(mode: ControlMode): Promise<boolean> {
    if (this.activeMode === mode && !this.isSimulated) {
      return true;
    }
    this.activeMode = mode;
    if (mode === 'position') {
      const packet = new Uint8Array([0xcc, 0x01, 0xa1, 0xa2]);
      return await this.writeRaw(packet, 'Modus: Position Control Mode (0xCC 0x01 0xA1 0xA2)', true);
    } else if (mode === 'auto_cycle') {
      const packet = new Uint8Array([0xcc, 0x01, 0xa0, 0xa1]);
      return await this.writeRaw(packet, 'Modus: Firmware Auto-Cycle (0xCC 0x01 0xA0 0xA1)', true);
    } else {
      const packet = new Uint8Array([0xcc, 0x01, 0x00, 0x01]);
      return await this.writeRaw(packet, 'Modus: Standby / Idle (0xCC 0x01 0x00 0x01)', true);
    }
  }

  /**
   * Not-Aus / Kill-Switch (CC 02 00 02 + CC 03 00 03 mit höchster Priorität)
   */
  public async emergencyStop(): Promise<boolean> {
    this.commandQueue = [];
    this.lastAutoSettings = { min: -1, max: -1, speed: -1, smoothness: -1 };
    const stopSpeed = new Uint8Array([0xcc, 0x03, 0x00, 0x03]);
    const killSwitch = new Uint8Array([0xcc, 0x02, 0x00, 0x02]);
    await this.writeRawImmediate(stopSpeed, 'KILL-SWITCH: Speed 0% (0xCC 0x03 0x00 0x03)');
    return await this.writeRawImmediate(killSwitch, 'KILL-SWITCH: Hardware Power-Off (0xCC 0x02 0x00 0x02)');
  }

  /**
   * Direkter Positionierungsbefehl (0x0A: 0 bis 100%)
   */
  public async moveToPosition(posPct: number): Promise<boolean> {
    const clamped = Math.max(0, Math.min(100, Math.round(posPct)));
    if (this.activeMode !== 'position') {
      await this.applyControlMode('position');
    }
    const cm = ((clamped / 100) * SERVOK_PHYSICAL_STROKE_CM).toFixed(1);
    return await this.sendCommand(0x0a, clamped, `Fahre Position: ${clamped}% (${cm} cm)`);
  }

  /**
   * Schneller, gedrosselter Positions-Streamer für Gesten-Pad & 40Hz Wave-Loops (0x0A)
   */
  public streamPosition(posPct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(posPct)));
    if (this.isSimulated) {
      this.simTargetPos = clamped;
      this.simCurrentPos = clamped;
      this.livePosition = clamped;
      if (this.activeMode !== 'position') this.activeMode = 'position';
      if (this.onPositionCallback) {
        this.onPositionCallback(clamped);
      }
      return;
    }
    if (!this.txChar) return;
    if (this.activeMode !== 'position') {
      this.applyControlMode('position');
    }
    const checksum = (0x0a + clamped) & 0xff;
    const packet = new Uint8Array([0xcc, 0x0a, clamped, checksum]);
    this.enqueueCommand(packet, `Stream Pos: ${clamped}%`, { priority: false, silent: true });
  }

  /**
   * Smoothness / Beschleunigungsprofil einstellen (0x09: 0 bis 10)
   */
  public async setSmoothness(smoothness: number): Promise<boolean> {
    const clamped = Math.max(0, Math.min(10, Math.round(smoothness)));
    return await this.sendCommand(0x09, clamped, `Smoothness / Beschleunigung: ${clamped}/10`);
  }

  /**
   * Auto-Cycle Parameter übertragen und starten mit Delta-Caching & Queue-Throttling
   */
  public async sendAutoCycleSettings(
    minDepth: number,
    maxDepth: number,
    speed: number,
    smoothness: number,
    forceAll: boolean = false
  ): Promise<boolean> {
    const minSpan = 18;
    const clampedMin = Math.max(0, Math.min(100 - minSpan, Math.round(minDepth)));
    const clampedMax = Math.max(clampedMin + minSpan, Math.min(100, Math.round(maxDepth)));
    const clampedSpeed = Math.max(0, Math.min(100, Math.round(speed)));
    const clampedSmooth = Math.max(0, Math.min(10, Math.round(smoothness)));

    if (this.activeMode !== 'auto_cycle') {
      await this.applyControlMode('auto_cycle');
    }

    if (this.isSimulated) {
      this.simMin = clampedMin;
      this.simMax = clampedMax;
      this.simSpeed = clampedSpeed;
      this.simSmoothness = clampedSmooth;
      this.activeMode = 'auto_cycle';
    }

    let changed = false;
    const currMax = this.lastAutoSettings.max !== -1 ? this.lastAutoSettings.max : 100;
    const currMin = this.lastAutoSettings.min !== -1 ? this.lastAutoSettings.min : 0;

    const sendMin = async () => {
      if (forceAll || this.lastAutoSettings.min !== clampedMin) {
        await this.sendCommand(0x07, clampedMin, `Auto Min-Depth (0x07): ${clampedMin}%`);
        this.lastAutoSettings.min = clampedMin;
        changed = true;
      }
    };

    const sendMax = async () => {
      if (forceAll || this.lastAutoSettings.max !== clampedMax) {
        await this.sendCommand(0x08, clampedMax, `Auto Max-Depth (0x08): ${clampedMax}%`);
        this.lastAutoSettings.max = clampedMax;
        changed = true;
      }
    };

    if (clampedMax > currMax) {
      await sendMax();
      await sendMin();
    } else if (clampedMin < currMin) {
      await sendMin();
      await sendMax();
    } else {
      await sendMin();
      await sendMax();
    }

    if (forceAll || this.lastAutoSettings.smoothness !== clampedSmooth) {
      await this.sendCommand(
        0x09,
        clampedSmooth,
        `Auto Smoothness (0x09): ${clampedSmooth}/10 ${clampedSmooth <= 1 ? '(Sport/Max-Speed)' : ''}`
      );
      this.lastAutoSettings.smoothness = clampedSmooth;
      changed = true;
    }

    if (forceAll || this.lastAutoSettings.speed !== clampedSpeed) {
      await this.sendCommand(0x03, clampedSpeed, `Auto Speed (0x03): ${clampedSpeed}%`);
      this.lastAutoSettings.speed = clampedSpeed;
      changed = true;
    }

    return changed;
  }

  /**
   * Auto-Cycle oder Bewegung sofort stoppen
   */
  public async stop(): Promise<boolean> {
    this.commandQueue = [];
    this.lastAutoSettings = { min: -1, max: -1, speed: -1, smoothness: -1 };
    await this.sendCommand(0x03, 0, 'Auto Speed: 0% (Halt)', true);
    await this.applyControlMode('idle');
    return true;
  }

  /**
   * Manuelle Hex-Eingabe senden
   */
  public async sendCustomHex(hexString: string): Promise<boolean> {
    try {
      const clean = hexString.trim().replace(/0x/g, '').replace(/[\s,]+/g, ' ');
      const parts = clean.split(' ').filter(Boolean);
      if (parts.length === 0) return false;
      const bytes = new Uint8Array(parts.map((p) => parseInt(p, 16)));
      return await this.writeRaw(bytes, `Benutzerdefiniertes Paket (${bytes.length} Bytes)`, true);
    } catch (e: any) {
      this.log('ERR', '', `Ungültiges Hex-Format: ${e.message}`);
      return false;
    }
  }

  private handleIncomingNotification = (event: any) => {
    const value = event.target.value;
    if (!value || value.byteLength < 3) return;
    const rawBytes = new Uint8Array(value.buffer);
    const hex = Array.from(rawBytes)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');

    const currentPositionPct = rawBytes[2];
    this.livePosition = currentPositionPct;

    if (this.onPositionCallback) {
      this.onPositionCallback(currentPositionPct);
    }

    const cm = ((currentPositionPct / 100) * SERVOK_PHYSICAL_STROKE_CM).toFixed(1);
    this.log('RX', hex, `Rückkanal Pos: ${currentPositionPct}% (${cm} cm)`);
  };

  /**
   * Bindet ein extern verbundenes Web-Bluetooth-Gerät & Characteristic an
   */
  public attachDevice(device: any, txChar: any, rxChar: any = null) {
    this.device = device;
    this.txChar = txChar;
    this.rxChar = rxChar;
    this.deviceName = device?.name || 'Hismith Servok';
    this.status = 'connected';
    this.activeMode = 'idle'; // Reset initial mode so first applyControlMode will properly send mode packet
    this.lastAutoSettings = { min: -1, max: -1, speed: -1, smoothness: -1 };
    this.isSimulated = false;
    this.manualDisconnectRequested = false;
    this.rssiDbm = -52;
    this.lastTxLatencyMs = 6;
    if (this.onStatusCallback) {
      this.onStatusCallback('connected');
    }
    this.log('INFO', '', `Hardware-Kanal gekoppelt an ${this.deviceName}`);
  }

  /**
   * Virtueller Hardware-Simulator starten
   */
  public startSimulation() {
    this.disconnect();
    this.isSimulated = true;
    this.status = 'connected';
    this.deviceName = 'Servok H2 (Virtuelle Hardware)';
    this.rssiDbm = -46;
    this.lastTxLatencyMs = 3;
    this.simCurrentPos = 0;
    this.simTargetPos = 0;
    this.simSpeed = 35;
    this.simSmoothness = 5;
    this.simMin = 10;
    this.simMax = 85;
    this.livePosition = 0;
    this.lastSimTick = performance.now();

    this.log('SIM', 'CC 01 A1 A2', 'Virtueller Servok H2 initialisiert. Physikalischer Hub: 0-168mm aktiv.');
    if (this.onStatusCallback) {
      this.onStatusCallback('connected');
    }
    if (this.onPositionCallback) {
      this.onPositionCallback(0);
    }

    const runSimLoop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastSimTick) / 1000);
      this.lastSimTick = now;

      if (this.activeMode === 'auto_cycle' && this.simSpeed > 0) {
        const smoothnessBoost = 1.0 + (10 - this.simSmoothness) * 0.04;
        const speedFactor = (this.simSpeed / 100) * 320 * smoothnessBoost; // mm/s
        const speedPctPerSec = (speedFactor / SERVOK_PHYSICAL_STROKE_MM) * 100;

        this.simCurrentPos += this.simAutoDirection * speedPctPerSec * dt;
        if (this.simCurrentPos >= this.simMax) {
          this.simCurrentPos = this.simMax;
          this.simAutoDirection = -1;
        } else if (this.simCurrentPos <= this.simMin) {
          this.simCurrentPos = this.simMin;
          this.simAutoDirection = 1;
        }
      } else {
        const diff = this.simTargetPos - this.simCurrentPos;
        if (Math.abs(diff) > 0.1) {
          const moveSpeed = 460 * (1.25 - this.simSmoothness / 12);
          const step = Math.sign(diff) * Math.min(Math.abs(diff), moveSpeed * dt);
          this.simCurrentPos += step;
        }
      }

      const rounded = Math.round(Math.max(0, Math.min(100, this.simCurrentPos)));
      this.livePosition = rounded;
      if (this.onPositionCallback) {
        this.onPositionCallback(rounded);
      }

      this.simAnimFrame = requestAnimationFrame(runSimLoop);
    };

    this.simAnimFrame = requestAnimationFrame(runSimLoop);
  }

  /**
   * Automatisches Graceful Reconnect bei unerwartetem Signalverlust
   */
  private async handleUnexpectedDisconnect() {
    if (this.manualDisconnectRequested || this.isSimulated || !this.device) {
      this.cleanupDisconnectedState();
      return;
    }

    this.isReconnecting = true;
    const backoffDelays = [600, 1400, 2800, 5000];

    for (let attempt = 0; attempt < backoffDelays.length; attempt++) {
      if (this.manualDisconnectRequested || !this.device) break;
      this.reconnectAttempts = attempt + 1;
      this.status = 'connecting';
      if (this.onStatusCallback) {
        this.onStatusCallback('connecting');
      }
      this.log('INFO', '', `Graceful Reconnect Versuch ${this.reconnectAttempts}/${backoffDelays.length}...`);

      await new Promise((r) => setTimeout(r, backoffDelays[attempt]));

      try {
        if (!this.device) break;
        const ok = await this.establishGattSession(this.device);
        if (ok) {
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          this.log('INFO', '', '✓ Graceful Reconnect erfolgreich! GATT-Session wiederhergestellt.');
          return;
        }
      } catch {
        // Nächster Backoff-Versuch
      }
    }

    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.cleanupDisconnectedState();
  }

  private cleanupDisconnectedState() {
    if (this.simAnimFrame) {
      cancelAnimationFrame(this.simAnimFrame);
      this.simAnimFrame = null;
    }
    if (this.rssiTimer) {
      clearInterval(this.rssiTimer);
      this.rssiTimer = null;
    }
    this.isSimulated = false;
    this.txChar = null;
    this.rxChar = null;
    this.status = 'disconnected';
    this.deviceName = 'Nicht verbunden';
    this.livePosition = null;
    this.commandQueue = [];
    this.lastAutoSettings = { min: -1, max: -1, speed: -1, smoothness: -1 };

    this.log('INFO', '', 'Verbindung zum Servok getrennt.');
    if (this.onStatusCallback) {
      this.onStatusCallback('disconnected');
    }
  }

  public disconnect() {
    this.manualDisconnectRequested = true;
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.cleanupDisconnectedState();
  }

  private async establishGattSession(device: any): Promise<boolean> {
    const server = await device.gatt.connect();
    this.log('INFO', '', 'GATT-Server verbunden. Suche Primärservice 0xffe5...');

    let targetService: any = null;
    try {
      targetService = await server.getPrimaryService('0000ffe5-0000-1000-8000-00805f9b34fb');
    } catch {
      this.log('INFO', '', 'Service 0xffe5 nicht direkt auffindbar, versuche Scan aller Services...');
      const services = await server.getPrimaryServices();
      targetService = services.find((s: any) => s.uuid.includes('ffe5') || s.uuid.includes('fff0')) || services[0];
    }

    if (!targetService) {
      throw new Error('Kein passender Hismith GATT-Service auf dem Gerät gefunden.');
    }

    try {
      this.txChar = await targetService.getCharacteristic('0000ffe9-0000-1000-8000-00805f9b34fb');
    } catch {
      const chars = await targetService.getCharacteristics();
      this.txChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
    }

    if (!this.txChar) {
      throw new Error('TX-Schreibkanal (0xFFE9) konnte nicht initialisiert werden.');
    }

    try {
      this.rxChar = await targetService.getCharacteristic('0000ffe4-0000-1000-8000-00805f9b34fb');
      await this.rxChar.startNotifications();
      this.rxChar.addEventListener('characteristicvaluechanged', this.handleIncomingNotification);
      this.log('INFO', '', 'Live-Telemetrie auf RX 0xFFE4 aktiv.');
    } catch {
      this.log('INFO', '', 'Positions-Feedback Kanal 0xFFE4 optional/nicht verfügbar.');
    }

    // Optional: Web Bluetooth watchAdvertisements für echte RSSI-Messung falls unterstützt
    if (typeof device.watchAdvertisements === 'function') {
      try {
        device.addEventListener('advertisementreceived', (event: any) => {
          if (typeof event.rssi === 'number') {
            this.rssiDbm = event.rssi;
            if (this.onTelemetryCallback) {
              this.onTelemetryCallback(this.rssiDbm, this.lastTxLatencyMs, this.commandQueue.length);
            }
          }
        });
        device.watchAdvertisements().catch(() => {});
      } catch {}
    }

    this.status = 'connected';
    this.rssiDbm = -52;
    if (this.onStatusCallback) {
      this.onStatusCallback('connected');
    }

    await this.applyControlMode(this.activeMode || 'position');
    await this.setSmoothness(5);
    return true;
  }

  public async connect(useBroadScan: boolean = false): Promise<boolean> {
    this.manualDisconnectRequested = false;
    this.status = 'connecting';
    if (this.onStatusCallback) this.onStatusCallback('connecting');
    this.log('INFO', '', `Starte BLE-Suche (${useBroadScan ? 'Universeller Scan' : 'Gezielter Servok-Filter'})...`);

    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      const msg = 'Web Bluetooth wird in dieser Umgebung nicht unterstützt. Nutze den Hardware-Simulator oder Google Chrome / Edge mit HTTPS.';
      this.status = 'error';
      this.log('ERR', '', msg);
      if (this.onStatusCallback) this.onStatusCallback('error', msg);
      return false;
    }

    try {
      const options: any = useBroadScan
        ? {
            acceptAllDevices: true,
            optionalServices: [
              '0000ffe5-0000-1000-8000-00805f9b34fb',
              '0000fff0-0000-1000-8000-00805f9b34fb',
              '0000ffe0-0000-1000-8000-00805f9b34fb',
              '0000ffe4-0000-1000-8000-00805f9b34fb',
            ],
          }
        : {
            filters: [
              { services: ['0000ffe5-0000-1000-8000-00805f9b34fb'] },
              { namePrefix: 'Hismith' },
              { namePrefix: 'HISMITH' },
              { namePrefix: 'Servok' },
              { namePrefix: 'SERVOK' },
              { namePrefix: 'S2' },
              { namePrefix: 'H2' },
              { namePrefix: 'HS-' },
            ],
            optionalServices: [
              '0000ffe5-0000-1000-8000-00805f9b34fb',
              '0000fff0-0000-1000-8000-00805f9b34fb',
              '0000ffe0-0000-1000-8000-00805f9b34fb',
              '0000ffe4-0000-1000-8000-00805f9b34fb',
            ],
          };

      const device = await (navigator as any).bluetooth.requestDevice(options);

      this.device = device;
      this.deviceName = device.name || 'Hismith Servok H2';
      this.log('INFO', '', `Gerät autorisiert: ${this.deviceName}. Verbinde mit GATT-Server...`);

      device.addEventListener('gattserverdisconnected', () => {
        this.handleUnexpectedDisconnect();
      });

      return await this.establishGattSession(device);
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        this.log('INFO', '', 'Bluetooth-Auswahldialog abgebrochen.');
        this.status = 'disconnected';
        if (this.onStatusCallback) this.onStatusCallback('disconnected');
      } else {
        this.status = 'error';
        const msg = err.message || 'Verbindungsfehler aufgetreten.';
        this.log('ERR', '', `BLE Verbindungsfehler: ${msg}`);
        if (this.onStatusCallback) this.onStatusCallback('error', msg);
      }
      return false;
    }
  }

  /**
   * Automatischer Verbindungsaufbau zu zuvor gekoppelten/autorisierten Web Bluetooth Geräten
   */
  public async attemptAutoReconnect(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) return false;
    try {
      if (typeof (navigator as any).bluetooth.getDevices === 'function') {
        const devices = await (navigator as any).bluetooth.getDevices();
        if (devices && devices.length > 0) {
          const hismithDev =
            devices.find(
              (d: any) =>
                d.name?.toLowerCase().includes('hismith') ||
                d.name?.toLowerCase().includes('servok') ||
                d.name?.toLowerCase().includes('s2') ||
                d.name?.toLowerCase().includes('h2')
            ) || devices[0];

          if (hismithDev) {
            this.manualDisconnectRequested = false;
            this.device = hismithDev;
            this.deviceName = hismithDev.name || 'Hismith Servok H2';
            this.status = 'connecting';
            if (this.onStatusCallback) this.onStatusCallback('connecting');
            this.log('INFO', '', `Auto-Connect: Bekanntes Gerät gefunden (${this.deviceName}). Verbinde...`);
            hismithDev.addEventListener('gattserverdisconnected', () => {
              this.handleUnexpectedDisconnect();
            });
            return await this.establishGattSession(hismithDev);
          }
        }
      }
    } catch (err: any) {
      console.warn('Auto-reconnect notice:', err);
    }
    return false;
  }

  public getRssi(): number {
    return this.rssiDbm;
  }

  public onRssiChange(cb: (rssi: number) => void): () => void {
    const interval = setInterval(() => {
      cb(this.rssiDbm);
    }, 1000);
    cb(this.rssiDbm);
    return () => clearInterval(interval);
  }

  public async setSpeed(speedPct: number) {
    if (!this.connected) return;
    const clamped = Math.max(0, Math.min(100, Math.round(speedPct)));
    await this.sendCommand(0x03, clamped, `2D Pad Speed -> ${clamped}%`);
  }

  public async setStroke(minPct: number, maxPct: number) {
    if (!this.connected) return;
    const clampedMin = Math.max(0, Math.min(90, Math.round(minPct)));
    const clampedMax = Math.max(clampedMin + 10, Math.min(100, Math.round(maxPct)));
    await this.sendCommand(0x07, clampedMin, `2D Pad MinDepth -> ${clampedMin}%`);
    await this.sendCommand(0x08, clampedMax, `2D Pad MaxDepth -> ${clampedMax}%`);
  }
}

export const servokBle = new ServokBleService();
