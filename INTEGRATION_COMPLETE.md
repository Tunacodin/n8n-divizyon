# ✅ Circle Dashboard - n8n Entegrasyonu

## 🎯 Yapılan Değişiklikler

### 1. **n8n API Key Güncellendi**
- ✅ Yeni API key `.env.local` dosyasına eklendi
- ✅ API URL: `https://83ohvlw5.rpcld.net`

### 2. **Google Sheets Entegrasyonu**
- n8n webhook'ları üzerinden 4 sheet ile çalışıyor
- OAuth ile güvenli bağlantı (mevcut client_secret dosyanız)

### 3. **Kullanılan Sheet'ler (SADECE 4 ADET)**

1. ✅ **Kontrol**
2. ✅ **Divizyon Açık İnovasyon Ağı | Başvuru Formu**
3. ✅ **18 Yaşından Küçük**
4. ✅ **Kesin Ret**

---

## 🚀 n8n Kurulumu (5 Dakika)

### Adım 1: İlk Webhook'u Kurun

1. n8n'e giriş yapın: https://83ohvlw5.rpcld.net
2. `n8n-workflow-get-applications.json` dosyasını import edin
3. Google Sheets node'unda:
   - Sheet ID'nizi girin
   - Sheet name: `Kontrol`
   - OAuth credential seçin
4. Webhook node'unda path: `get-kontrol`
5. Workflow'u aktif edin
6. Test edin:
   ```bash
   curl https://83ohvlw5.rpcld.net/webhook/get-kontrol
   ```

### Adım 2: Diğer 3 Webhook'u Kopyalayın

Aynı workflow'u 3 kez daha kopyalayıp sadece şunları değiştirin:

| # | Webhook Path | Sheet Name |
|---|--------------|------------|
| 1 | `get-kontrol` | Kontrol |
| 2 | `get-basvuru-formu` | Divizyon Açık İnovasyon Ağı \| Başvuru Formu |
| 3 | `get-18-yasından-kucuk` | 18 Yaşından Küçük |
| 4 | `get-kesin-ret` | Kesin Ret |

### Adım 3: Dashboard'u Başlatın

```bash
cd circle-dashboard
npm run dev
```

Dashboard `http://localhost:3000` adresinde açılacak.

---

## 📁 Dosya Yapısı

```
circle-dashboard/
├── lib/
│   ├── n8n-client.ts          # n8n API istemcisi
│   └── sheets.ts               # 4 sheet için veri çekme
├── .env.local                  # API key ve konfigürasyon
└── app/                        # Dashboard sayfaları
```

---

## ✅ Test Checklist

- [ ] 4 webhook kuruldu ve aktif
- [ ] Her webhook test edildi (curl ile)
- [ ] Dashboard başlatıldı
- [ ] Ana sayfa yükleniyor
- [ ] Timeline sayfası çalışıyor
- [ ] Konsolda hata yok

---

## 🎯 API Endpoints

Dashboard bu endpoint'leri kullanıyor:

```
GET https://83ohvlw5.rpcld.net/webhook/get-kontrol
GET https://83ohvlw5.rpcld.net/webhook/get-basvuru-formu
GET https://83ohvlw5.rpcld.net/webhook/get-18-yasından-kucuk
GET https://83ohvlw5.rpcld.net/webhook/get-kesin-ret
```

Her endpoint JSON array döndürür:
```json
[
  {
    "Adın Soyadın": "John Doe",
    "E-Posta Adresin": "john@example.com",
    "Timestamp": "2024-01-01 12:00:00",
    ...
  }
]
```

---

Sorularınız için hazırım! 🚀
