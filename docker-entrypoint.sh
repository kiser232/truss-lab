#!/bin/sh
set -eu
mkdir -p /app/data/uploads
if [ ! -f /app/data/board.json ]; then
  cp /app/seed/board.json /app/data/board.json
fi
exec npm run start -- -H 0.0.0.0 -p "${PORT:-43123}"
