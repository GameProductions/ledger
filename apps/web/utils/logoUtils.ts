const CLEARBIT_BASE = 'https://logo.clearbit.com'
const GOOGLE_FAVICON_BASE = 'https://www.google.com/s2/favicons'

export function deriveDomain(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9. ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return ''

  const knownDomains: Record<string, string> = {
    netflix: 'netflix.com',
    spotify: 'spotify.com',
    hulu: 'hulu.com',
    disney: 'disneyplus.com',
    'disney+': 'disneyplus.com',
    hbo: 'hbomax.com',
    'hbo max': 'hbomax.com',
    max: 'hbomax.com',
    paramount: 'paramountplus.com',
    'paramount+': 'paramountplus.com',
    peacock: 'peacocktv.com',
    apple: 'apple.com',
    'apple music': 'apple.com',
    'apple tv': 'apple.com',
    'apple one': 'apple.com',
    'google one': 'one.google.com',
    'google drive': 'google.com',
    'youtube premium': 'youtube.com',
    'youtube music': 'youtube.com',
    'youtube tv': 'youtube.com',
    twitch: 'twitch.tv',
    patreon: 'patreon.com',
    'adobe creative cloud': 'adobe.com',
    adobe: 'adobe.com',
    'microsoft 365': 'microsoft.com',
    'office 365': 'microsoft.com',
    github: 'github.com',
    notion: 'notion.so',
    figma: 'figma.com',
    slack: 'slack.com',
    discord: 'discord.com',
    zoom: 'zoom.us',
    'google workspace': 'workspace.google.com',
    aws: 'aws.amazon.com',
    digitalocean: 'digitalocean.com',
    vercel: 'vercel.com',
    netlify: 'netlify.com',
    heroku: 'heroku.com',
    dropbox: 'dropbox.com',
    'icloud+': 'apple.com',
    nordvpn: 'nordvpn.com',
    expressvpn: 'expressvpn.com',
    '1password': '1password.com',
    lastpass: 'lastpass.com',
    dashlane: 'dashlane.com',
    'new york times': 'nytimes.com',
    'ny times': 'nytimes.com',
    nyt: 'nytimes.com',
    'washington post': 'washingtonpost.com',
    medium: 'medium.com',
    substack: 'substack.com',
    chatgpt: 'openai.com',
    'open ai': 'openai.com',
    openai: 'openai.com',
    midjourney: 'midjourney.com',
    copilot: 'github.com',
    'microsoft copilot': 'microsoft.com',
    'google gemini': 'google.com',
    gemini: 'google.com',
  }

  const lower = cleaned.toLowerCase()
  const known = knownDomains[lower]
  if (known) return known

  const words = lower.split(' ')
  const lastWord = words[words.length - 1]

  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(lastWord)) {
    return `${lastWord}.com`
  }

  return ''
}

export function getClearbitUrl(domain: string): string {
  return `${CLEARBIT_BASE}/${domain}`
}

export function getGoogleFaviconUrl(domain: string, size = 128): string {
  return `${GOOGLE_FAVICON_BASE}?domain=${domain}&sz=${size}`
}

export function autoFetchLogo(name: string): { clearbit: string; google: string } | null {
  const domain = deriveDomain(name)
  if (!domain) return null
  return {
    clearbit: getClearbitUrl(domain),
    google: getGoogleFaviconUrl(domain),
  }
}
