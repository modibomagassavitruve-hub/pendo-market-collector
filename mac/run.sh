#!/bin/bash
# Lancé par launchd toutes les 15 min ; ne collecte qu'aux heures de bourse (UTC).
NODE="$1"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOW=$(date -u +%u); H=$(date -u +%H); M=$(date -u +%M)
H=$((10#$H)); M=$((10#$M))
if [ "$DOW" -gt 5 ]; then exit 0; fi
if ! { [ "$H" -ge 7 ] && [ "$H" -le 17 ]; } && ! { [ "$H" -eq 20 ] && [ "$M" -lt 15 ]; }; then exit 0; fi
set -a; . "$HOME/.pendo-collector.env"; set +a
# BRVM, NGX et MASI sont déjà collectés par GitHub Actions
export PENDO_SKIP="${PENDO_SKIP:-brvm,nse_ng,masi}"
echo "── $(date -u '+%Y-%m-%d %H:%M UTC')"
"$NODE" "$DIR/collect.mjs"
