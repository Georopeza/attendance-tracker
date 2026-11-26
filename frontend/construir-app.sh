#!/usr/bin/env bash
# Regenera app/css/app.css después de cambiar clases en app/js o app/index.html.
set -o errexit
cd "$(dirname "$0")/.."
npx --yes tailwindcss@3.4.17 -c frontend/tailwind.app.config.js -i frontend/entrada.css -o app/css/app.css --minify
