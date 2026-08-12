import { Hono } from 'hono'
import { Bindings, Variables } from '../types'

const addressRoutes = new Hono<{ Bindings: Bindings, Variables: Variables }>()

addressRoutes.get('/autocomplete', async (c) => {
  const query = c.req.query('q')
  if (!query || query.trim().length < 2) {
    return c.json({ success: true, suggestions: [] })
  }

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=6`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Ledger-Household-Address-Service/1.0' }
    })

    if (!res.ok) {
      return c.json({ success: true, suggestions: [] })
    }

    const data = await res.json() as any
    const suggestions = (data.features || []).map((f: any) => {
      const props = f.properties || {}
      const streetName = props.street || props.name || ''
      const houseNum = props.housenumber || ''
      const fullStreet = houseNum && streetName ? `${houseNum} ${streetName}` : (streetName || houseNum)
      const city = props.city || props.town || props.village || props.district || ''
      const state = props.state || ''
      const postalCode = props.postcode || ''
      const country = props.country || ''

      const formattedParts = [fullStreet, city, state, postalCode, country].filter(Boolean)
      const formatted = formattedParts.join(', ')

      return {
        formatted: formatted || props.name || 'Unknown Location',
        street: fullStreet,
        city,
        state,
        postalCode,
        country,
      }
    }).filter((s: any) => s.formatted)

    return c.json({ success: true, suggestions })
  } catch (err: any) {
    console.error('Address autocomplete lookup failed:', err)
    return c.json({ success: true, suggestions: [] })
  }
})

export default addressRoutes
