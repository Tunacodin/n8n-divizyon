# 🚀 Circle Dashboard - API Kullanım Rehberi

Artık **3 farklı yöntemle** sistemi kontrol edebilirsiniz!

---

## 📡 1. Dashboard API (Next.js Routes)

Dashboard'un kendi REST API'si:

### Sheet Verileri

```bash
# Kontrol sheet
GET http://localhost:3000/api/sheets/kontrol

# Başvuru Formu
GET http://localhost:3000/api/sheets/basvuru-formu

# 18 Yaşından Küçük
GET http://localhost:3000/api/sheets/18-yasından-kucuk

# Kesin Ret
GET http://localhost:3000/api/sheets/kesin-ret

# Timeline (tüm veriler birleştirilmiş)
GET http://localhost:3000/api/sheets/timeline

# Dashboard istatistikleri
GET http://localhost:3000/api/sheets/stats
```

**Response örneği:**
```json
{
  "success": true,
  "count": 42,
  "data": [
    {
      "Adın Soyadın": "John Doe",
      "E-Posta Adresin": "john@example.com",
      "Timestamp": "2024-01-01 12:00:00"
    }
  ]
}
```

### n8n Yönetimi

```bash
# Tüm workflow'ları listele
GET http://localhost:3000/api/n8n/workflows

# Workflow execution'ları görüntüle
GET http://localhost:3000/api/n8n/executions

# Belirli bir workflow'un execution'ları
GET http://localhost:3000/api/n8n/executions?workflowId=123&limit=10
```

---

## 🔧 2. n8n REST API (Direkt)

n8n'i direkt yönetmek için:

```bash
# API Key
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
BASE_URL="https://83ohvlw5.rpcld.net"

# Tüm workflow'ları listele
curl -X GET "$BASE_URL/api/v1/workflows" \
  -H "X-N8N-API-KEY: $API_KEY"

# Belirli bir workflow'u getir
curl -X GET "$BASE_URL/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $API_KEY"

# Workflow'u manuel çalıştır
curl -X POST "$BASE_URL/api/v1/workflows/WORKFLOW_ID/execute" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Son execution'ları görüntüle
curl -X GET "$BASE_URL/api/v1/executions?limit=20" \
  -H "X-N8N-API-KEY: $API_KEY"

# Belirli bir execution'ı getir
curl -X GET "$BASE_URL/api/v1/executions/EXECUTION_ID" \
  -H "X-N8N-API-KEY: $API_KEY"
```

---

## 🌐 3. n8n Webhook'lar (Veri Çekme)

Google Sheets verilerini direkt webhook'lardan çekmek için:

```bash
# Kontrol
curl https://83ohvlw5.rpcld.net/webhook/get-kontrol

# Başvuru Formu
curl https://83ohvlw5.rpcld.net/webhook/get-basvuru-formu

# 18 Yaşından Küçük
curl https://83ohvlw5.rpcld.net/webhook/get-18-yasından-kucuk

# Kesin Ret
curl https://83ohvlw5.rpcld.net/webhook/get-kesin-ret
```

**Response:** JSON array
```json
[
  {
    "Adın Soyadın": "John Doe",
    "E-Posta Adresin": "john@example.com",
    "Timestamp": "2024-01-01 12:00:00"
  }
]
```

---

## 🔄 Hybrid Sistem (Otomatik Fallback)

Dashboard artık **akıllı fallback** sistemi kullanıyor:

1. ✅ **İlk deneme:** n8n webhook
2. 🔄 **Başarısız olursa:** Google Sheets API
3. ❌ **İkisi de yoksa:** Boş array döner

### Loglarda görebilirsiniz:

```
✅ n8n: Fetched 42 rows from Kontrol
🔄 Trying Google Sheets API fallback...
✅ Google Sheets API: Fetched 42 rows from Kontrol
❌ No data source available for Kontrol
```

---

## ⚙️ Konfigürasyon

`.env.local` dosyasında:

```env
# Sadece n8n webhook kullan
USE_N8N_WEBHOOKS=true

# Sadece Google Sheets API kullan
USE_N8N_WEBHOOKS=false

# Hybrid (önerilen): n8n dene, fallback Google Sheets
USE_N8N_WEBHOOKS=true
GOOGLE_SHEETS_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
```

---

## 📊 Kullanım Örnekleri

### JavaScript/TypeScript

```typescript
// Dashboard API kullanarak
const response = await fetch('http://localhost:3000/api/sheets/kontrol')
const { success, data } = await response.json()
console.log(`Toplam ${data.length} kayıt`)

// n8n webhook direkt
const data = await fetch('https://83ohvlw5.rpcld.net/webhook/get-kontrol')
  .then(res => res.json())

// n8n workflow'ları listele
const workflows = await fetch('http://localhost:3000/api/n8n/workflows')
  .then(res => res.json())
```

### Python

```python
import requests

# Dashboard API
response = requests.get('http://localhost:3000/api/sheets/kontrol')
data = response.json()
print(f"Toplam {data['count']} kayıt")

# n8n webhook
response = requests.get('https://83ohvlw5.rpcld.net/webhook/get-kontrol')
data = response.json()

# n8n REST API
headers = {'X-N8N-API-KEY': 'your_key'}
response = requests.get(
    'https://83ohvlw5.rpcld.net/api/v1/workflows',
    headers=headers
)
workflows = response.json()
```

---

## 🎯 Özet

| Yöntem | Kullanım | Avantaj |
|--------|----------|---------|
| **Dashboard API** | `/api/sheets/kontrol` | Tek endpoint, hybrid sistem, logging |
| **n8n REST API** | `/api/v1/workflows` | Workflow yönetimi, execution takibi |
| **n8n Webhook** | `/webhook/get-kontrol` | Hızlı, direkt Google Sheets verisi |

**Hepsini birden kullanabilirsiniz!** 🚀
