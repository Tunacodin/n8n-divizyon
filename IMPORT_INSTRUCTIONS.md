# 🚀 Circle n8n FULL Workflow'ları - Import Talimatları

## ⚠️ Önemli Not

n8n API'si büyük workflow'ları UPDATE etmeyi desteklemiyor. Bu yüzden FULL versiyonları **n8n arayüzünden manuel import etmeniz gerekiyor**.

---

## 📦 Hazır FULL Workflow Dosyaları

### ✅ Tam Fonksiyonel (API ile yüklendi)
1. **workflow_1_complete.json** - Application Handler (22 nodes) ✅ YÜKLÜ

### 📁 Import Edilmesi Gerekenler
2. **workflow_2_full_test_manager.json** - Test Manager (FULL) - 26 nodes
3. **workflow_3_full_role_assignment.json** - Role Assignment (FULL) - 9 nodes
4. **workflow_4_full_warning_system.json** - Warning System (FULL) - 13 nodes
5. **workflow_5_full_event_attendee.json** - Event Attendee (FULL) - (oluşturuluyor...)

---

## 🔧 n8n'de Import Nasıl Yapılır?

### Adım 1: n8n Arayüzüne Git
```
https://83ohvlw5.rpcld.net/
```

### Adım 2: Import İşlemi
1. Sol menüden **Workflows** tıkla
2. Sağ üst köşede **"Import from File"** butonuna tıkla
3. Dosya seç:
   - `workflow_2_full_test_manager.json`
   - `workflow_3_full_role_assignment.json`
   - `workflow_4_full_warning_system.json`
4. Import tamamlandı!

### Adım 3: Credential'ları Bağla
Her workflow'u açıp:
1. Kırmızı olan node'ları bul
2. Credential dropdown'dan mevcut credential seç veya yeni oluştur:
   - Google Sheets OAuth2
   - Mailchimp API
   - HTTP Header Auth (Circle API için)

### Adım 4: Placeholder'ları Değiştir
Tüm workflow'larda şunları değiştir:
- `GOOGLE_SHEET_ID_PLACEHOLDER` → Gerçek Google Sheet ID
- `MAILCHIMP_LIST_ID` → Gerçek Mailchimp List ID
- `CIRCLE_API_TOKEN_PLACEHOLDER` → Circle API token

### Adım 5: Test Et
Her workflow'u:
1. Test execution yap
2. Her node'u kontrol et
3. Aktif yap (toggle on)

---

## 📊 FULL Workflow Özellikleri

### 2️⃣ Test Manager (FULL) - 26 Nodes
**Özellikler:**
- ✅ Circle login event tracking
- ✅ 4 AYRI test webhook'u:
  - `/webhook/circle-login` - Login event
  - `/webhook/test-karakteristik` - Karakteristik test
  - `/webhook/test-dijital-urun` - Dijital Ürün test
  - `/webhook/test-kreatif-yapim` - Kreatif Yapım test
  - `/webhook/test-dijital-deneyim` - Dijital Deneyim test
- ✅ Google Sheets otomatik kayıt (Başvuru Sheet + Test Sonuçları)
- ✅ Tüm testler tamamlanınca otomatik Role Assignment trigger
- ✅ Mailchimp test linki gönderimi

**Webhook'lar:**
```bash
POST https://83ohvlw5.rpcld.net/webhook/circle-login
Body: {"email": "user@example.com", "user_id": "123"}

POST https://83ohvlw5.rpcld.net/webhook/test-karakteristik
Body: {"email": "user@example.com", "score": 85}

POST https://83ohvlw5.rpcld.net/webhook/test-dijital-urun
Body: {"email": "user@example.com", "score": 78}

# ... diğer testler benzer format
```

---

### 3️⃣ Role Assignment Engine (FULL) - 9 Nodes
**Özellikler:**
- ✅ Google Sheets'ten GERÇEK rol sayımı okuma
- ✅ Akıllı rol hesaplama (eşit skor durumunda az sayıda olanı seç)
- ✅ Circle API entegrasyonu (tag atama)
- ✅ Nihai AĞ Üyesi sheet'e otomatik kayıt
- ✅ Rol atandı maili (Mailchimp veya SMTP)
- ✅ Detaylı JSON response

**Circle API Entegrasyonu:**
```javascript
POST https://api.circle.so/v1/community_members
Headers: {
  "Authorization": "Token YOUR_TOKEN"
}
Body: {
  "email": "user@example.com",
  "name": "Ad Soyad",
  "tags": "Dijital Ürün"
}
```

---

### 4️⃣ Warning System (FULL) - 13 Nodes
**Özellikler:**
- ✅ Uyarı sayısı otomatik artırma
- ✅ Google Sheets warning count tracking
- ✅ 2+ uyarıda Circle API ile deactivate
- ✅ Deaktifler sheet'e otomatik taşıma
- ✅ Warning history tutma
- ✅ Uyarı ve deaktif mailleri
- ✅ Conditional branching (uyarı vs deaktif)

**Webhook:**
```bash
POST https://83ohvlw5.rpcld.net/webhook/circle-warning
Body: {
  "email": "user@example.com",
  "user_id": "circle_123",
  "violation_type": "Spam",
  "details": "Multiple promotional posts"
}
```

---

## 🎯 Import Sonrası Kontrol Listesi

- [ ] Workflow import edildi
- [ ] Credential'lar bağlandı
- [ ] Placeholder'lar değiştirildi
- [ ] Test execution başarılı
- [ ] Webhook URL'leri kaydedildi
- [ ] Workflow aktif

---

## 🆘 Sorun Giderme

### Import Hatası Alıyorum
- JSON dosyasının bozuk olmadığını kontrol edin
- n8n versiyonunuzun güncel olduğundan emin olun
- Dosya boyutu çok büyükse node'ları azaltıp parçalara bölün

### Credential Bulunamıyor
- n8n'de önce credential'ı oluşturun
- Sonra workflow'da seçin

### Webhook Çalışmıyor
- Webhook path'inin unique olduğundan emin olun
- Workflow'un aktif olduğunu kontrol edin
- n8n URL'inin doğru olduğunu kontrol edin

---

## 📝 Notlar

- FULL workflow'lar modülerdir, bağımsız çalışabilir
- Application Handler zaten API ile yüklendi, tekrar import etmeyin
- Test Manager'daki 4 webhook Typeform'a ayrı ayrı bağlanmalı
- Circle API token için Circle admin panelinden token alın
- Warning System tamamen otomatik çalışır, manuel müdahale gerektirmez

---

**Hazırlayan:** Claude Code
**Tarih:** 2026-02-28
**Durum:** Import'a Hazır ✅
