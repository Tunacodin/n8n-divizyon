#!/usr/bin/env python3
"""Circle topluluk tag'lerini Supabase'e senkronize eder.
1. Tüm tag tanımları → member_tags tablosu (upsert)
2. Her üyenin detail endpoint'inden member_tags alanını çek
3. applications.tags (TEXT[]) → circle_id üzerinden eşle

ASLA Circle'a yazma — sadece GET. Supabase'e yazma var.

Çalıştırma:
  python3 scripts/sync-circle-tags.py [--dry-run]
"""
import json, os, sys, urllib.request, urllib.error, time

DRY = '--dry-run' in sys.argv

CIRCLE_KEY = os.environ.get('Circle_API_KEY_V1') or os.environ['Circle_API_KEY']
SB_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SB_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
COMM = int(os.environ.get('CIRCLE_COMMUNITY_ID', '405377'))
UA = 'curl/8.0'

# ── kategori heuristiği ──
PERSONA = {'Öncü', 'Gözcü', 'Meydan Okuyan', 'Zihin Kaşifi', 'Hedef Takipçisi',
           'Kendinden Emin', 'Gelecek Odaklı', 'Canlı', 'Sistemli', 'Mantıklı',
           'Challenger', 'İnovatif', 'İlham Verici', 'Tutkulu', 'Yaratıcı',
           'Çözümcü', 'Geleneksel', 'Titiz', 'Birleştirici', 'Pratik',
           'Tecrübeli', 'Gözlemci', 'Çalışkan'}
YONETICI = {'Topluluk Lideri', 'Topluluk Sorumlusu', 'Komünite Yöneticisi',
            'Divizyon Direktörü', 'Proje Yöneticisi', 'Labs Yöneticisi',
            'Proje Asistanı'}

def category_of(name: str) -> str:
    if name in PERSONA: return 'persona'
    if name in YONETICI: return 'yonetici'
    low = name.lower()
    if any(k in low for k in ['jam', 'hsd', 'hackathon', 'dijital keşif', '2025', '2026']):
        return 'etkinlik'
    if any(k in low for k in ['developer', 'designer', 'artist', 'writer', 'researcher',
                              'manager', 'editor', 'director', 'producer', 'tester',
                              'analyst', 'coder', 'actor',
                              'üretici', 'geliştirici', 'tasarımcı', 'creator']):
        return 'meslek'
    return 'diger'

def http(method, url, headers, body=None):
    req = urllib.request.Request(
        url, method=method,
        headers={**headers, 'User-Agent': UA},
        data=json.dumps(body).encode('utf-8') if body is not None else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode('utf-8')
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', 'ignore')
        try: return e.code, json.loads(raw)
        except: return e.code, {'raw': raw[:300]}

CIRCLE_HDR = {'Authorization': f'Token {CIRCLE_KEY}', 'Content-Type': 'application/json'}
SB_HDR = {'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}', 'Content-Type': 'application/json'}

def fetch_tags():
    out = []
    for p in range(1, 20):
        code, d = http('GET',
            f'https://app.circle.so/api/v1/member_tags?community_id={COMM}&per_page=100&page={p}',
            CIRCLE_HDR)
        if code != 200 or not d: break
        out.extend(d)
        if len(d) < 100: break
    return out

def fetch_all_members():
    out = []
    for p in range(1, 50):
        code, d = http('GET',
            f'https://app.circle.so/api/v1/community_members?community_id={COMM}&per_page=100&page={p}',
            CIRCLE_HDR)
        if code != 200: break
        recs = d if isinstance(d, list) else d.get('community_members', [])
        if not recs: break
        out.extend(recs)
        if len(recs) < 100: break
    return out

def fetch_member_detail(mid: int):
    """Tek üyenin detail endpoint'i — member_tags burada dolu gelir"""
    code, d = http('GET',
        f'https://app.circle.so/api/v1/community_members/{mid}?community_id={COMM}',
        CIRCLE_HDR)
    if code != 200: return None
    return d

def upsert_tag(t: dict) -> bool:
    row = {
        'id': t['id'],
        'name': t['name'],
        'color': t.get('color'),
        'category': category_of(t['name']),
        'display_format': t.get('display_format'),
        'is_public': t.get('is_public', True),
        'tagged_members_count': t.get('tagged_members_count', 0),
    }
    if DRY:
        print(f'  [dry] upsert tag {row["id"]} {row["name"]}'); return True
    code, _ = http('POST',
        f'{SB_URL}/rest/v1/member_tags?on_conflict=id',
        {**SB_HDR, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
        body=row)
    return code in (200, 201, 204)

def update_app_tags(circle_id: int, tag_names: list[str]) -> bool:
    if DRY:
        print(f'  [dry] app circle_id={circle_id} ← tags={tag_names}'); return True
    code, _ = http('PATCH',
        f'{SB_URL}/rest/v1/applications?circle_id=eq.{circle_id}',
        {**SB_HDR, 'Prefer': 'return=minimal'},
        body={'tags': tag_names})
    return code in (200, 204)

def main():
    t0 = time.time()

    print(f'⏳ Tag tanımları çekiliyor (v1 /member_tags)...')
    tags = fetch_tags()
    print(f'  → {len(tags)} tag')

    print(f'⏳ member_tags tablosuna upsert...')
    ok = sum(1 for t in tags if upsert_tag(t))
    print(f'  → {ok}/{len(tags)} upsert tamam')

    print(f'⏳ Tüm üyeler listeleniyor...')
    members = fetch_all_members()
    print(f'  → {len(members)} üye')

    print(f'⏳ Her üye için detail çağrısı (member_tags için)...')
    updated = with_tags = no_tags = errors = 0
    for i, m in enumerate(members, 1):
        mid = m.get('id')
        if not mid: errors += 1; continue
        detail = fetch_member_detail(mid)
        if detail is None: errors += 1; continue
        member_tags = detail.get('member_tags') or []
        tag_names = sorted({t.get('name') for t in member_tags if t.get('name')})
        if tag_names:
            if update_app_tags(mid, tag_names):
                with_tags += 1; updated += 1
            if i % 25 == 0 or i == len(members):
                print(f'  [{i:>3}/{len(members)}] {m["name"][:40]:<40} → {len(tag_names)} tag')
        else:
            no_tags += 1
            if i % 100 == 0:
                print(f'  [{i:>3}/{len(members)}] ... (tag\'siz toplam: {no_tags})')

    print()
    print(f'─── Özet ─── ({time.time()-t0:.1f}s)')
    print(f'  Tag tanımı (member_tags)       : {len(tags)}')
    print(f'  Toplam Circle üyesi            : {len(members)}')
    print(f'  Tag\'i olan + yazılan (UPDATE)  : {with_tags}')
    print(f'  Tag\'i olmayan                  : {no_tags}')
    print(f'  Hata                             : {errors}')
    if DRY: print(f'  ⚠ Dry-run — DB yazılmadı.')

if __name__ == '__main__':
    main()
