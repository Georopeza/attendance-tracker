#!/usr/bin/env bash
# Regenera static/css/app.css después de cambiar clases en las plantillas.
set -o errexit
cd "$(dirname "$0")/.."
npx --yes tailwindcss@3.4.17 -c frontend/tailwind.config.js -i frontend/entrada.css -o static/css/app.css --minify
