#!/usr/bin/env python3
"""Circle topluluk üyelerini Supabase applications tablosuna aktarır.
- Email match varsa: mevcut application'ı UPDATE → is_protected=true, circle_id=X, protected_source='circle_existing_match', status='nihai_uye'
- Email match yoksa: yeni satır INSERT → status='etkinlik' (form doldurmadan ağa alınmış), is_protected=true, protected_source='circle_event'
- İdempotent: circle_id unique, çakışmada upsert davranışı

Çalıştırma:
  python3 scripts/sync-circle-members.py [--dry-run]
"""
import json, os, sys, urllib.request, urllib.error
from datetime import datetime

DRY = '--dry-run' in sys.argv

# ── env ──
def need(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        sys.exit(f'❌ {name} env değeri eksik. .env.local kaynak alındı mı?')
    return v

CIRCLE_KEY = need('Circle_API_KEY')
SB_URL = need('NEXT_PUBLIC_SUPABASE_URL')
SB_KEY = need('SUPABASE_SERVICE_ROLE_KEY')
COMMUNITY_ID = int(os.environ.get('CIRCLE_COMMUNITY_ID', '405377'))

UA = 'curl/8.0'

def http(method: str, url: str, headers: dict, body: dict | list | None = None) -> tuple[int, object]:
    req = urllib.request.Request(
        url,
        method=method,
        headers={**headers, 'User-Agent': UA},
        data=json.dumps(body).encode('utf-8') if body is not None else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode('utf-8')
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', 'ignore')
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'raw': raw[:300]}

# ── 1) Circle üyelerini çek ──
def fetch_circle_members() -> list[dict]:
    members = []
    page = 1
    while True:
        code, data = http(
            'GET',
            f'https://app.circle.so/api/v1/community_members?community_id={COMMUNITY_ID}&per_page=100&page={page}',
            headers={'Authorization': f'Token {CIRCLE_KEY}', 'Content-Type': 'application/json'},
        )
        if code != 200:
            sys.exit(f'❌ Circle API hata {code}: {data}')
        records = data if isinstance(data, list) else (data.get('community_members') or data.get('records') or [])
        if not records:
            break
        members.extend(records)
        if len(records) < 100:
            break
        page += 1
        if page > 50:
            print('⚠ 5000 üye sınırına ulaşıldı, durduruyorum.'); break
    return members

# ── 2) Supabase: email map çek ──
def fetch_existing_emails() -> dict[str, str]:
    """email -> application_id"""
    code, data = http(
        'GET',
        f'{SB_URL}/rest/v1/applications?select=id,email&is_protected=eq.false',
        headers={'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}'},
    )
    if code != 200:
        sys.exit(f'❌ Supabase apps fetch hata {code}: {data}')
    out = {}
    for row in data:
        e = (row.get('email') or '').lower().strip()
        if e:
            out[e] = row['id']
    return out

# ── 3) Mevcut circle_id'ler (idempotency) ──
def fetch_existing_circle_ids() -> set[int]:
    code, data = http(
        'GET',
        f'{SB_URL}/rest/v1/applications?select=circle_id&circle_id=not.is.null',
        headers={'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}'},
    )
    if code != 200:
        sys.exit(f'❌ Supabase circle_id fetch hata {code}: {data}')
    return {row['circle_id'] for row in data if row.get('circle_id')}

# ── 4) UPDATE / INSERT ──
def update_existing(app_id: str, member: dict) -> bool:
    payload = {
        'is_protected': True,
        'circle_id': member['id'],
        'protected_source': 'circle_existing_match',
        'status': 'nihai_uye',
    }
    if DRY:
        print(f'   [dry] UPDATE {app_id} ← circle_id={member["id"]}')
        return True
    code, data = http(
        'PATCH',
        f'{SB_URL}/rest/v1/applications?id=eq.{app_id}',
        headers={
            'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}',
            'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        },
        body=payload,
    )
    return code in (200, 204)

def insert_new(member: dict) -> bool:
    name = member.get('name') or f"{member.get('first_name','')} {member.get('last_name','')}".strip() or '(Circle üyesi)'
    email = (member.get('email') or '').lower().strip() or f'circle-{member["id"]}@no-email.local'
    # Yeni Circle üyesi (panel döneminde eklendi) — applications'da email match yok
    # Varsayılan: etkinlikten gelen. Başvuru formunu doldururlarsa normal akışa girerler.
    payload = {
        'email': email,
        'full_name': name,
        'status': 'etkinlik',
        'is_protected': True,
        'circle_id': member['id'],
        'protected_source': 'circle_event',
        'source': 'circle',
        'submitted_at': member.get('created_at') or datetime.utcnow().isoformat() + 'Z',
    }
    if DRY:
        print(f'   [dry] INSERT new ← {name} <{email}> circle_id={member["id"]}')
        return True
    code, data = http(
        'POST',
        f'{SB_URL}/rest/v1/applications',
        headers={
            'apikey': SB_KEY, 'Authorization': f'Bearer {SB_KEY}',
            'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        },
        body=payload,
    )
    if code not in (201, 200):
        print(f'   ❌ insert fail {code}: {data}')
        return False
    return True

# ── ana akış ──
def main():
    print(f'⏳ Circle community {COMMUNITY_ID} üyeleri çekiliyor...')
    members = fetch_circle_members()
    print(f'  → {len(members)} üye geldi.')

    existing_emails = fetch_existing_emails()
    print(f'  → applications.email haritası: {len(existing_emails)} kayıt')

    existing_circle_ids = fetch_existing_circle_ids()
    print(f'  → halihazırda sync edilmiş circle_id: {len(existing_circle_ids)} kayıt')

    matched = updated_existing = inserted_new = skipped_already = errors = 0
    for m in members:
        cid = m.get('id')
        if not cid:
            errors += 1; continue
        if cid in existing_circle_ids:
            skipped_already += 1; continue

        email = (m.get('email') or '').lower().strip()
        app_id = existing_emails.get(email) if email else None
        if app_id:
            ok = update_existing(app_id, m)
            if ok: updated_existing += 1; matched += 1
            else: errors += 1
        else:
            ok = insert_new(m)
            if ok: inserted_new += 1
            else: errors += 1

    print()
    print(f'─── Özet ─────────────────')
    print(f'  Toplam Circle üyesi      : {len(members)}')
    print(f'  Halihazırda sync edilmiş : {skipped_already}')
    print(f'  Email match (UPDATE)     : {updated_existing}')
    print(f'  Email match yok (INSERT) : {inserted_new}')
    print(f'  Hata                      : {errors}')
    if DRY:
        print(f'  ⚠ Dry-run modu — DB yazılmadı.')

if __name__ == '__main__':
    main()
