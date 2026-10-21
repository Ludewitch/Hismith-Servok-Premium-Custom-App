# Technische Dokumentation & Workflow: Smoothness im Graphen & BLE-Hardwareübertragung

Detaillierte Analyse und Architekturübersicht darüber, wie die Smoothness (Geschmeidigkeit / Motorumkehrrampe) mathematisch im interaktiven Graphen abgebildet, im 25ms-Playback-Loop berechnet und über das Hismith/Servok-BLE-Register `0x09` an die Maschine übertragen wird.

---

### User Review & Bestätigte Anforderungen

> [!IMPORTANT]
> **Bestätigte Entscheidungen aus der Spezifikationsabfrage:**
> - **Fokus:** Umfassende technische Erklärung des aktuellen Workflows, der Signal-Pipeline und des BLE-Protokolls.
> - **Wirkungsebene:** Direkte Steuerung der Hardware-Motorrampe der Maschine (BLE-Register `0x09`) in Abgrenzung zur mathematischen Kurvenform der 4. Graph-Ebene (Stoß-Härte).

---

## 1. Übersicht & Kernkonzept

In der Servok/Hismith-Mechatronik existieren **zwei voneinander getrennte, aber synergetisch wirkende Smoothness-Mechanismen**:

1. **Mathematische Kurvenform (Software-Ebene im Graphen - 4. Spur, Bernsteinfarben):**
   * Definiert die Stoß-Härte bzw. Wellenformcharakteristik (0–100%).
   * Moduliert den Übergang zwischen Dreieckswelle (lineare Hubfahrt = 0%), Sinusoid (harmonisch) und Rechteckflanke mit steilem Anstieg (harte Stöße = 100%).
2. **Physikalische Motor-Beschleunigungsrampe (Hardware-Ebene via BLE `0x09`):**
   * Bestimmt, wie hart oder gedämpft der bürstenlose Servomotor an den physischen Totpunkten (Min-Tiefe `0x07` und Max-Tiefe `0x08`) abbremst und die Drehrichtung umkehrt.
   * Wertebereich der Firmware: `0` (Sport / Sofortige Umkehr ohne Bremsrampe für höchste SPM-Kadenzen) bis `10` (Sanft / Ausgeprägte S-Kurven-Bremsrampe).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DOPPELSTUFIGE SMOOTHNESS-PIPELINE                    │
└────────────────────────────────────────────────────────────────────────┘

    [Graph-Ebene 4: Härte]            [Hardware-Rampe (0x09)]
    Wegpunkte: 0 - 100 %              Registerwert: 0 - 10
            │                                  │
            ▼                                  ▼
    ┌────────────────┐                ┌────────────────┐
    │  Mathematische │                │ Physische      │
    │  Wellenform    │                │ Motor-Rampe    │
    │  (Flankenzeit) │                │ (Gegenstrom-   │
    └───────┬────────┘                │  Bremsung)     │
            │                         └───────┬────────┘
            ▼                                 ▼
   Virtuelle Position (0-100%)       Hardware-Umkehrdynamik
```

---

## 2. Der Signalweg: Vom Graphen bis zur Motorachse

### 2.1 Abtastung und Interpolation im Playback-Loop

Die Webanwendung verfügt über eine hochpräzise Playback-Engine, die an `requestAnimationFrame` und Zeitstempel gebunden ist:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            SIGNAL-ABTASTUNG                                  │
└──────────────────────────────────────────────────────────────────────────────┘

 Graph Waypoints          Interpolations-Engine             40-Hz-Limiter
┌──────────────┐         ┌─────────────────────────┐       ┌─────────────────┐
│ Min-Depth    │────────▶│ getInterpolatedVal(...) │──────▶│ valMin (0x07)   │
├──────────────┤         ├─────────────────────────┤       ├─────────────────┤
│ Max-Depth    │────────▶│ getInterpolatedVal(...) │──────▶│ valMax (0x08)   │
├──────────────┤         ├─────────────────────────┤       ├─────────────────┤
│ Kadenz (SPM) │────────▶│ getSpmAtTime(...)       │──────▶│ valSpm (0x03)   │
├──────────────┤         ├─────────────────────────┤       ├─────────────────┤
│ Härte/Smooth │────────▶│ Flanken- & Rampen-Calc  │──────▶│ smooth (0x09)   │
└──────────────┘         └─────────────────────────┘       └────────┬────────┘
                                                                    │
                                                                    ▼
                                                            BLE-Delta-Cache
```

1. **Abtastung (Sampling):** Alle ~25 Millisekunden (40 Hz Drosselung zur Vermeidung von Bluetooth-Pufferüberläufen) wird der momentane Zeitpunkt `playbackTime` ausgewertet.
2. **Spline-/Linear-Interpolation:** `getInterpolatedVal(waypoints, time)` errechnet zwischen den Stützpunkten des Graphen den exakten Zwischenwert.
3. **Flankensteilheits-Berechnung (Soft-vs-Hard):**
   $$\alpha = \pi \cdot (1 - 0.98 \cdot \text{hardnessFactor})$$
   * Bei hoher Härte/niedriger Software-Smoothness schrumpft das Übergangsintervall $\alpha$ auf $2\%$ der Periode (schlagartiger Stoß).
   * Bei hoher Smoothness dehnt sich $\alpha$ auf die gesamte Halbperiode aus (weicher, sinusförmiger oder dreieckiger Gleitzyklus).

---

## 3. Das BLE-Übertragungsprotokoll (Hismith / Servok S2)

### 3.1 Paketstruktur des Universal Smart-Protokolls

