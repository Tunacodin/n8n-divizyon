#!/bin/bash

# n8n Otomatik Backup Sistemi
# Cron ile günlük çalıştırılmalı: 0 2 * * * /path/to/n8n_backup_system.sh

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0YjZkZGQzOS05ODgxLTQwODctOWQxYS0zNTBmY2U4NTdhNWYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWY1OGRmNDAtMWQ3ZC00NzAyLTllYjktN2Q0NWMxOTBhZTJlIiwiaWF0IjoxNzcyMjM4ODEyLCJleHAiOjE3NzQ3NTY4MDB9.Hl-lBAyNXFzJKVv-w8vUCjWRodBewPW-5FXVCzOJedc"
BASE_URL="https://83ohvlw5.rpcld.net"
BACKUP_DIR="/Users/tuna/Desktop/n8n-circle/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🔄 n8n Backup başlıyor - $DATE"

# Backup klasörü oluştur
mkdir -p "$BACKUP_DIR/$DATE"

# Tüm workflow'ları çek
curl -X GET "$BASE_URL/api/v1/workflows" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -o "$BACKUP_DIR/$DATE/all_workflows.json"

# Her workflow'u ayrı ayrı kaydet
python3 << 'PYTHON'
import json
import sys
import os

date = os.environ['DATE']
backup_dir = os.environ['BACKUP_DIR']

with open(f'{backup_dir}/{date}/all_workflows.json') as f:
    data = json.load(f)

for wf in data['data']:
    filename = f"{backup_dir}/{date}/workflow_{wf['id']}_{wf['name'].replace('/', '_')}.json"
    with open(filename, 'w') as out:
        json.dump(wf, out, indent=2)
    print(f"✅ Backed up: {wf['name']}")

print(f"\n📊 Toplam {len(data['data'])} workflow yedeklendi")
PYTHON

# Eski backup'ları temizle (30 gün üzerindekiler)
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} + 2>/dev/null

# Git'e commit (opsiyonel)
cd "$BACKUP_DIR"
git add .
git commit -m "Backup - $DATE" 2>/dev/null
git push 2>/dev/null

echo "✅ Backup tamamlandı: $BACKUP_DIR/$DATE"
