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

addressRoutes.post('/autocomplete', async (c) => {
  try {
    const body = await c.req.json()
    const { input, sessionToken } = body
    if (!input || !c.env.GOOGLE_MAPS_API_KEY) {
      return c.json({ success: true, suggestions: [] })
    }

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': c.env.GOOGLE_MAPS_API_KEY
      },
      body: JSON.stringify({ input, sessionToken })
    })

    if (!res.ok) {
      return c.json({ success: true, suggestions: [] })
    }

    const data = await res.json() as any
    const suggestions = (data.suggestions || []).map((s: any) => {
      const p = s.placePrediction
      return {
        placeId: p.placeId,
        mainText: p.text?.mainText,
        secondaryText: p.text?.secondaryText,
        formatted: p.text?.text
      }
    })

    return c.json({ success: true, suggestions })
  } catch (err: any) {
    console.error('Google Places autocomplete failed:', err)
    return c.json({ success: true, suggestions: [] })
  }
})

addressRoutes.post('/place-details', async (c) => {
  try {
    const body = await c.req.json()
    const { placeId, sessionToken } = body
    if (!placeId || !c.env.GOOGLE_MAPS_API_KEY) {
      return c.json({ success: false, error: 'Invalid place or missing API key' }, 400)
    }

    const url = `https://places.googleapis.com/v1/places/${placeId}` + (sessionToken ? `?sessionToken=${sessionToken}` : '')
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': c.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'addressComponents,formattedAddress'
      }
    })

    if (!res.ok) {
      return c.json({ success: false, error: 'Failed to fetch place details' }, 400)
    }

    const data = await res.json() as any
    
    let streetNum = ''
    let route = ''
    let city = ''
    let state = ''
    let postalCode = ''
    let country = ''

    if (data.addressComponents) {
      for (const component of data.addressComponents) {
        const types = component.types || []
        if (types.includes('street_number')) streetNum = component.shortText
        if (types.includes('route')) route = component.longText
        if (types.includes('locality') || types.includes('sublocality')) city = component.longText
        if (types.includes('administrative_area_level_1')) state = component.shortText
        if (types.includes('postal_code')) postalCode = component.shortText
        if (types.includes('country')) country = component.shortText
      }
    }

    const street = [streetNum, route].filter(Boolean).join(' ')
    
    return c.json({ 
      success: true, 
      data: {
        formatted: data.formattedAddress,
        street,
        city,
        state,
        postalCode,
        country
      }
    })
  } catch (err: any) {
    console.error('Google Places details failed:', err)
    return c.json({ success: false, error: 'Failed to fetch place details' }, 500)
  }
})

export default addressRoutes
