#!/usr/bin/env python3
"""4 envanter Typeform'unu CSV'den olustur. Her kolon icin:
- # -> skip
- E-Posta Adresin -> email field
- Meta kolonlar (Response Type, Start/Stage/Submit Date, Network ID, Tags, Ending) -> skip
- Diger kolonlar -> CSV'deki unique cevaplara gore multiple_choice veya short_text
Basa Ad Soyad short_text field'i eklenir.
"""
import csv, json, os, sys, urllib.request, urllib.error

TOKEN = os.environ.get('TYPEFORM_API_TOKEN') or sys.exit('TYPEFORM_API_TOKEN env gerekli')

FORMS = [
    {
        'csv': '/Users/tuna/Desktop/all-in-one/n8n-circle/circle-dashboard/karakteristik_envanter_testi.csv',
        'title': 'Karakteristik Envanter Testi',
    },
    {
        'csv': '/Users/tuna/Desktop/all-in-one/n8n-circle/circle-dashboard/kreatif_yapım.csv',
        'title': 'Kreatif Yapım - Disipliner Envanter',
    },
    {
        'csv': '/Users/tuna/Desktop/all-in-one/n8n-circle/circle-dashboard/dijital_deneyim.csv',
        'title': 'Dijital Deneyim - Disipliner Envanter',
    },
    {
        'csv': '/Users/tuna/Desktop/all-in-one/n8n-circle/circle-dashboard/dijital_ürün.csv',
        'title': 'Dijital Ürün - Disipliner Envanter',
    },
]

META_COLS = {'#', 'Response Type', 'Start Date (UTC)', 'Stage Date (UTC)', 'Submit Date (UTC)', 'Network ID', 'Tags', 'Ending'}

def build_fields(csv_path):
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        return []
    headers = rows[0]
    data = rows[1:]

    # kolon bazinda unique values topla
    col_values = {i: [] for i in range(len(headers))}
    for row in data:
        for i, v in enumerate(row):
            if i >= len(headers):
                continue
            v = (v or '').strip()
            if v:
                col_values[i].append(v)

    fields = [
        {
            'title': 'Ad Soyadın',
            'ref': 'full_name',
            'type': 'short_text',
            'validations': {'required': True},
        },
    ]

    seen_titles = set()
    for i, h in enumerate(headers):
        h = (h or '').strip()
        if not h or h in META_COLS:
            continue
        if h == 'E-Posta Adresin':
            fields.append({
                'title': h,
                'ref': 'email',
                'type': 'email',
                'validations': {'required': True},
            })
            continue

        # Duplicate header'lar icin sayac
        title_key = h
        idx = 2
        while title_key in seen_titles:
            title_key = f'{h} ({idx})'
            idx += 1
        seen_titles.add(title_key)

        uniq = list(dict.fromkeys(col_values[i]))  # preserve order, dedup
        # Seçim olabilme heuristiği: az unique, kisa degerler
        short_vals = [v for v in uniq if len(v) <= 80]
        if 2 <= len(short_vals) <= 25 and len(short_vals) >= max(2, len(uniq) * 0.8):
            # Multiple choice — tek secim varsaymak guvenli, gerekirse kullanici UI'dan coklu yapar
            choices = [{'label': v[:250]} for v in short_vals[:25]]
            fields.append({
                'title': title_key[:900],
                'type': 'multiple_choice',
                'properties': {
                    'randomize': False,
                    'allow_multiple_selection': False,
                    'allow_other_choice': True,
                    'vertical_alignment': True,
                    'choices': choices,
                },
            })
        else:
            # Uzun metin veya cesitli cevap -> long_text
            fields.append({
                'title': title_key[:900],
                'type': 'long_text',
            })
    return fields


def create_form(title, fields):
    body = json.dumps({'title': title, 'fields': fields}).encode('utf-8')
    req = urllib.request.Request(
        'https://api.typeform.com/forms',
        data=body,
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'body': e.read().decode('utf-8', 'ignore')}


for spec in FORMS:
    fields = build_fields(spec['csv'])
    print(f"→ {spec['title']}: {len(fields)} alan")
    r = create_form(spec['title'], fields)
    if 'error' in r:
        print(f"  HATA {r['error']}: {r['body'][:400]}")
    else:
        print(f"  id={r.get('id')}  public_url={r.get('_links',{}).get('display')}")
