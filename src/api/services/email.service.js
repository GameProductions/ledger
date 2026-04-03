export class EmailService {
    env;
    constructor(env) {
        this.env = env;
    }
    async sendEmail(to, subject, html) {
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
        });
        if (!res.ok) {
            const error = await res.text();
            console.error('[EmailService] Resend API Error:', error);
            throw new Error('Failed to send email via Resend');
        }
        return await res.json();
    }
    async sendPasswordResetEmail(to, token) {
        const webUrl = this.env.WEB_URL || 'https://ledger.gpnet.dev';
        const resetLink = `${webUrl}/#/login?reset_token=${token}`;
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
    `;
        return await this.sendEmail(to, 'Action Required: Forensic Recovery Protocol', html);
    }
    async sendProvisioningEmail(to, username, temporaryPass) {
        const webUrl = this.env.WEB_URL || 'https://ledger.gpnet.dev';
        const loginLink = `${webUrl}/#/login`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Account Provisioning Protocol</h2>
        <p style="color: #475569; line-height: 1.6;">An administrative node has provisioned a new identity for you on the LEDGER platform. Your initial access credentials have been established below.</p>
        <div style="margin: 32px 0; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="margin-bottom: 12px;"><strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">System Handle:</strong> <code style="color: #0f172a; font-weight: bold;">${username}</code></div>
          <div><strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Temporary Key:</strong> <code style="color: #0f172a; font-weight: bold;">${temporaryPass}</code></div>
        </div>
        <div style="margin: 32px 0;">
          <a href="${loginLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Initialize Session</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">You will be required to establish a new forensic-grade credential upon your first successful login.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">LEDGER System Intelligence</p>
      </div>
    `;
        return await this.sendEmail(to, 'Protocol Initialized: Operation Onboarding', html);
    }
    async sendInvitationEmail(to, householdName, inviteUrl) {
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Territory Deployment Request</h2>
        <p style="color: #475569; line-height: 1.6;">You have been requested to join a secure household territory: <strong style="color: #0f172a;">${householdName}</strong>. This will allow for synchronized intelligence gathering and financial tracking.</p>
        <div style="margin: 32px 0;">
          <a href="${inviteUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Accept Deployment</a>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">If you were not expecting this request, please ignore this transmission.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">LEDGER System Intelligence</p>
      </div>
    `;
        return await this.sendEmail(to, `Action Required: Territory Deployment (${householdName})`, html);
    }
    async sendSecurityAlertEmail(to, action) {
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #ef4444; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #ef4444; margin-top: 0;">Sentinel Alert: Node Modification</h2>
        <p style="color: #475569; line-height: 1.6;">A security-critical modification has been detected on your account node: <strong style="color: #0f172a;">${action}</strong>.</p>
        <p style="color: #475569; line-height: 1.6;">If this was performed by you, no further action is required. If you did not authorize this change, please initiate a **Forensic Recovery Protocol** immediately.</p>
        <hr style="border: 0; border-top: 1px solid #fecaca; margin: 32px 0;" />
        <p style="color: #b91c1c; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Sentinel System Active</p>
      </div>
    `;
        return await this.sendEmail(to, 'CRITICAL: Sentinel Security Alert', html);
    }
}
