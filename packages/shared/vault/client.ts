/**
 * 🛡️ Fleet Vault Client — Shared SDK
 * Allows any Fleet Application (Food, Globot, Butlarr, Voyarr, Groupcord, I-Am, Ledger, Lets-Draw-Down)
 * to dynamically and securely query, resolve, and sync credentials from Foundation's central 1Password vault.
 */

export interface FleetVaultClientOptions {
  baseUrl?: string; // defaults to process.env.FOUNDATION_URL || 'https://foundation.gpnet.dev'
  apiKey?: string; // defaults to process.env.FLEET_APP_KEY || process.env.X_FLEET_KEY
  appId?: string; // e.g. 'food', 'globot', 'butlarr', 'voyarr', 'groupcord', 'i-am', 'ledger', 'lets-draw-down'
  fetchImpl?: typeof fetch;
}

export interface OpVaultSummary {
  id: string;
  name: string;
  description?: string;
  items?: number;
}

export interface OpSecretItem {
  id: string;
  vaultId?: string;
  title: string;
  category: string;
  tags?: string[];
  fields?: Array<{ label: string; value?: string; type?: string; purpose?: string }>;
  notesPlain?: string;
}

export class FleetVaultClient {
  private baseUrl: string;
  private apiKey: string;
  private appId: string;
  private fetchImpl: typeof fetch;

  constructor(opts: FleetVaultClientOptions = {}) {
    this.baseUrl = (
      opts.baseUrl ||
      (typeof process !== 'undefined' && process.env?.FOUNDATION_URL) ||
      'https://foundation.gpnet.dev'
    ).replace(/\/+$/, '');

    this.apiKey =
      opts.apiKey ||
      (typeof process !== 'undefined' && (process.env?.FLEET_APP_KEY || process.env?.X_FLEET_KEY)) ||
      '';

    this.appId =
      opts.appId ||
      (typeof process !== 'undefined' && process.env?.PROJECT_ID) ||
      'fleet-app';

    this.fetchImpl = opts.fetchImpl || fetch.bind(globalThis);
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1/fleet/${endpoint.replace(/^\/+/, '')}`;
    const headers = {
      'X-Fleet-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    const res = await this.fetchImpl(url, { ...options, headers });
    if (!res.ok) {
      let errDetail = '';
      try {
        const body = (await res.json()) as any;
        errDetail = body.error || body.detail || '';
      } catch {
        errDetail = await res.text();
      }
      throw new Error(`[FleetVaultClient] Request failed (${res.status}): ${errDetail || res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  /** List all vaults permitted for this Fleet Application */
  async listVaults(): Promise<OpVaultSummary[]> {
    const data = await this.request<{ success: boolean; vaults: OpVaultSummary[] }>('vaults');
    return data.vaults || [];
  }

  /** List all scoped items within a specific vault */
  async listItems(vaultId: string = '6wgu5yz5yphvacdimgc64ej65i'): Promise<OpSecretItem[]> {
    const data = await this.request<{ success: boolean; items: OpSecretItem[] }>(`vaults/${vaultId}/items`);
    return data.items || [];
  }

  /** Get a single secret item with full decrypted fields */
  async getItem(vaultId: string, itemId: string): Promise<OpSecretItem> {
    const data = await this.request<{ success: boolean; item: OpSecretItem }>(`vaults/${vaultId}/items/${itemId}`);
    return data.item;
  }

  /**
   * Convenience: Fetch a specific secret field value by name across items.
   * e.g. await client.getSecret('DISCORD_BOT_TOKEN') or await client.getSecret('DATABASE_URL')
   */
  async getSecret(keyName: string, vaultId: string = '6wgu5yz5yphvacdimgc64ej65i'): Promise<string | null> {
    const items = await this.listItems(vaultId);
    for (const item of items) {
      try {
        const full = await this.getItem(vaultId, item.id);
        const field = full.fields?.find(
          f => f.label.toUpperCase() === keyName.toUpperCase() || f.label.toLowerCase() === keyName.toLowerCase()
        );
        if (field?.value) return field.value;
      } catch {
        // Continue searching other items
      }
    }
    return null;
  }

  /** Push new credentials or secrets to the vault */
  async pushCredentials(payload: {
    vaultId?: string;
    title: string;
    category?: string;
    fields: Array<{ label: string; value: string; type?: string; purpose?: string }>;
    tags?: string[];
  }) {
    return this.request('credentials/push', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /** Pull all matching credentials for this fleet application */
  async pullCredentials(prefix?: string, vaultId?: string): Promise<OpSecretItem[]> {
    const data = await this.request<{ success: boolean; items: OpSecretItem[] }>('credentials/pull', {
      method: 'POST',
      body: JSON.stringify({ prefix, vaultId })
    });
    return data.items || [];
  }
}
