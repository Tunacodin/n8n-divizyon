# n8n Webhook Kurulum Rehberi

Dashboard sadece 4 Google Sheet ile çalışıyor. Her biri için bir webhook oluşturmanız gerekiyor.

## 📋 Gerekli 4 Webhook

### 1. **get-kontrol** - Kontrol
- **Method:** GET
- **Path:** `/webhook/get-kontrol`
- **Sheet:** Kontrol

### 2. **get-basvuru-formu** - Divizyon Açık İnovasyon Ağı | Başvuru Formu
- **Method:** GET
- **Path:** `/webhook/get-basvuru-formu`
- **Sheet:** Divizyon Açık İnovasyon Ağı | Başvuru Formu

### 3. **get-18-yasından-kucuk** - 18 Yaşından Küçük
- **Method:** GET
- **Path:** `/webhook/get-18-yasından-kucuk`
- **Sheet:** 18 Yaşından Küçük

### 4. **get-kesin-ret** - Kesin Ret
- **Method:** GET
- **Path:** `/webhook/get-kesin-ret`
- **Sheet:** Kesin Ret

---

## 🔧 n8n Workflow Yapısı (Her Webhook İçin)

```
1. Webhook (GET request)
   ↓
2. Google Sheets (Read rows)
   - Spreadsheet ID: [Sheet ID'niz]
   - Sheet Name: [Sheet adı - yukarıdaki 4'ten biri]
   - Range: A1:ZZ1000
   ↓
3. Code (Format data)
   - Header satırını kullanarak obje oluştur
   ↓
4. Respond to Webhook
   - Response: {{ $json }}
```

---

## 📝 Code Node İçeriği (3. adım)

```javascript
// Get all items from Google Sheets
const items = $input.all();

if (items.length === 0) {
  return [];
}

// First row is headers
const firstItem = items[0].json;
const headers = Object.keys(firstItem).sort((a, b) => {
  const aMatch = a.match(/\d+/);
  const bMatch = b.match(/\d+/);
  if (aMatch && bMatch) {
    return parseInt(aMatch[0]) - parseInt(bMatch[0]);
  }
  return 0;
}).map(key => firstItem[key]);

// Convert remaining rows to objects
const data = items.slice(1).map(item => {
  const row = Object.keys(item.json).sort((a, b) => {
    const aMatch = a.match(/\d+/);
    const bMatch = b.match(/\d+/);
    if (aMatch && bMatch) {
      return parseInt(aMatch[0]) - parseInt(bMatch[0]);
    }
    return 0;
  }).map(key => item.json[key]);

  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index] || '';
  });

  return obj;
});

return data.map(item => ({ json: item }));
```

---

## ✅ Test Etme

Her workflow'u aktif ettikten sonra test edin:

```bash
# Test komutları
curl https://83ohvlw5.rpcld.net/webhook/get-kontrol
curl https://83ohvlw5.rpcld.net/webhook/get-basvuru-formu
curl https://83ohvlw5.rpcld.net/webhook/get-18-yasından-kucuk
curl https://83ohvlw5.rpcld.net/webhook/get-kesin-ret
```

Her biri JSON formatında veri dönmeli.

---

## 🚀 Hızlı Kurulum (Önerilen)

1. `n8n-workflow-get-applications.json` dosyasını n8n'e import edin
2. Workflow'u 4 kez kopyalayın
3. Her kopya için:
   - Webhook path'i değiştirin (yukarıdaki 4'ten biri)
   - Google Sheets node'unda sheet name'i değiştirin
   - Workflow'u aktif edin

---

n8n URL: `https://83ohvlw5.rpcld.net`
