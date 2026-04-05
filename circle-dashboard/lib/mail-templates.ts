export interface MailTemplate {
  id: string
  name: string
  subject: string
  render: (vars: TemplateVars) => string
}

export interface TemplateVars {
  firstName: string
  lastName?: string
  [key: string]: string | undefined
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px 40px;">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Divizyon</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Açık İnovasyon Ağı</p>
      </div>
      <!-- Body -->
      <div style="padding:40px;">
        ${content}
      </div>
      <!-- Footer -->
      <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
          Bu mail Divizyon Açık İnovasyon Ağı tarafından gönderilmiştir.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export const MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: 'kesin-kabul',
    name: 'Kesin Kabul',
    subject: 'Divizyon Ağına Hoş Geldiniz!',
    render: (vars) => layout(`
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Tebrikler, ${vars.firstName}! 🎉</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Başvurunuzu değerlendirdik ve sizi <strong>Divizyon Açık İnovasyon Ağı</strong>'na kabul etmekten mutluluk duyuyoruz.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Oryantasyon sürecimiz hakkında yakında sizinle iletişime geçeceğiz. Bu süreçte ağımızın nasıl çalıştığını, projelerimizi ve sizden beklentilerimizi paylaşacağız.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Herhangi bir sorunuz olursa bize ulaşmaktan çekinmeyin.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Sevgilerle,<br><strong>Divizyon Ekibi</strong>
      </p>
    `),
  },
  {
    id: 'kesin-ret',
    name: 'Kesin Ret (Genel)',
    subject: 'Başvurunuz Hakkında',
    render: (vars) => layout(`
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Merhaba ${vars.firstName},</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Başvurunuzu dikkatle inceledik. Maalesef bu dönem için başvurunuzu olumlu sonuçlandıramadık.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Bu durum sizin yetkinliklerinizle ilgili değil, mevcut dönem ihtiyaçlarımız ve kontenjanımızla ilgilidir. Gelecek dönemlerde tekrar başvurmanızı memnuniyetle karşılarız.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        İlginiz için teşekkür ederiz.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Saygılarımızla,<br><strong>Divizyon Ekibi</strong>
      </p>
    `),
  },
  {
    id: 'kesin-ret-18yas',
    name: 'Kesin Ret — 18 Yaş Altı',
    subject: 'Başvurunuz Hakkında — Yaş Kriteri',
    render: (vars) => layout(`
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Merhaba ${vars.firstName},</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Divizyon Açık İnovasyon Ağı'na gösterdiğin ilgi için teşekkür ederiz. Başvurunu inceledik ancak topluluğumuzun katılım koşulları gereği, <strong>18 yaşını doldurmuş olmak</strong> ağımıza katılım için zorunlu bir kriterdir.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Bu kriter, topluluk içi iş birliklerinin ve projelerin sağlıklı yürütülebilmesi için belirlenmiştir. Yaş kriterini sağladığında tekrar başvurmanı memnuniyetle karşılarız.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        O zamana kadar kendini geliştirmeye devam etmeni, projeler üretmeni ve portfolyonu güçlendirmeni öneririz. Bir sonraki başvurunda seni aramızda görmek isteriz!
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        İlgin için teşekkür ederiz.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Saygılarımızla,<br><strong>Divizyon Ekibi</strong>
      </p>
    `),
  },
  {
    id: 'kesin-ret-topluluk',
    name: 'Kesin Ret — Topluluk İlkeleri',
    subject: 'Başvurunuz Hakkında — Topluluk İlkeleri',
    render: (vars) => layout(`
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Merhaba ${vars.firstName},</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Divizyon Açık İnovasyon Ağı'na gösterdiğin ilgi için teşekkür ederiz. Başvurunu değerlendirdik, ancak başvuru sürecinde <strong>topluluk ilkelerimizin kabul edilmediğini</strong> tespit ettik.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Topluluk ilkelerimiz, ağımızın temelini oluşturan değerlerdir ve tüm üyelerimizin bu ilkeleri benimsemesi beklenmektedir. İlkelerimiz; açık iş birliği, karşılıklı saygı, bilgi paylaşımı ve sürdürülebilir katkıyı kapsamaktadır.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Topluluk ilkelerimizi inceleyip benimsediğinde gelecek dönemlerde tekrar başvurabilirsin.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        İlgin için teşekkür ederiz.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Saygılarımızla,<br><strong>Divizyon Ekibi</strong>
      </p>
    `),
  },
  {
    id: 'beklemede',
    name: 'Beklemede',
    subject: 'Başvurunuz Değerlendiriliyor',
    render: (vars) => layout(`
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Merhaba ${vars.firstName},</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Başvurunuz şu anda değerlendirme aşamasındadır. Ekibimiz başvurunuzu inceliyor ve en kısa sürede size dönüş yapacağız.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Sabırınız için teşekkür ederiz.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Saygılarımızla,<br><strong>Divizyon Ekibi</strong>
      </p>
    `),
  },
  {
    id: 'oryantasyon',
    name: 'Oryantasyon Daveti',
    subject: 'Oryantasyon Programına Davetlisiniz',
    render: (vars) => layout(`
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Merhaba ${vars.firstName},</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Divizyon Açık İnovasyon Ağı oryantasyon programına davetlisiniz! Bu program sırasında ağımızın işleyişi, projelerimiz ve iş birliği süreçlerimiz hakkında detaylı bilgi edineceksiniz.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Detaylar ve katılım bilgileri için aşağıdaki butona tıklayın.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="#" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
          Detayları Gör
        </a>
      </div>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Görüşmek üzere,<br><strong>Divizyon Ekibi</strong>
      </p>
    `),
  },
  {
    id: 'bilgilendirme',
    name: 'Genel Bilgilendirme',
    subject: 'Divizyon - Bilgilendirme',
    render: (vars) => layout(`
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Merhaba ${vars.firstName},</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Sizinle paylaşmak istediğimiz bir güncellememiz var. Detaylar için bizimle iletişime geçebilirsiniz.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Saygılarımızla,<br><strong>Divizyon Ekibi</strong>
      </p>
    `),
  },
]

export function getTemplate(id: string): MailTemplate | undefined {
  return MAIL_TEMPLATES.find((t) => t.id === id)
}
