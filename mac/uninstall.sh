#!/bin/bash
PLIST="$HOME/Library/LaunchAgents/com.pendo.market-collector.plist"
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "✅ Collecteur désinstallé. (Le secret reste dans ~/.pendo-collector.env : supprime-le si besoin.)"
