# Otomatik Tag Atama Kurallari

> Nihai uye gecisinde 1 leaf + 1 parent tag otomatik atanir.
> Amac: kullanicinin gercek max skorunu koruyarak, esitlik durumunda agda az bulunan tag'i tercih ederek dengeleme yapmak.

## Ne zaman calisir

- Bir basvuru `kesin_kabul` (veya herhangi bir onceki statu) → `nihai_uye` statusune gectiginde
- Cagri noktasi: `lib/supabase.ts:changeStatus` → `autoAssignCharacterTag`
- Sadece geciste bir kez calisir (ayni statusten ayni statuye gecis tetiklemez)

## Tag hiyerarsisi (5 parent + 18 leaf)

| Parent | Leaf tag'ler |
|---|---|
| **Onc u** | Birlestirici, Pratik, Sistemli, Ilham Verici, Tecrubeli |
| **Meydan Okuyan** | Challenger, Mantikli, Tutkulu |
| **Zihin Kasifi** | Yaratici, Inovatif, Geleneksel |
| **Hedef Takipcisi** | Caliskan, Titiz, Cozumcu |
| **Gozcu** | Gozlemci, Kendinden Emin, Canli, Gelecek Odakli |

- Her leaf **tek bir** parent'a aittir (deterministik eslemeler).
- Parent'lar envanter testi tarafindan dogrudan skorlanmaz — sadece leaf seciminin sonucu olarak atanirlar.

## Veri kaynaklari

1. **Kullanici skorlari**: `inventory_tests.scores` (`test_type = 'karakteristik_envanter'`) — en son kayit
2. **Ag sayilari**: `member_tags.tagged_members_count` — Circle'dan senkron edilmis cache
3. **Leaf → Parent eslemesi**: kod sabiti — `lib/character-tags.ts`
4. **Leaf → Circle tag adi eslemesi**: `CHARACTER_TAG_MAP` sabiti

## Algoritma

```
1. inventory_tests.scores'tan CHARACTER_TAG_MAP'e eslesen leaf skorlarini al
2. En yuksek skor degerini bul (max)
3. max skorlu leaf sayisina gore:
   a. Tek leaf ise                → onu sec
   b. Birden fazla leaf max ise:
      i.  member_tags.tagged_members_count en az olanini sec
      ii. eger count'lar da esit → alfabetik (Turkce sort) ilkini sec
4. Secilen leaf'in parent'ini bul (PARENT_MAP)
5. applications.tags dizisine leaf + parent ekle (set logic, duplicate yok)
6. audit_log entry: action='auto_tag_assigned', reason='<aciklama>'
```

## Ornekler

**Ornek 1 — tek max:**
```
Skorlar: kendinden_emin=9, canli=6, pratik=4
Max: kendinden_emin=9 (tek)
Atanir: Kendinden Emin + Gozcu
```

**Ornek 2 — iki max, count esit degil:**
```
Skorlar: pratik=9, sistemli=9, canli=3
Count: Pratik=0, Sistemli=6
Max esit → count az olan → Pratik
Atanir: Pratik + Oncu
```

**Ornek 3 — iki max, count da esit:**
```
Skorlar: pratik=9, tecrubeli=9
Count: Pratik=0, Tecrubeli=0
Max esit, count esit → alfabetik → Pratik (P < T)
Atanir: Pratik + Oncu
```

**Ornek 4 — kullanicida zaten var:**
```
Mevcut tags: ["Oncu", "Pratik"]
Yeni sonuc leaf=Pratik, parent=Oncu
applications.tags zaten icerir → hicbir sey eklenmez (idempotent)
```

## Kullanicida mevcut tag kontrolu

- Leaf aday havuzundan zaten var olan leaf'ler cikarilir (ayni leaf iki kez verilmez).
- Parent daha onceden varsa **yine de** seçim yapilir — sadece set logic ile duplicate eklenmez.

## Bilinen sinirlamalar

### Circle count cache staleness
- `member_tags.tagged_members_count` Circle'dan cached, anlik degil.
- Local atama yapildiginda Circle count'u otomatik artmaz — bir sonraki `scripts/sync-circle-tags.py` calismasinda guncellenir.
- Ayni gun arka arkaya cok nihai uye geciski olursa algoritma ayni "az count" leaf'e takilabilir.
- **Cozum secenegi (henuz eklenmedi)**: atama sirasinda `tagged_members_count += 1` local increment. Bir sonraki sync'te gercek degere override olur.

### Envanter disi persona tag'leri
- Circle'da bu 5 tag var ama kullanicidan skor gelmiyor: **Gozcu, Meydan Okuyan, Onc u, Zihin Kasifi, Hedef Takipcisi**
- Hepsi parent'lardir → leaf atanirken otomatik beslenirler.
- Dogrudan bu parent'lari atayan bir mantik yoktur (leaf uzerinden gider).

## Test senaryolari

| # | Senaryo | Beklenti |
|---|---|---|
| 1 | Tek max skor | 1 leaf + 1 parent atanir |
| 2 | 2 max esit, count farkli | Az count'lu leaf'in parent'i atanir |
| 3 | 2 max esit, count esit | Alfabetik ilk leaf + parent |
| 4 | Kullanicida zaten parent var | Leaf yeni eklenir, parent duplicate degil |
| 5 | Kullanicida zaten hem leaf hem parent var | `assigned: null`, reason: "mevcut" |
| 6 | Skor tablosu bos | `assigned: null`, reason: "skor yok" |
| 7 | Tum skorlar 0 | `assigned: null`, reason: "anlamli skor yok" |

## Kod referanslari

- `lib/character-tags.ts:autoAssignCharacterTag` — algoritma
- `lib/character-tags.ts:CHARACTER_TAG_MAP` — leaf → Circle adi
- `lib/character-tags.ts:PARENT_MAP` — leaf → parent (eklenmesi gerekiyor, su anda yok)
- `lib/supabase.ts:changeStatus` — tetikleme noktasi
- `scripts/sync-circle-tags.py` — Circle count yenileme

## Mevcut kod vs bu kural farki (2026-04-18 itibariyla)

Mevcut `autoAssignCharacterTag` davranisi bu MD'den farkli:

| | Bu MD | Mevcut kod |
|---|---|---|
| Aday havuzu | Sadece max skorlular | Top 5 skor |
| Primary sort | Skor max (filtre) | Count min |
| Secondary sort | Count min | Skor max |
| Tie-break (count esit) | Alfabetik | Belirsiz |
| Parent atama | Var (default 2 tag) | Yok (sadece 1 leaf) |

Kod bu MD'ye gore guncellenmelidir. Guncelleme onceden kullaniciya onaylatilir.
