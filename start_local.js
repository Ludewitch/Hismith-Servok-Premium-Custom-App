#!/usr/bin/env node

/**
 * Cross-Platform Node.js Launcher for Hismith Servok Premium Studio
 * Usage: node start_local.js
 */

import { spawn, exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('===============================================================================');
console.log('  HISMITH SERVOK PREMIUM H2 — OBSIDIAN KINETIC COCKPIT');
console.log('  Lokaler Start via Node.js');
console.log('===============================================================================');

// Check node_modules
if (!existsSync(resolve(__dirname, 'node_modules'))) {
  console.log('\n[1/2] Installiere Abhängigkeiten (npm install)...');
  const install = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], {
    stdio: 'inherit',
    cwd: __dirname,
  });
  install.on('close', (code) => {
    if (code !== 0) {
      console.error('[FEHLER] npm install ist fehlgeschlagen mit Exit-Code:', code);
      process.exit(code);
    }
    runServer();
  });
} else {
  runServer();
}

function runServer() {
  console.log('\n[2/2] Starte lokalen Server auf http://localhost:3000...');
  
  const devProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: __dirname,
  });

  // Open default browser after 2.5 seconds
  setTimeout(() => {
    const url = 'http://localhost:3000';
    console.log(`\nÖffne Standard-Browser: ${url}`);
    
    if (process.platform === 'win32') {
      exec(`powershell -NoProfile -Command "Start-Process '${url}'"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  }, 2500);

  devProcess.on('error', (err) => {
    console.error('[FEHLER] Konnte Server nicht starten:', err);
  });
}
