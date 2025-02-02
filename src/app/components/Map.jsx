'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const REGION_COLORS = {
  'Northeast': '#69C3E5',       // Light Blue (Region 1)
  'East Central': '#FF6B6B',    // Coral Red (Region 2)
  'Southeast': '#FF9F5B',       // Orange (Region 3)
  'South Central': '#E5A1E5',   // Light Purple (Region 4)
  'West Central': '#FFE066',    // Yellow (Region 5)
  'Pacific West': '#98E698',    // Light Green (Region 6)
  'Native Tribes': '#7FDBDA'    // Turquoise (Region 6 Native Tribes)
}

const REGION_STATES = {
  'Pacific West': ['WA', 'OR', 'CA', 'NV', 'AK', 'HI', 'AS', 'GU', 'MP'],
  'West Central': ['MT', 'ID', 'WY', 'UT', 'CO', 'AZ', 'NM', 'ND', 'SD', 'NE', 'KS', 'IA', 'MN', 'MO'],
  'South Central': ['TX', 'OK', 'AR', 'LA', 'MS', 'AL'],
  'East Central': ['WI', 'MI', 'IL', 'IN', 'OH', 'KY', 'TN', 'WV'],
  'Southeast': ['NC', 'SC', 'GA', 'FL', 'PR', 'VI', 'VA'],
  'Northeast': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'PA', 'NJ', 'DE', 'MD', 'DC']
}

const S3_URLS = {
  states: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/us-state-boundaries.geojson',
  reservations: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/other_reservation.geojson'
}

// Add this function to combine GeoJSON features
const combineGeoJSONFeatures = (geojsonArray) => {
  return {
    type: 'FeatureCollection',
    features: geojsonArray.flatMap(geojson => geojson.features)
  }
}

// Update the fitToAllEPAData function
const fitToAllEPAData = (map) => {
  // Default bounds for continental US
  map.fitBounds([
    [-125.0, 24.396308],
    [-66.93457, 49.384358]
  ], {
    padding: { top: 50, bottom: 50, left: 50, right: 350 },
    zoom: 4.1  // Set specific zoom level for EPA data
  })
}

// Update the fitToDistressedData function
const fitToDistressedData = (map) => {
  // Default bounds for continental US
  map.fitBounds([
    [-125.0, 24.396308],
    [-66.93457, 49.384358]
  ], {
    padding: { top: 50, bottom: 50, left: 50, right: 350 },
    zoom: 6.1  // Set specific zoom level for distressed data
  })
}

