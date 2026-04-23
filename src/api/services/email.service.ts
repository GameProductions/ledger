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
        <h2 style="color: #0f172a; margin-top: 0;">Password Reset Procedure</h2>
        <p style="color: #475569; line-height: 1.6;">A password reset has been initiated for your account. Use the button below to set a new password and regain access to the platform.</p>
        <div style="margin: 32px 0;">
          <a href="${resetLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">If you did not request this, please ignore this email. This link will expire in 60 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">LEDGER System</p>
      </div>
    `

    return await this.sendEmail(to, 'Action Required: Account Recovery Procedure', html)
  }

  async sendProvisioningEmail(to: string, username: string, temporaryPass: string) {
    const webUrl = this.env.WEB_URL || 'https://ledger.gpnet.dev'
    const loginLink = `${webUrl}/#/login`

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">New Account Setup</h2>
        <p style="color: #475569; line-height: 1.6;">An administrator has created a new account for you on the LEDGER platform. Your initial login details are listed below.</p>
        <div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="margin-bottom: 12px;"><strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Username:</strong> <code style="color: #0f172a; font-weight: bold;">${username}</code></div>
          <div><strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Temporary Password:</strong> <code style="color: #0f172a; font-weight: bold;">${temporaryPass}</code></div>
        </div>
        <div style="margin: 32px 0;">
          <a href="${loginLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Log In</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">You will be required to set a new high-security password upon your first login.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">LEDGER System</p>
      </div>
    `

    return await this.sendEmail(to, 'Account Activated: Welcome to Ledger', html)
  }

  async sendInvitationEmail(to: string, householdName: string, inviteUrl: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Household Invitation</h2>
        <p style="color: #475569; line-height: 1.6;">You have been invited to join a household: <strong style="color: #0f172a;">${householdName}</strong>. This will allow for shared financial tracking and budgeting.</p>
        <div style="margin: 32px 0;">
          <a href="${inviteUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Accept Invitation</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">If you were not expecting this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">LEDGER System</p>
      </div>
    `

    return await this.sendEmail(to, `Action Required: Household Invitation (${householdName})`, html)
  }

  async sendSecurityAlertEmail(to: string, action: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #ef4444; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #ef4444; margin-top: 0;">Security Alert: Account Change</h2>
        <p style="color: #475569; line-height: 1.6;">A security-critical change has been detected on your account: <strong style="color: #0f172a;">${action}</strong>.</p>
        <p style="color: #475569; line-height: 1.6;">If this was performed by you, no further action is required. If you did not authorize this change, please initiate an **Account Recovery Procedure** immediately.</p>
        <hr style="border: 0; border-top: 1px solid #fecaca; margin: 32px 0;" />
        <p style="color: #b91c1c; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Security System Active</p>
      </div>
    `

    return await this.sendEmail(to, 'CRITICAL: Security Alert', html)
  }
}
