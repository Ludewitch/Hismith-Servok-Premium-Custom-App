#!/usr/bin/env bash

# Ins Verzeichnis des Skripts wechseln
cd "$(dirname "$0")"

echo "==================================================="
echo "  Actuator Motion Editor Studio wird gestartet..."
echo "==================================================="

# Pruefen, ob node_modules existieren
if [ ! -d "node_modules" ]; then
    echo "Installiere Pakete (npm install)..."
    npm install
fi

# Server starten
echo "Starte lokalen Server..."
npm run dev &
SERVER_PID=$!

# Kurz warten, bis der Port bereit ist
sleep 2

# Im Browser oeffnen (Mac: open, Linux: xdg-open)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000"
else
    xdg-open "http://localhost:3000" 2>/dev/null || open "http://localhost:3000" 2>/dev/null
fi

wait $SERVER_PID
