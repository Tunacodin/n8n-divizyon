# Divizyon Basvuru Yonetim Sistemi

> **Alt dokumanlar** (tag/mail/sure ile ilgili karar oncesi oku):
> - [`TAG_ASSIGNMENT_RULES.md`](./TAG_ASSIGNMENT_RULES.md) — Nihai uye geciste otomatik tag atama algoritmasi, hiyerarsi, test senaryolari

## Proje Ozeti
Divizyon Acik Inovasyon Agi toplulugunun uye basvurularini yoneten full-stack sistem.
- **Dashboard**: Next.js 14 (`circle-dashboard/`)
- **Otomasyon**: n8n workflows
- **Veri**: Google Sheets (6 adet)
- **Iletisim**: Resend

## Guvenlik Kurallari
- **ASLA** kullaniciya sormadan HTTP istegi gonderme (webhook, API, test dahil)
- **ASLA** Circle uyeleri uzerinde yazma/guncelleme/silme/tag atama islemi yapma — Circle API sadece okuma (GET) icin kullanilir
- Circle Admin Token ve API key'leri aciga cikarma
- Dis servislere (n8n, Resend, Google, Circle) yapilacak her cagri icin onay al

## ⚠️ KRITIK: Korumalı Üyeler (is_protected = TRUE)
Circle'dan senkronize edilmiş gerçek topluluk üyeleri `applications` tablosunda **`is_protected = TRUE`** flag'iyle saklanir. Bu kayitlar **ÜRETIM DATASIDIR**, asla test verisi ile karistirilmamalidir.

**Yasak işlemler — protected kayitlar üzerinde HİÇBİR durumda yapılmaz:**
- ❌ Mail/SMS/bildirim gönderme (Resend dahil, hiçbir kanal)
- ❌ Status değiştirme (changeStatus reddedilir)
- ❌ Field güncelleme (updateApplication reddedilir)
- ❌ Silme (DELETE reddedilir)
- ❌ Test başvurusu olarak kullanma
- ❌ Manuel "doldurdu" işareti, uyari ekleme, deaktive etme
- ❌ Dashboard'da herhangi bir butonun aktif olmasi (UI guard zorunlu)

**İzin verilen tek işlem:** Salt-okuma (SELECT) — listede gösterme, detay panel goruntuleme.

**Implementation guard'lar (her yerde olmali):**
1. `lib/supabase.ts:changeStatus` ve `updateApplication` — `is_protected=true` ise hata fırlat
2. API routes (`/api/applications/[id]` PATCH/DELETE, `/status`, `/tasks`, `/warnings`) — protected ise 403
3. `/api/mail/send` — protected email'e gönderim reddedilir
4. UI: protected satırlarda butonlar disabled + "Korumalı (Circle üyesi)" rozet
5. Test scriptleri — protected kayitlari hiç dokunmamali

Yeni bir kod yazarken: applications tablosuna mutation yapan her yer **mutlaka** is_protected kontrolü yapmali. Bu kural CLAUDE.md'deki en yüksek önceliklidir.

## Dizin Yapisi
```
n8n-circle/
├── circle-dashboard/          # Next.js 14 dashboard
│   ├── app/
│   │   ├── page.tsx           # Ana sayfa (istatistik kartlari)
│   │   ├── applications/      # Basvuru listesi sayfasi
│   │   ├── members/           # Uyeler sayfasi
│   │   ├── timeline/          # Zaman cizelgesi
│   │   ├── workflow/          # n8n workflow yonetimi
│   │   └── api/
│   │       ├── sheets/
│   │       │   ├── all/       # GET — Tum sheet verileri (gviz)
│   │       │   ├── update/    # POST — Sheet guncelleme (n8n proxy)
│   │       │   ├── [sheet]/   # GET — Dinamik sheet
│   │       │   ├── stats/     # GET — Istatistikler
│   │       │   ├── timeline/  # GET — Timeline verisi
│   │       │   └── ag-uyeleri/ # GET — Ag uyeleri
│   │       ├── n8n/
│   │       │   ├── workflows/ # GET — n8n workflow listesi
│   │       │   └── executions/ # GET — Calisma geçmisi
│   │       └── applications/
│   │           ├── route.ts   # GET — Basvurular (BROKEN — bilinen hata)
│   │           └── approve/   # POST — Onay/ret (n8n webhook trigger)
│   ├── components/
│   │   ├── basvuru/           # Basvuru formu komponentleri
│   │   │   ├── basvuru-constants.ts  # Kategori tanimlari + findFieldValue()
│   │   │   ├── BasvuruDetailModal.tsx
│   │   │   ├── BasvuruCard.tsx
│   │   │   ├── BasvuruCategorySection.tsx
│   │   │   ├── BasvuruDateList.tsx
│   │   │   └── BasvuruFormGrid.tsx
│   │   ├── kontrol/
│   │   │   └── KontrolDetailModal.tsx  # Degerlendirme + mail gonder
│   │   └── ui/                # Genel UI komponentleri
│   └── lib/
│       ├── sheets.ts          # SheetsClient (n8n + Google API hybrid)
│       ├── gviz.ts            # Google Sheets gviz API
│       ├── n8n-client.ts      # N8nClient (webhook + workflow API)
│       ├── n8n.ts             # N8nService (webhook trigger)
│       ├── resend.ts           # Resend mail client
│       ├── mail-templates.ts  # HTML mail template'leri
│       └── utils.ts           # Yardimci fonksiyonlar
├── n8n-workflow-update-sheet.json  # Import edilecek n8n workflow
└── CLAUDE.md                  # Bu dosya
```

