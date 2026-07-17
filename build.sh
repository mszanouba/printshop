#!/bin/bash
set -e

echo "=== Installation des dépendances Python ==="
pip install -r backend/requirements.txt

echo "=== Build du frontend React ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Build terminé ==="
