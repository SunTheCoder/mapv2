'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const S3_URLS = {
  states: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/us-state-boundaries.geojson',
  distress: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/distressed.geojson',
  reservations: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/other_reservation.geojson'
}

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [layerVisibility, setLayerVisibility] = useState({
    states: true,
    distressed: true,
    reservations: true
  })

  const toggleLayer = (layerId) => {
    const visibility = !layerVisibility[layerId]
    setLayerVisibility(prev => ({...prev, [layerId]: visibility}))
    map.current.setLayoutProperty(
      `${layerId}-layer`,
      'visibility',
      visibility ? 'visible' : 'none'
    )
  }

  useEffect(() => {
    if (!mapContainer.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-95, 40], // Center on US
      zoom: 3
    })

    map.current.on('load', async () => {
      try {
        // Load all datasets
        const [statesResponse, distressResponse, reservationsResponse] = await Promise.all([
          fetch(S3_URLS.states),
          fetch(S3_URLS.distress),
          fetch(S3_URLS.reservations)
        ])

        if (!statesResponse.ok || !distressResponse.ok || !reservationsResponse.ok) {
          throw new Error('Failed to fetch data')
        }

        const [statesData, distressData, reservationsData] = await Promise.all([
          statesResponse.json(),
          distressResponse.json(),
          reservationsResponse.json()
        ])

        // Add sources
        map.current.addSource('states', {
          type: 'geojson',
          data: statesData
        })

        map.current.addSource('distressed', {
          type: 'geojson',
          data: distressData
        })

        map.current.addSource('reservations', {
          type: 'geojson',
          data: reservationsData
        })

        // Add layers
        map.current.addLayer({
          id: 'states-layer',
          type: 'line',
          source: 'states',
          paint: {
            'line-color': '#000',
            'line-width': 1
          }
        })

        map.current.addLayer({
          id: 'distressed-layer',
          type: 'fill',
          source: 'distressed',
          paint: {
            'fill-color': '#ff0000',
            'fill-opacity': 0.3
          }
        })

        map.current.addLayer({
          id: 'reservations-layer',
          type: 'fill',
          source: 'reservations',
          paint: {
            'fill-color': '#00ff00',
            'fill-opacity': 0.3
          }
        })

        // Add hover effects
        const layers = ['distressed-layer', 'reservations-layer']
        layers.forEach(layer => {
          map.current.on('mousemove', layer, (e) => {
            if (e.features.length > 0) {
              map.current.getCanvas().style.cursor = 'pointer'
            }
          })

          map.current.on('mouseleave', layer, () => {
            map.current.getCanvas().style.cursor = ''
          })
        })

      } catch (error) {
        console.error('Error loading GeoJSON:', error)
      }
    })

    return () => map.current?.remove()
  }, [])

  return (
    <>
      <div 
        ref={mapContainer} 
        style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} 
      />
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'white',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
      }}>
        <div>
          <label>
            <input
              type="checkbox"
              checked={layerVisibility.states}
              onChange={() => toggleLayer('states')}
            />
            State Boundaries
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={layerVisibility.distressed}
              onChange={() => toggleLayer('distressed')}
            />
            Distressed Areas
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={layerVisibility.reservations}
              onChange={() => toggleLayer('reservations')}
            />
            Reservations
          </label>
        </div>
      </div>
    </>
  )
} 