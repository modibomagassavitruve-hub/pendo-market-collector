#!/bin/bash
# Installe le collecteur PENDO sur ce Mac : collecte toutes les 15 min (jours de bourse)
# les indices que les serveurs cloud ne peuvent pas atteindre (AFX, Investing.com).
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$HOME/.pendo-collector.env"
PLIST="$HOME/Library/LaunchAgents/com.pendo.market-collector.plist"
LOG="$HOME/Library/Logs/pendo-collector.log"

NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  # nvm : charger la version par défaut
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" && NODE="$(command -v node || true)"
fi
if [ -z "$NODE" ]; then echo "❌ Node.js introuvable. Installe-le (https://nodejs.org) puis relance."; exit 1; fi
echo "✓ Node : $NODE ($("$NODE" -v))"

echo; echo "▶ Test de collecte depuis ce Mac (rien n'est envoyé) :"
"$NODE" "$DIR/collect.mjs" --dry-run || true

if [ ! -f "$ENV_FILE" ]; then
  echo
  echo "Colle le secret PENDO (Supabase → Integrations → Vault → pendo_cron_secret), puis Entrée."
  echo "(il ne s'affichera pas à l'écran)"
  read -rs SECRET; echo
  [ -z "$SECRET" ] && { echo "❌ Secret vide, installation annulée."; exit 1; }
  umask 077
  printf 'PENDO_CRON_SECRET=%s\n' "$SECRET" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "✓ Secret enregistré dans $ENV_FILE (lisible par toi seul)"
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.pendo.market-collector</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$DIR/mac/run.sh</string><string>$NODE</string></array>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
PL
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo; echo "✅ Installé : collecte toutes les 15 min (lun-ven, 7h-17h UTC + clôture 20h UTC)."
echo "   Journal : $LOG"
echo "   Désinstaller : bash \"$DIR/mac/uninstall.sh\""
