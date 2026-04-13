#!/usr/bin/env python3
"""Test başvurusu: tunabstncx@gmail.com tüm alanlar dolu.
TypeForm API response submit desteklemediği için /api/applications POST kullanır.
Sonuç: Sheets → n8n akışı ile aynı application kaydı oluşur.
"""
import json, urllib.request, urllib.error, sys

DASHBOARD_URL = 'http://localhost:3000'

payload = {
    'email': 'tunabstncx@gmail.com',
    'full_name': 'Tuna Bostancı',
    'birth_date': '15/06/1998',
    'gender': 'Erkek',
    'phone': '05387227258',
    'professional_status': 'Öğrenci',
    'university': 'İstanbul Teknik Üniversitesi',
    'university_other': None,
    'department': 'Bilgisayar Mühendisliği',
    'education_type': 'Lisans',
    'work_detail': 'Freelance full-stack geliştirici, n8n ve Next.js tabanlı iç araçlar üzerinde çalışıyorum.',
    'main_role': 'Dijital Ürün Geliştiricisi',
    'role_creative_content': 'Arayüz tasarımı ve kullanıcı deneyimi iyileştirmeleri',
    'role_visual_designer': 'Figma ve Adobe XD ile mockup hazırlama',
    'role_animation': None,
    'role_video_content': None,
    'role_audio_music': None,
    'role_digital_asset': 'Design token ve bileşen kütüphanesi kurulumu',
    'role_digital_product': 'Next.js 14 + Supabase ile uçtan uca SaaS',
    'role_web_app': 'React / Next.js / Tailwind / TypeScript',
    'role_advanced_tech': 'AI entegrasyonları (OpenAI, Anthropic), vector DB',
    'role_game': None,
    'role_digital_experience': 'Etkileşimli dashboard deneyimleri',
    'role_uiux': 'User flow tasarımı, usability testing',
    'role_interactive': None,
    'role_installation': None,
    'role_interdisciplinary': 'Yazılım + tasarım + otomasyon kesişiminde çalışıyorum',
    'core_values': 'Şeffaflık, sürekli öğrenme, topluluk katkısı',
    'community_contribution': 'Açık kaynak katkıları, mentorluk, workshop düzenleme',
    'ecosystem_contribution': 'Yerel girişim ekosistemine yazılım gönüllülüğü',
    'self_expression': 'Ürün odaklı, detaycı, geri bildirime açık. Ekip içinde sistem kurmaya çalışırım.',
    'video_link': 'https://tunabostancibasi.com/intro.mp4',
    'plan_description': 'Önümüzdeki 12 ayda 3 iç araç + 1 açık kaynak SaaS şablonu yayımlamak.',
    'principle_1': 'Okudum ve anladım',
    'principle_2': 'Okudum ve anladım',
    'principle_3': 'Okudum ve anladım',
    'principle_4': 'Okudum ve anladım',
    'principle_5': 'Okudum ve anladım',
    'principle_6': 'Okudum ve anladım',
    'principle_7': 'Okudum ve anladım',
    'principle_8': 'Okudum ve anladım',
    'principle_9': 'Okudum ve anladım',
    'principle_10': 'Okudum ve anladım',
    'future_ideas': 'Yaratıcı topluluklar için merkezi olmayan kimlik ve itibar sistemi.',
    'feedback_experience': 'Kod review süreçlerinde netleştirici sorular sormayı ve alternatif önerileri severim.',
    'project_steps': 'Keşif → prototip → kullanıcı testi → iterasyon → yayın',
    'curiosity_topic': 'LLM tabanlı ajan mimarileri ve MCP protokolü',
    'additional_notes': 'Test başvurusu — 2026-04-12',
    'source': 'test-seed',
    'submitted_at': '2026-04-12T18:00:00+00:00',
    'status': 'basvuru',
    'created_by': 'seed-script',
}

body = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    f'{DASHBOARD_URL}/api/applications',
    data=body,
    headers={'Content-Type': 'application/json'},
    method='POST',
)
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        out = json.loads(resp.read().decode('utf-8'))
        app = out.get('data', {})
        print(f"✅ Başvuru oluşturuldu")
        print(f"   id={app.get('id')}")
        print(f"   full_name={app.get('full_name')}")
        print(f"   email={app.get('email')}")
        print(f"   status={app.get('status')}")
        print(f"   phone={app.get('phone')}")
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', 'ignore')
    print(f"❌ HTTP {e.code}: {body[:500]}")
    sys.exit(1)
