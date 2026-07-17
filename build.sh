#!/bin/bash
set -e

echo "=== Installation des dépendances Python ==="
pip install -r backend/requirements.txt

echo "=== Build du frontend React ==="
cd frontend
npm install
node node_modules/vite/bin/vite.js build
cd ..

echo "=== Build terminé ==="