Jedes Steuerpaket besteht aus einem 4-Byte-Frame mit zyklischer Kontrollsumme:

| Byte Index | Bezeichnung | Hex-Wert / Bereich | Funktion |
|---|---|---|---|
| Byte 0 | Header | `0xCC` | Servok-Synchronisations-Präfix |
| Byte 1 | Command / Register | `0x09` (Smoothness) | Adressiert das Motorrampen-Register |
| Byte 2 | Parameterwert | `0x00` bis `0x0A` (0–10) | Eingestellte Rampen-Stufe |
| Byte 3 | Checksumme (CRC) | `(CMD + VAL) & 0xFF` | 8-Bit-Quersumme zur Datenintegrität |

#### Konkrete Byte-Beispiele für Register 0x09:
* **Sport / Direkt (0):** `CC 09 00 09` $\rightarrow (0x09 + 0x00) = 0x09$
* **Dynamisch (2):** `CC 09 02 0B` $\rightarrow (0x09 + 0x02) = 0x0B$
* **Ausgewogen (5):** `CC 09 05 0E` $\rightarrow (0x09 + 0x05) = 0x0E$
* **Ultra-Sanft (10):** `CC 09 0A 13` $\rightarrow (0x09 + 0x0A) = 0x13$

---

### 3.2 Delta-Caching & Firmware-Bypass-Algorithmus

Damit der Bluetooth-Stack nicht mit redundanten Paketen überflutet wird, arbeitet die App mit einem **State-Register-Cache (`lastSmartStateRef`)**:

```
                              Neuer Smoothness-Wert
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ Ist Wert != lastState.smooth? │
                      └──────────────┬────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                    JA                              NEIN
                     │                               │
                     ▼                               ▼
       ┌───────────────────────────┐         ┌───────────────┐
       │ Paket assemblieren:       │         │ Write ver-    │
       │ [0xCC, 0x09, Val, Check]  │         │ werfen (0ms   │
       └─────────────┬─────────────┘         │ Latenz-Gewinn)│
                     │                       └───────────────┘
                     ▼
       ┌───────────────────────────┐
       │ BLE Write Characteristic  │
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │ lastState.smooth = Val    │
       │ + 10ms Inter-Packet Sleep │
       └───────────────────────────┘
```

> [!NOTE]
> **Inter-Packet Intervall (10 ms):** Um Paketkollisionen zwischen Min-Tiefe (`0x07`), Max-Tiefe (`0x08`), Smoothness (`0x09`) und Drehzahl (`0x03`) zu verhindern, wartet der Übertragungstreiber nach jedem Paket exakt 10 Millisekunden, bevor der nächste Frame gesendet wird.

---

## 4. Hardware-Verhalten der Maschine bei Register 0x09

Wenn das Paket `[0xCC, 0x09, clampedSmooth, checksum]` beim BLE-Controller (Nordic nRF52 / ESP32 der Maschine) eintrifft, reagiert die Motorsteuerung wie folgt:

```
Geschwindigkeit (v)
 ▲
 │         Sport (Wert = 0)                   Sanft (Wert = 8-10)
 │       ┌──────────────────┐               .  - - - - -  .
 │      ││                  ││            .                 .
 │      ││                  ││          .                     .
─┼──────┴┴──────────────────┴┴─────────.───────────────────────.────▶ Zeit (t)
 │      Totpunkt            Totpunkt   Totpunkt                Totpunkt
 │      (Rechteckige Umkehr)           (S-Kurven-Beschleunigung)
```

1. **Stufe 0 (Sport / Instant):**
   * Der Motor bremst maximal abrupt vor Erreichen der Schranke ab und beschleunigt sofort mit vollem Drehmoment in Gegenrichtung.
   * *Vorteil:* Erreicht maximale Frequenzen von bis zu 240+ SPM ohne Hubverlust.
   * *Nachteil:* Höhere mechanische Belastung und markantere Stöße im Gestell.
2. **Stufe 2–3 (Dynamisch / Standard):**
   * Kurze Bremsrampe (~30–50 ms), die den Motor schont, aber eine knackige Umkehr beibehält.
3. **Stufe 8–10 (Sanft / Soft-Motion):**
   * Weiches Abbremsen mit progressiver S-Kurve vor beiden Totpunkten.
   * *Ergebnis:* Völlig lautloser, fließender Richtungswandel; bei sehr hohen Kadenzen (>180 SPM) verkleinert sich der effektive Hub leicht, da die Rampe mehr Wegzeit beansprucht.

---

## 5. Zusammenfassung des Datenflusses

| Station | Komponente / Code-Stelle | Repräsentierte Daten |
|---|---|---|
| **1. UI & Timeline** | `GraphEditorView.tsx` / `Track 4` | Stützpunkte & Kurvenverlauf (0–100%) |
| **2. Controller-State** | `App.tsx` (`hardwareSmoothness`) | Aktive Rampenstufe (0–10) |
| **3. Interpolation** | `getInterpolatedVal()` @ 40 Hz | Zeitkontinuierlicher Flankenwert |
| **4. Treiber-Cache** | `lastSmartStateRef.current` | Erkennung von Zustandsänderungen |
| **5. Paket-Assembler** | `servokBle.ts` (`sendCommand`) | Frame: `[0xCC, 0x09, Val, (0x09+Val)&0xFF]` |
| **6. Physische Übertragung**| Web Bluetooth API GATT TX | Low-Energy RF an Servok RX Characteristic |
| **7. Mechatronik** | Firmware BLDC-Treiber | PID-Regelung der Motor-Bremsflanke |
