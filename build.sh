#!/usr/bin/env bash
# Pasos de construcción para el hosting (Render, Railway, etc.).
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