// Add this function with the other zoom functions at the top
const fitToSociallyDisadvantagedData = (map) => {
  map.fitBounds([
    [-125.0, 24.396308],
    [-66.93457, 49.384358]
  ], {
    padding: { top: 50, bottom: 50, left: 50, right: 350 },
    zoom: 5.1  // Set specific zoom level for socially disadvantaged data
  })
}

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [layerVisibility, setLayerVisibility] = useState({
    states: true,
    regions: true,
    distressed: true,
    reservations: true,
    epaDisadvantaged: true,
    sociallyDisadvantaged: true
  })
  const [currentZoom, setCurrentZoom] = useState(3)

  const toggleLayer = (layerId) => {
    const visibility = !layerVisibility[layerId]
    setLayerVisibility(prev => ({...prev, [layerId]: visibility}))
    
    try {
      if (layerId === 'regions') {
        // Toggle all region-specific layers
        Object.keys(REGION_COLORS).forEach(region => {
          const regionId = `region-${region.toLowerCase().replace(/\s+/g, '-')}`
          try {
            if (map.current.getLayer(regionId)) {
              map.current.setLayoutProperty(
                regionId,
                'visibility',
                visibility ? 'visible' : 'none'
              )
            }
          } catch (error) {
            console.warn(`Could not toggle region layer ${regionId}:`, error)
          }
        })
      } else if (layerId === 'epa-disadvantaged') {
        // Toggle all EPA layers
        for (let i = 1; i <= 7; i++) {
          const layerName = `epa-disadvantaged-layer-${i}`
          try {
            if (map.current.getLayer(layerName)) {
              map.current.setLayoutProperty(
                layerName,
                'visibility',
                visibility ? 'visible' : 'none'
              )
            }
          } catch (error) {
            console.warn(`Could not toggle EPA layer ${layerName}:`, error)
          }
        }
      } else if (layerId === 'reservations') {
        ['reservations-layer', 'reservations-outline-layer'].forEach(layerName => {
          if (map.current.getLayer(layerName)) {
            map.current.setLayoutProperty(
              layerName,
              'visibility',
              visibility ? 'visible' : 'none'
            )
          }
        })
      } else if (layerId === 'sociallyDisadvantaged') {
        // Toggle all socially disadvantaged layers
        for (let i = 1; i <= 8; i++) {
          const layerName = `socially-disadvantaged-layer-${i}`
          try {
            if (map.current.getLayer(layerName)) {
              map.current.setLayoutProperty(
                layerName,
                'visibility',
                visibility ? 'visible' : 'none'
              )
            }
          } catch (error) {
            console.warn(`Could not toggle socially disadvantaged layer ${layerName}:`, error)
          }
        }
      } else {
        const layerName = `${layerId}-layer`
        if (map.current.getLayer(layerName)) {
          map.current.setLayoutProperty(
            layerName,
            'visibility',
            visibility ? 'visible' : 'none'
          )
        }
      }
    } catch (error) {
      console.warn(`Error toggling layer ${layerId}:`, error)
    }
  }

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283],
      zoom: 3,
      accessToken: MAPBOX_TOKEN
    })

    let loadedLayers = 0
    const totalLayers = 7 // Number of EPA layers

    map.current.on('load', async () => {
      try {
        // Load states data
        const statesResponse = await fetch(S3_URLS.states)
        const statesData = await statesResponse.json()
        
        // Load reservations
        const reservationsResponse = await fetch(S3_URLS.reservations)
        const reservationsData = await reservationsResponse.json()

        // Add sources first
        map.current.addSource('states', {
          type: 'geojson',
          data: statesData
        })

        map.current.addSource('reservations', {
          type: 'geojson',
          data: reservationsData
        })

        // Add states layer FIRST
        map.current.addLayer({
          id: 'states-layer',
          type: 'line',
          source: 'states',
          paint: {
            'line-color': '#627BC1',
            'line-width': 1
          },
          layout: {
            visibility: layerVisibility.states ? 'visible' : 'none'
          }
        })

        // THEN add EPA layers
        for (let i = 1; i <= 7; i++) {
          const sourceId = `epa-disadvantaged-${i}`
          const layerId = `epa-disadvantaged-layer-${i}`
          
          const tilesetIds = {
            1: '0q99g7na',
            2: '3ydbspyo',
            3: 'awy856h9',
            4: '5gnzd6cr',
            5: '1r7dpj4s',
            6: 'avpfb5g6',
            7: '3o6ipd1b'
          }

          const chunkNames = {
            1: 'chunk1-02ygln',
            2: 'chunk2-5cjb35',
            3: 'chunk3-7jtncu',
            4: 'chunk4-1ijozj',
            5: 'chunk5-0co1hs',
            6: 'chunk6-4kprjw',
            7: 'chunk7-6h9546'
          }

          console.log(`Adding source ${sourceId} with tileset ID ${tilesetIds[i]}`)

          map.current.addSource(sourceId, {
            type: 'vector',
            url: `mapbox://sunthecoder.${tilesetIds[i]}`
          })

          try {
            map.current.addLayer({
              id: layerId,
              type: 'fill',
              source: sourceId,
              'source-layer': chunkNames[i],
              minzoom: 2,
              paint: {
                'fill-color': '#FF0000',
                'fill-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2, 0.2,
                  3, 0.3,
                  4, 0.5,
                  8, 0.8
                ],
                'fill-outline-color': '#000000'
              },
              layout: {
                visibility: layerVisibility.epaDisadvantaged ? 'visible' : 'none'
              }
            })
            console.log(`Added layer ${layerId} with source-layer ${chunkNames[i]}`)
          } catch (error) {
            console.error(`Error adding layer ${layerId}:`, error)
          }
        }

        // Update the socially disadvantaged layers section
        for (let i = 1; i <= 8; i++) {
          const sourceId = `socially-disadvantaged-${i}`
          const layerId = `socially-disadvantaged-layer-${i}`
          
          const tilesetIds = {
            1: '87npeomp',
            2: '3deopwhf',
            3: 'dttfx2ad',
            4: 'd7anenaa',
            5: 'dwogkz4d',
            6: '303ru0v2',
            7: 'bmh29r6h',
            8: '5un0jm7v'
          }

          const chunkNames = {
            1: 'chunk1-social-ckdarq',
            2: 'chunk2-social-68p1qu',
            3: 'chunk3-social-0hp514',
            4: 'chunk4-social-anksfz',
            5: 'chunk5-social-0fctz6',
            6: 'chunk6-social-4ctgn8',
            7: 'chunk7-social-646uk9',
            8: 'chunk8-social-5e0kvm'
          }

          console.log(`Adding socially disadvantaged source ${sourceId}`)

          map.current.addSource(sourceId, {
            type: 'vector',
            url: `mapbox://sunthecoder.${tilesetIds[i]}`
          })

          try {
            map.current.addLayer({
              id: layerId,
              type: 'fill',
              source: sourceId,
              'source-layer': chunkNames[i],
              minzoom: 2,
              paint: {
                'fill-color': '#9370DB',
                'fill-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2, 0.2,
                  3, 0.3,
                  4, 0.5,
                  8, 0.8
                ],
                'fill-outline-color': '#000000'
              },
              layout: {
                visibility: layerVisibility.sociallyDisadvantaged ? 'visible' : 'none'
              }
            }, 'states-layer')
            console.log(`Added layer ${layerId} with source-layer ${chunkNames[i]}`)
          } catch (error) {
            console.error(`Error adding socially disadvantaged layer ${layerId}:`, error)
          }
        }

        // Update the distressed source to use vector tiles API
        // console.log('Adding distressed source...')
        map.current.addSource('distressed', {
          type: 'vector',
          url: 'mapbox://sunthecoder.05as12la'  // Try using mapbox:// protocol first
        })

        // Update the distressed layer with similar settings to EPA layers
        // Add immediate logging for source
        const distressedSource = map.current.getSource('distressed')
        // console.log('Initial distressed source:', {
        //   source: distressedSource,
        //   vectorLayerIds: distressedSource.vectorLayerIds,
        //   tiles: distressedSource.tiles
        // })

        // Add source loading handler
        map.current.on('sourcedataloading', (e) => {
          if (e.sourceId === 'distressed') {
            // console.log('Distressed source loading:', e)
          }
        })

        // Add source data handler
        map.current.on('sourcedata', (e) => {
          if (e.sourceId === 'distressed') {
            const source = map.current.getSource('distressed')
            // console.log('Distressed source data event:', {
            //   isSourceLoaded: e.isSourceLoaded,
            //   source: source,
            //   vectorLayerIds: source.vectorLayerIds,
            //   tiles: source.tiles,
            //   loaded: source.loaded?.()
            // })

            if (e.isSourceLoaded && source.vectorLayerIds?.length > 0) {
              const sourceLayer = source.vectorLayerIds[0]
              // console.log('Adding distressed layer with source-layer:', sourceLayer)
              
              try {
                // Remove existing layer if it exists
                if (map.current.getLayer('distressed-layer')) {
                  map.current.removeLayer('distressed-layer')
                }

                // Add layer before states-layer but after regions
                const beforeLayer = map.current.getStyle().layers.find(layer => 
                  layer.id === 'states-layer' || layer.id.startsWith('epa-disadvantaged')
                )?.id || undefined

                map.current.addLayer({
                  id: 'distressed-layer',
                  type: 'fill',
                  source: 'distressed',
                  'source-layer': 'distressed-arilwv',
                  minzoom: 2, // Lower the minimum zoom level
                  paint: {
                    'fill-color': '#FFA07A',
                    'fill-opacity': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      2, 0.2,  // Start showing faintly at zoom level 2
                      3, 0.3,  // More visible at zoom 3
                      4, 0.4,  // More visible at zoom 4
                      8, 0.6   // Most visible at zoom 8
                    ],
                    'fill-outline-color': '#000000'
                  },
                  layout: {
                    visibility: layerVisibility.distressed ? 'visible' : 'none'
                  }
                }, beforeLayer)

                // Add debug logging
                // console.log('Distressed layer added with:', {
                //   sourceLayer: 'distressed-arilwv',
                //   visibility: layerVisibility.distressed ? 'visible' : 'none',
                //   beforeLayer
                // })

                // Check if layer exists and is visible
                const layer = map.current.getLayer('distressed-layer')
                const layout = map.current.getLayoutProperty('distressed-layer', 'visibility')
                // console.log('Distressed layer check:', {
                //   exists: !!layer,
                //   visibility: layout
                // })

                // Query features
                const features = map.current.querySourceFeatures('distressed', {
                  sourceLayer: 'distressed-arilwv'
                })
                // console.log('Distressed features found:', features.length)

              } catch (error) {
                console.error('Error adding distressed layer:', error)
              }
            }
          }
        })

        // Add source data logging for distressed layer too
        map.current.on('sourcedata', (e) => {
          if (e.sourceId === 'distressed' && e.isSourceLoaded) {
            const source = map.current.getSource('distressed')
            // console.log('Distressed source loaded:', {
            //   vectorLayerIds: source.vectorLayerIds,
            //   tiles: source.tiles,
            //   loaded: source.loaded()
            // })
          }
        })

        // Add region layers
        Object.entries(REGION_STATES).forEach(([region, states]) => {
          const regionFeatures = statesData.features.filter(feature => 
            states.includes(feature.properties.stusab)
          )

          const regionId = `region-${region.toLowerCase().replace(/\s+/g, '-')}`
          
          map.current.addSource(regionId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: regionFeatures
            }
          })

          map.current.addLayer({
            id: regionId,
            type: 'fill',
            source: regionId,
            paint: {
              'fill-color': REGION_COLORS[region],
              'fill-opacity': 0.3
            }
          })
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

        // Add this after all layers are added
        map.current.on('idle', () => {
          // Check what layers exist
          const layers = map.current.getStyle().layers;
          console.log('All map layers:', layers.map(l => l.id));

          // For each EPA layer, check if it has features
          for (let i = 1; i <= 7; i++) {
            const layerId = `epa-disadvantaged-layer-${i}`;
            if (map.current.getLayer(layerId)) {
              const features = map.current.querySourceFeatures(`epa-disadvantaged-${i}`, {
                sourceLayer: 'epa-disadvantaged'
              });
              console.log(`Features in ${layerId}:`, features.length);
            }
          }

          const bounds = map.current.getBounds();
          console.log('Current map bounds:', bounds);
          
          // Zoom to the data extent of one of the EPA layers
          const layerId = 'epa-disadvantaged-layer-1';
          if (map.current.getLayer(layerId)) {
            try {
              const features = map.current.querySourceFeatures(`epa-disadvantaged-1`, {
                sourceLayer: 'epa-disadvantaged'
              });
              if (features.length > 0) {
                console.log('Found features, fitting bounds');
                const coordinates = features.flatMap(f => 
                  f.geometry.type === 'Polygon' 
                    ? f.geometry.coordinates[0]
                    : f.geometry.coordinates.flatMap(ring => ring[0])
                );
                const bounds = coordinates.reduce((bounds, coord) => {
                  return bounds.extend(coord);
                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                
                map.current.fitBounds(bounds, { padding: 50 });
              }
            } catch (error) {
              console.error('Error fitting bounds:', error);
            }
          }
        });

        // Add this to check for specific errors
        map.current.on('error', (e) => {
          console.error('Mapbox error:', {
            error: e.error,
            source: e.source ? e.source.id : null,
            sourceLayer: e.sourceLayer
          });
        });

        // In your useEffect, after adding EPA layers:
        map.current.on('zoomend', () => {
          setCurrentZoom(map.current.getZoom())
        })

        // Add error handler specifically for distressed source/layer
        map.current.on('error', (e) => {
          if (e.sourceId === 'distressed' || (e.source && e.source.id === 'distressed')) {
            console.error('Distressed layer error:', {
              error: e.error,
              source: e.source,
              sourceLayer: e.sourceLayer,
              target: e.target
            })
          }
        })

        // First, let's add back the reservations layer (add this after the distressed layer)
        map.current.addLayer({
          id: 'reservations-outline-layer',
          type: 'line',
          source: 'reservations',
          paint: {
            'line-color': '#5BAFAE', // Darker version of #7FDBDA
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 1,    // 1px at zoom level 2
              4, 1.5,  // 1.5px at zoom level 4
              8, 2     // 2px at zoom level 8
            ]
          },
          layout: {
            visibility: layerVisibility.reservations ? 'visible' : 'none'
          }
        }, 'states-layer')

        map.current.addLayer({
          id: 'reservations-layer',
          type: 'fill',
          source: 'reservations',
          paint: {
            'fill-color': [
              'match',
              ['get', 'STATEFP'],
              // Pacific West states
              ['02', '06', '15', '32', '41', '53'],
              REGION_COLORS['Pacific West'],
              // West Central states
              ['08', '16', '20', '27', '30', '31', '35', '38', '46', '49', '56'],
              REGION_COLORS['West Central'],
              // South Central states
              ['05', '22', '28', '40', '48'],
              REGION_COLORS['South Central'],
              // East Central states
              ['17', '18', '21', '26', '39', '54', '55'],
              REGION_COLORS['East Central'],
              // Southeast states
              ['12', '13', '37', '45', '51'],
              REGION_COLORS['Southeast'],
              // Northeast states
              ['09', '10', '11', '23', '24', '25', '33', '34', '36', '42', '44', '50'],
              REGION_COLORS['Northeast'],
              // Default color
              REGION_COLORS['Native Tribes']
            ],
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 0.3,
              4, 0.4,
              8, 0.5
            ]
          },
          layout: {
            visibility: layerVisibility.reservations ? 'visible' : 'none'
          }
        }, 'states-layer')

        // Add this after your hover effects code
        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '300px'
        })

        // Add click handlers for reservations
        map.current.on('click', 'reservations-layer', (e) => {
          const coordinates = e.lngLat
          const properties = e.features[0].properties

          // Format the popup content
          const content = `
            <div style="padding: 8px; color: black;">
              <h3 style="margin: 0 0 8px 0; color: black;">Tribal Nation</h3>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Name:</strong> ${properties.NAME}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Latitude:</strong> ${properties.INTPTLAT}</p>
              <p style="margin: 0; color: black;"><strong>Longitude:</strong> ${properties.INTPTLON}</p>
            </div>
          `
          console.log(properties)

          popup
            .setLngLat(coordinates)
            .setHTML(content)
            .addTo(map.current)
        })

        // Add click handlers for distressed areas
        map.current.on('click', 'distressed-layer', (e) => {
          const coordinates = e.lngLat
          const properties = e.features[0].properties

          // Format the popup content
          const content = `
            <div style="padding: 8px; color: black;">
              <h3 style="margin: 0 0 8px 0; color: black;">Distressed Area</h3>
              <p style="margin: 0 0 5px 0; color: black;"><strong>County:</strong> ${properties.CBSA}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>City:</strong> ${properties.City}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>State:</strong> ${properties.State}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>County:</strong> ${properties.County}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Zipcode:</strong> ${properties.Zipcode}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>GeoID:</strong> ${properties.GEOID10}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Quintile:</strong> ${properties.Quintile__}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Total Population:</strong> ${properties.Total_Popu}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Census Region:</strong> ${properties.Census_Reg}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Urban or Rural:</strong> ${properties.Urban_Rura}</p>
              <p style="margin: 0 0 5px 0; color: black;"><strong>Distress Score:</strong> ${properties.DistressSc}</p>

              ${properties.Poverty_Ra ? 
                `<p style="margin: 0 0 5px 0; color: black;"><strong>Poverty Rate:</strong> ${properties.Poverty_Ra}</p>` 
                : ''}
              ${properties.UNEMPLOYMENT ? 
                `<p style="margin: 0; color: black;"><strong>Unemployment Rate:</strong> ${(properties.UNEMPLOYMENT * 100).toFixed(1)}%</p>` 
                : ''}
            </div>
          `
          console.log(properties)

          popup
            .setLngLat(coordinates)
            .setHTML(content)
            .addTo(map.current)
        })

        // Add click handlers for all EPA layers
        for (let i = 1; i <= 7; i++) {
          map.current.on('click', `epa-disadvantaged-layer-${i}`, (e) => {
            const coordinates = e.lngLat
            const properties = e.features[0].properties

            // Format the popup content
            const content = `
              <div style="padding: 8px; color: black;">
                <h3 style="margin: 0 0 8px 0; color: black;">EPA Disadvantaged Community</h3>
                <p style="margin: 0 0 5px 0; color: black;"><strong>Census Tract:</strong> ${properties.GEOID10}</p>
                <p style="margin: 0 0 5px 0; color: black;"><strong>State:</strong> ${properties.SF}</p>
                <p style="margin: 0 0 5px 0; color: black;"><strong>County:</strong> ${properties.CF}</p>
               
                <p style="margin: 0; color: black;"><em>This area has been identified by the EPA as disadvantaged based on environmental and socioeconomic factors.</em></p>
              </div>
            `
            console.log(properties)
            popup
              .setLngLat(coordinates)
              .setHTML(content)
              .addTo(map.current)
          })
        }

        // Add after the EPA click handlers
        // Add click handlers for all socially disadvantaged layers
        for (let i = 1; i <= 8; i++) {
          map.current.on('click', `socially-disadvantaged-layer-${i}`, (e) => {
            const coordinates = e.lngLat
            const properties = e.features[0].properties

            // Format the popup content
            const content = `
              <div style="padding: 8px; color: black;">
                <h3 style="margin: 0 0 8px 0; color: black;">Socially Disadvantaged Community</h3>
                <p style="margin: 0 0 5px 0; color: black;"><strong>Census Tract:</strong> ${properties.LOCATION}</p>
                <p style="margin: 0 0 5px 0; color: black;"><strong>State:</strong> ${properties.STATE}</p>
                <p style="margin: 0 0 5px 0; color: black;"><strong>County:</strong> ${properties.COUNTY}</p>
                <p style="margin: 0; color: black;"><em>This area has been identified as socially disadvantaged based on demographic and socioeconomic factors.</em></p>
              </div>
            `
            console.log('Social Layer Properties:', properties)

            popup
              .setLngLat(coordinates)
              .setHTML(content)
              .addTo(map.current)
          })
        }

        // Update the click-away handler to include all EPA layers
        map.current.on('click', (e) => {
          const layers = [
            'reservations-layer', 
            'distressed-layer', 
            ...Array.from({length: 7}, (_, i) => `epa-disadvantaged-layer-${i + 1}`),
            ...Array.from({length: 8}, (_, i) => `socially-disadvantaged-layer-${i + 1}`)
          ]
          
          const features = map.current.queryRenderedFeatures(e.point, { layers })
          
          if (!features.length) {
            popup.remove()
          }
        })

      } catch (error) {
        console.error('Error loading data:', error)
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
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        color: 'black'
      }}>
        <div>
          <label style={{ color: 'black', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={layerVisibility.states}
              onChange={() => toggleLayer('states')}
            />
            State Boundaries
          </label>
        </div>
        <div>
          <label style={{ color: 'black', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={layerVisibility.regions}
              onChange={() => toggleLayer('regions')}
            />
            Regions
          </label>
        </div>
        <div>
          <label style={{ color: 'black', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={layerVisibility.distressed}
              onChange={() => toggleLayer('distressed')}
            />
            Distressed Areas
          </label>
        </div>
        <div>
          <label style={{ color: 'black', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={layerVisibility.reservations}
              onChange={() => toggleLayer('reservations')}
            />
            Tribal Nations
          </label>
        </div>
        <div>
          <label style={{ color: 'black', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={layerVisibility.epaDisadvantaged}
              onChange={() => toggleLayer('epa-disadvantaged')}
            />
            EPA Disadvantaged Communities
          </label>
        </div>
        <div>
          <label style={{ color: 'black', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={layerVisibility.sociallyDisadvantaged}
              onChange={() => toggleLayer('sociallyDisadvantaged')}
            />
            Socially Disadvantaged Communities
          </label>
        </div>
        
        <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', marginBottom: '5px' }}>
            Current Zoom: {currentZoom.toFixed(1)}
            {currentZoom < 4 && (
              <div style={{ color: '#666' }}>
                Zoom in to see EPA data (zoom ≥ 4)
              </div>
            )}
            {currentZoom < 6 && (
              <div style={{ color: '#666' }}>
                Zoom in to see Distressed Community data (zoom ≥ 6)
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button
              onClick={() => map.current && fitToAllEPAData(map.current)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
            >
              Zoom to EPA Data
            </button>
            <button
              onClick={() => map.current && fitToDistressedData(map.current)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#FFA07A',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FF8C61'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFA07A'}
            >
              Zoom to Distressed Data
            </button>
            <button
              onClick={() => map.current && fitToSociallyDisadvantagedData(map.current)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#9370DB',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#8A2BE2'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#9370DB'}
            >
              Zoom to Socially Disadvantaged
            </button>
          </div>
        </div>
      </div>
    </>
  )
} 