## Veri Akisi

### Okuma (Sheets → Dashboard)
```
n8n webhook (GET /webhook/get-kontrol)
  ↓ basarisiz olursa
Google Sheets gviz API (public, auth gerektirmez)
  ↓
API Route → React UI
```

### Yazma (Dashboard → Sheets)
```
React UI (KontrolDetailModal "Kaydet" butonu)
  ↓ POST /api/sheets/update
  ↓ { sheet: "kontrol", email, updates }
n8n webhook (POST /webhook/update-sheet)
  ↓
Google Sheets (n8n'in credential'i ile)
```

### Mail Gonderimi (Dashboard → Resend → Kisi)
```
React UI (KontrolDetailModal "Mail Gonder")
  ↓ POST /api/mail/send
  ↓ { email, firstName, lastName, template_id, subject }
  1. Template HTML render (lib/mail-templates.ts)
  2. Resend ile gonder (lib/resend.ts)
  3. Supabase mail_logs'a kaydet
  4. Application mail_sent = true guncelle
```

## Google Sheets

6 sheet, her birinin farkli kolon adlari var:

| Anahtar | Sheet Adi | Sheet ID |
|---------|-----------|----------|
| basvuru | Basvuru Formu | `1ldHhZ6H4NqK3ILhhL3tzbFzHLp1YrCYux5Vmg4zL8qE` |
| kontrol | Kontrol | `16vorLiEB5_vyqOCuACFChFkVHnYZtCoIDIfIcT6POd8` |
| yasKucuk | 18 Yasindan Kucuk | `1hCc4-lcOs9eYv2loguVY1HWW5ve1OuX9ohN65WkN_Jc` |
| kesinRet | Kesin Ret | `16B9ZjzIHL02rkiZHm7WeLj2oaq-SBRpjqyvAiwULFX0` |
| nihaiOlmayan | Nihai Olmayan | `1i1zjnCEMYkfIMv8Pjoda1eLHoWKC76YCik8B5LVCP-0` |
| kesinKabul | Kesin Kabul | `1MDGfncckImBlf1N70_0FmJqalYOkTYR8dOPX17tYtLo` |

### Kontrol Sheet Onemli Kolonlar
`Adin Soyadin`, `E-Posta Adresin`, `Onay Durumu`, `Degerlendiren`, `Not`, `Mail Template`, `Mail Atildi mi?`

## n8n
- **URL**: `https://jdmjkrs9.rpcld.net`
- **MCP Server**: `https://jdmjkrs9.rpcld.net/mcp-server/http`
- **Auth**: JWT token (N8N_API_KEY in .env.local)
- **Okuma webhook'lari**: `get-kontrol`, `get-basvuru-formu`, `get-18-yasından-kucuk`, `get-kesin-ret`
- **Yazma webhook'lari**: `update-sheet` (POST), `manuel-onay/{email}` (GET)
- **n8n workflow import**: `n8n-workflow-update-sheet.json` (proje kokunde)

## Resend (Mail)
- **From**: `noreply@tunabostancibasi.com`
- **Template'ler**: `lib/mail-templates.ts` icinde tanimli (kesin-kabul, kesin-ret, beklemede, oryantasyon, bilgilendirme)
- **Log**: Supabase `mail_logs` tablosu
- **Endpoint**: `POST /api/mail/send`, `GET /api/mail/templates`, `GET /api/mail/logs`

## Bilinen Sorunlar
1. Google Service Account konfigure edilmemis — direkt Sheets API kullanilmiyor, n8n proxy var.
2. Iki ayri n8n client (`lib/n8n-client.ts` ve `lib/n8n.ts`) — ileride birlestirilebilir.

## UI / Tasarim Kurallari
- **Header (Navbar)**: Dark tema (`bg-[#1E1E2E]`), buyuk boyut — `h-20`, `px-10`, nav linkleri `text-base`, `gap-2`, logo `h-7`, avatar `w-9 h-9`, ikon `w-6 h-6`
- Navbar kucultulemez, her zaman bu boyutlarda kalmali

## Gelistirme Notlari
- `npm run dev` ile calistir
- gviz API icin sheet'lerin "anyone with the link" ile paylasilmis olmasi gerekir
- Yeni sheet eklerken: `app/api/sheets/all/route.ts` SHEETS objesine ve `app/api/sheets/update/route.ts` SHEETS objesine ekle
- Yeni editable alan eklerken: `KontrolDetailModal.tsx`'deki state'lere ve `handleSave` fonksiyonuna ekle
