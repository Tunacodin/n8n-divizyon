# Circle - Google Sheets Template

Bu template'i kullanarak Google Sheets'inizde 6 sayfa oluşturun.

## 📋 Sheet 1: Başvuru Sheet

### Kolonlar:
```
A: Timestamp
B: Email
C: Ad Soyad
D: Yaş
E: İlkeler Kabul
F: Durum
G: Circle'a Giriş Yaptı
H: Circle Giriş Tarihi
I: Değerlendiren
J: Değerlendirme Zamanı
K: Notlar
```

### Örnek Veri:
```
2026-02-28T10:00:00Z | ahmet@example.com | Ahmet Yılmaz | 25 | Evet | Manuel Kontrol Bekliyor | Hayır | | | |
```

---

## ✅ Sheet 2: Kabul Edilenler

### Kolonlar:
```
A: Email
B: Ad Soyad
C: Kabul Tarihi
D: Değerlendiren
```

---

## ❌ Sheet 3: Reddedilenler

### Kolonlar:
```
A: Email
B: Ad Soyad
C: Ret Tarihi
D: Ret Sebebi
E: Ret Tipi (Otomatik/Manuel)
F: Değerlendiren
```

---

## 🧪 Sheet 4: Test Sonuçları

### Kolonlar:
```
A: Email
B: Ad Soyad
C: Karakteristik Skor
D: Dijital Ürün Skor
E: Kreatif Yapım Skor
F: Dijital Deneyim Skor
G: Karakteristik Tamamlandı (Evet/Hayır)
H: Dijital Ürün Tamamlandı (Evet/Hayır)
I: Kreatif Yapım Tamamlandı (Evet/Hayır)
J: Dijital Deneyim Tamamlandı (Evet/Hayır)
K: Tüm Testler Tamamlandı (Evet/Hayır)
L: Tamamlanma Tarihi
```

### Formül (K sütunu):
```
=IF(AND(G2="Evet",H2="Evet",I2="Evet",J2="Evet"),"Evet","Hayır")
```

---

## 🎭 Sheet 5: Nihai AĞ Üyesi

### Kolonlar:
```
A: Email
B: Ad Soyad
C: Circle User ID
D: Ana Rol (Dijital Ürün/Kreatif Yapım/Dijital Deneyim)
E: Alt Rol
F: Tags
G: Katılım Tarihi
H: Warning Count
I: Son Aktivite
J: Status (Active/Inactive)
```

### Rol Sayımı için Yardımcı Sütunlar (M-O):
```
M: Dijital Ürün Sayısı
N: Kreatif Yapım Sayısı
O: Dijital Deneyim Sayısı
```

### Formüller:
```
M2: =COUNTIF(D:D,"Dijital Ürün")
N2: =COUNTIF(D:D,"Kreatif Yapım")
O2: =COUNTIF(D:D,"Dijital Deneyim")
```

---

## 🚫 Sheet 6: Deaktifler

### Kolonlar:
```
A: Email
B: Ad Soyad
C: Circle User ID
D: Deaktif Tarihi
E: Sebep (2+ Uyarı / Başvuru Yapmama / Manuel / Kural İhlali)
F: Warning Count
G: Warning History
H: Son Uyarı Tarihi
```

---

## 🎪 Sheet 7: Etkinlik Katılımcıları

### Kolonlar:
```
A: Email
B: Ad Soyad
C: Event Name
D: Ekleme Tarihi
E: Başvuru Yaptı mı? (Evet/Hayır)
F: Başvuru Tarihi
G: Warning Count
H: Son Kontrol Tarihi
I: Status (Active/Deaktif)
```

---

## 🔧 Kurulum Talimatları:

1. Google Sheets'te yeni bir spreadsheet oluşturun
2. Adı: "Circle Topluluk Yönetimi"
3. Her bir sheet'i yukarıdaki isimlerde oluşturun
4. İlk satıra (header) kolon isimlerini yazın
5. Formülleri ilgili hücrelere ekleyin
6. Sheet ID'sini kopyalayın (URL'den)
7. n8n'de Google Sheets credential'ı oluşturun
8. Tüm workflow'larda `GOOGLE_SHEET_ID_PLACEHOLDER` yerine gerçek ID'yi yazın

## 📝 Notlar:

- Tüm tarih alanları ISO 8601 formatında (YYYY-MM-DDTHH:mm:ssZ)
- Email alanları unique olmalı (duplicate kontrolü önemli)
- Formüller otomatik hesaplama için kullanılıyor
- Data validation ekleyebilirsiniz (Durum, Status vs. için dropdown)
