/**
 * Simple script to register Discord slash commands for LEDGER.
 * Run with: npx tsx src/register-commands.ts
 */

const TOKEN = process.env.DISCORD_TOKEN;
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

if (!TOKEN) {
  console.error('Error: DISCORD_TOKEN is not set.');
  process.exit(1);
}

const commands = [
  {
    name: 'ledger-safety',
    description: '🛡️ Check your LEDGER safety number and spendable cash.',
  },
];

async function registerCommands() {
  try {
    // 1. Get Application ID from @me
    console.log('Fetching Application ID...');
    const meRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${TOKEN}` },
    });
    
    if (!meRes.ok) {
      throw new Error(`Failed to fetch @me: ${meRes.statusText}`);
    }
    
    const me = await meRes.json() as any;
    const appId = me.id;
    console.log(`Application ID: ${appId}`);

    // 2. Register Global Commands
    console.log(`Registering ${commands.length} commands...`);
    const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (res.ok) {
      console.log('✅ Successfully registered commands.');
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else {
      const error = await res.text();
      throw new Error(`Failed to register commands: ${res.status} ${error}`);
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    process.exit(1);
  }
}

registerCommands();
