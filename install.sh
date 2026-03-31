#!/bin/bash
echo "=== Reparatur-System Installation ==="

sudo apt update
sudo apt install -y nodejs npm

mkdir -p reparatur-system/public
cp server.js reparatur-system/
cp public/index.html reparatur-system/public/

cd reparatur-system
npm init -y
npm install express sqlite3 body-parser

echo "Installation abgeschlossen!"
echo "Starte Server mit: node server.js"
