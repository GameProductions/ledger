/**
 * getForensics: Extract standardized network and device metadata from Hono context.
 * [FLEET-STANDARD] Consistent with Fleet Forensic Standard v6.1.
 */
export const getForensics = (c: any) => {
  const req = c.req || c;
  const connectingIp = req.header('cf-connecting-ip') || req.header('x-forwarded-for') || '0.0.0.0';
  const userAgent = req.header('user-agent') || 'Unknown';
  
  // Cloudflare Geolocation & Network
  const cf = req.raw?.cf || {};
  const city = cf.city || req.header('cf-ipcity') || 'Unknown';
  const country = cf.country || req.header('cf-ipcountry') || 'Unknown';
  const region = cf.region || req.header('cf-region') || 'Unknown';
  const latitude = cf.latitude || '0';
  const longitude = cf.longitude || '0';
  
  const isV6 = connectingIp.includes(':');
  
  return {
    connectingIp,
    ipV4: isV6 ? null : connectingIp,
    ipV6: isV6 ? connectingIp : null,
    userAgent,
    city,
    country,
    region,
    latitude,
    longitude,
    location: `${city}, ${country}`
  };
};
