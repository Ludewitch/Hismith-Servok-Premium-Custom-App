import express from "express";
import path from "path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { exec } from "node:child_process";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const SETTINGS_FILE = path.join(process.cwd(), "servok-settings.json");

app.use(express.json());

// API health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", device: "Hismith Servok Premium H2" });
});

// Settings API (reads and writes local servok-settings.json)
app.get("/api/settings", async (_req, res) => {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const data = await fs.readFile(SETTINGS_FILE, "utf-8");
      return res.json({ status: "ok", settings: JSON.parse(data) });
    }
    return res.json({ status: "not_found", settings: null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const settings = req.body;
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return res.json({ status: "saved", settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Desktop Shortcut Creation API (for local Windows execution)
app.post("/api/create-desktop-shortcut", (_req, res) => {
  if (process.platform !== "win32") {
    return res.json({
      status: "unsupported",
      message: "Automatische Desktop-Verknüpfung wird auf diesem Betriebssystem nicht direkt unterstützt. Bitte verwende start_mac_linux.sh.",
    });
  }

  const workingDir = process.cwd();
  const targetBat = path.join(workingDir, "start_windows.bat");
  const shortcutName = "Hismith Servok Premium Studio.lnk";

  // PowerShell Shortcut Creation: Points directly to start_windows.bat with working directory set
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $shortcutPath = [System.IO.Path]::Combine($desktop, '${shortcutName}'); $s = $ws.CreateShortcut($shortcutPath); $s.TargetPath = '${targetBat.replace(/'/g, "''")}'; $s.WorkingDirectory = '${workingDir.replace(/'/g, "''")}'; $s.WindowStyle = 1; $s.IconLocation = '%SystemRoot%\\\\System32\\\\shell32.dll,14'; $s.Description = 'Startet Hismith Servok Premium Studio und oeffnet Standard-Browser'; $s.Save()"`;

  exec(psCmd, (err, _stdout, stderr) => {
    if (err) {
      console.error("Fehler beim Erstellen der Verknüpfung:", err, stderr);
      return res.status(500).json({ status: "error", error: err.message });
    }
    return res.json({
      status: "ok",
      message: `Die Verknüpfung "${shortcutName}" wurde erfolgreich auf deinem Windows-Desktop angelegt!`,
    });
  });
});

// Download Launcher Files directly from browser
app.get("/api/download/:filename", (req, res) => {
  const allowed = [
    "start_windows.bat",
    "Desktop_Verknuepfung_erstellen.bat",
    "Hismith_Servok_Studio.bat",
    "start_mac_linux.sh",
    "Hismith_Servok_Studio.url",
  ];
  const file = req.params.filename;
  if (!allowed.includes(file)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const filePath = path.join(process.cwd(), file);
  return res.download(filePath, file);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
