#!/bin/sh
set -e

echo ">>> Prisma migration çalıştırılıyor..."
node ./node_modules/prisma/build/index.js migrate deploy

echo ">>> Seed çalıştırılıyor..."
node ./node_modules/prisma/build/index.js db seed || echo "Seed atlandı (zaten mevcut olabilir)."

echo ">>> Uygulama başlatılıyor..."
exec node server.js
