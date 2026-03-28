import { Bindings } from '../types'

export class EmailService {
  constructor(private env: Bindings) {}

  private async sendEmail(to: string, subject: string, html: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.env.FROM_EMAIL || 'LEDGER <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('[EmailService] Resend API Error:', error)
      throw new Error('Failed to send email via Resend')
    }

    return await res.json()
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const webUrl = this.env.WEB_URL || 'https://ledger.gpnet.dev'
    const resetLink = `${webUrl}/#/login?reset_token=${token}`

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Credential Reconstruction Protocol</h2>
        <p style="color: #475569; line-height: 1.6;">A security recovery has been initiated for your account. Use the button below to establish a new credential and regain access to the platform.</p>
        <div style="margin: 32px 0;">
          <a href="${resetLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reconstruct Credential</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">If you did not request this recovery, please ignore this email. This link will expire in 60 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">LEDGER System Intelligence</p>
      </div>
    `

    console.log('[EmailService] Sending recovery email to:', to)
    return await this.sendEmail(to, 'Action Required: Forensic Recovery Protocol', html)
  }
}
