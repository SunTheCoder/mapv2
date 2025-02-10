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

// Add this function to format region data from Supabase
const formatRegionPopup = (feature) => {
  const { name, description, metadata } = feature;
  return `
    <div style="padding: 8px; color: black;">
      <h3 style="margin: 0 0 8px 0; color: black;">${name}</h3>
      <p style="margin: 0 0 5px 0; color: black;">${description}</p>
      <div style="margin: 8px 0;">
        <p style="margin: 0 0 5px 0; color: black;"><strong>Population:</strong> ${metadata.population}</p>
        <p style="margin: 0 0 5px 0; color: black;"><strong>Area:</strong> ${metadata.area}</p>
        <p style="margin: 0 0 5px 0; color: black;"><strong>States:</strong> ${metadata.states.join(', ')}</p>
        <p style="margin: 0 0 5px 0; color: black;"><strong>Regional Partners:</strong> ${metadata.regional_partners.join(', ')}</p>
      </div>
    </div>
  `;
};

// Add this formatter next to your region formatter
const formatStatePopup = (feature) => {
  const { name, description, metadata } = feature;
  return `
    <div style="padding: 8px; color: black;">
      <h3 style="margin: 0 0 8px 0; color: black;">${name}</h3>
      <p style="margin: 0 0 5px 0; color: black;">${description}</p>
      <div style="margin: 8px 0;">
        ${Object.entries(metadata).map(([key, value]) => `
          <p style="margin: 0 0 5px 0; color: black;">
            <strong>${key.replace(/_/g, ' ')}:</strong> ${Array.isArray(value) ? value.join(', ') : value}
          </p>
        `).join('')}
      </div>
    </div>
  `;
};

// Add this new component at the top of the file
const SearchBox = ({ map }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  // Handle search input
  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/search?term=${encodeURIComponent(term)}`);
      const { success, data } = await response.json();
      if (success) {
        setSearchResults(data.slice(0, 5)); // Limit to 5 results
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle selection
  const handleSelect = (result) => {
    if (!map.current) {
      console.error('Map not initialized');
      return;
    }

    console.log('Selected result:', result);

    // Get the feature from the relevant layer based on the result type
    switch (result.layerId) {
      case 'region':
        if (result.metadata?.bounds) {
          map.current.fitBounds([
            [result.metadata.bounds.west, result.metadata.bounds.south],
            [result.metadata.bounds.east, result.metadata.bounds.north]
          ], { padding: 50 });
        }
        break;
        
      case 'state':
        // Special handling for Pacific territories
        if (result.name === 'Guam' || result.name === 'Commonwealth of the Northern Mariana Islands') {
          // Zoom directly to their coordinates
          if (result.name === 'Guam') {
            map.current.flyTo({
              center: [144.7937, 13.4443], // Guam coordinates
              zoom: 8,
              padding: { top: 50, bottom: 50, left: 50, right: 50 }
            });
            return;
          } else {
            map.current.flyTo({
              center: [145.6739, 15.0979], // Northern Mariana Islands coordinates
              zoom: 7,
              padding: { top: 50, bottom: 50, left: 50, right: 50 }
            });
            return;
          }
        }

        // Regular state handling continues...
        const stateFeatures = map.current.querySourceFeatures('states', {
          filter: ['==', ['get', 'name'], result.name]
        });

        if (stateFeatures.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          stateFeatures[0].geometry.coordinates[0].forEach(coord => {
            bounds.extend(coord);
          });
          map.current.fitBounds(bounds, { 
            padding: { top: 50, bottom: 50, left: 50, right: 50 }
          });
        } else {
          // If not found, zoom out first
          map.current.fitBounds([
            [-125.0, 24.396308],
            [-66.93457, 49.384358]
          ], { 
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 0
          });

          // After zooming out, try to find the feature again
          setTimeout(() => {
            const features = map.current.querySourceFeatures('states', {
              filter: ['==', ['get', 'name'], result.name]
            });

            if (features.length > 0) {
              const bounds = new mapboxgl.LngLatBounds();
              features[0].geometry.coordinates[0].forEach(coord => {
                bounds.extend(coord);
              });
              map.current.fitBounds(bounds, { 
                padding: { top: 50, bottom: 50, left: 50, right: 50 }
              });
            }
          }, 100);
        }
        break;
        
      case 'county':
        console.log('County search result:', result);
        
        // First zoom to the state to ensure features are rendered
        const stateBounds = map.current.querySourceFeatures('states', {
          filter: ['==', ['get', 'name'], result.name.split(', ')[1]]  // Search for South Dakota
        });

        if (stateBounds.length > 0) {
          // Zoom to state first
          const bounds = new mapboxgl.LngLatBounds();
          stateBounds[0].geometry.coordinates[0].forEach(coord => {
            bounds.extend(coord);
          });
          map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 }
          });
        }

        // After zooming to state, try to find the county
        setTimeout(() => {
          const countyFeatures = map.current.queryRenderedFeatures({
            layers: [
              'socially-disadvantaged-layer-1',
              'socially-disadvantaged-layer-2',
              'socially-disadvantaged-layer-3',
              'socially-disadvantaged-layer-4',
              'socially-disadvantaged-layer-5',
              'socially-disadvantaged-layer-6',
              'socially-disadvantaged-layer-7',
              'socially-disadvantaged-layer-8'
            ],
            filter: ['all',
              ['==', ['get', 'name'], result.name.split(', ')[0]],
              ['==', ['get', 'state'], result.name.split(', ')[1]]
            ]
          });

          console.log('Found county features:', countyFeatures);

          if (countyFeatures.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            
            // Handle both Polygon and MultiPolygon geometries
            if (countyFeatures[0].geometry.type === 'Polygon') {
              countyFeatures[0].geometry.coordinates[0].forEach(coord => {
                bounds.extend(coord);
              });
            } else if (countyFeatures[0].geometry.type === 'MultiPolygon') {
              countyFeatures[0].geometry.coordinates.forEach(polygon => {
                polygon[0].forEach(coord => bounds.extend(coord));
              });
            }

            map.current.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 }
            });
          }
        }, 1000); // Give it more time to render
        break;
        
      case 'tribal-nation':
        // Get the feature directly from the reservations source
        const tribalFeatures = map.current.querySourceFeatures('reservations', {
          filter: ['==', 'NAME', result.name] // Use the exact name from the database
        });

        if (tribalFeatures.length > 0) {
          const feature = tribalFeatures[0];
          const bounds = new mapboxgl.LngLatBounds();
          
          // Handle both Polygon and MultiPolygon geometries
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(polygon => {
              polygon[0].forEach(coord => bounds.extend(coord));
            });
          }

          map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 }
          });
        }
        break;
    }

    setSearchTerm('');
    setSearchResults([]);
    setIsOpen(false);
  };

  return (
    <div 
      ref={searchRef}
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 999,
        width: '300px',
      }}
    >
      <input
        type="text"
        placeholder="Search for a location..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '14px',
          color: '#000000',
        }}
      />
      {isOpen && searchResults.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderRadius: '4px',
          marginTop: '4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          {searchResults.map((result, index) => (
            <div
              key={result.featureId}
              onClick={() => handleSelect(result)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#000000' }}>{result.name}</div>
              <div style={{ fontSize: '0.9em', color: '#333333' }}>
                {result.layerId.charAt(0).toUpperCase() + result.layerId.slice(1)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [popup] = useState(
    new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false
    })
  )
  const [layerVisibility, setLayerVisibility] = useState({
    states: true,
    regions: true,
    distressed: true,
    reservations: true,
    epaDisadvantaged: true,
    sociallyDisadvantaged: true
  })
  const [currentZoom, setCurrentZoom] = useState(3)
  const [features, setFeatures] = useState([]);
  const [regionFeatures, setRegionFeatures] = useState(null);

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
      } else if (layerId === 'epaDisadvantaged') {
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
    if (map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283],
      zoom: 3,
      accessToken: MAPBOX_TOKEN
    });

    let loadedLayers = 0;
    const totalLayers = 7; // Number of EPA layers

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
          type: 'fill',
          source: 'states',
          paint: {
            'fill-color': 'transparent',
            'fill-outline-color': '#627BC1'
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
        map.current.on('click', 'reservations-layer', async (e) => {
          const coordinates = e.lngLat;
          const properties = e.features[0].properties;

          // Format tribal-nation ID with hyphens between words
          const tribalName = properties.NAME?.toLowerCase()
            .replace(/\s+reservation(\s+and\s+off-reservation\s+trust\s+land)?/i, '') // Handle both formats
            .replace(/\s+/g, '-');
          const stateName = 'south-dakota';
          const tribalStateId = `${tribalName}-${stateName}`;

          console.log('Original name:', properties.NAME);
          console.log('Formatted ID:', tribalStateId);

          try {
            const response = await fetch(`/api/features?layerId=tribal-nation&featureId=${tribalStateId}`);
            const { success, data } = await response.json();
            console.log('Supabase response:', { success, data });

            const content = `
              <div style="padding: 8px; color: black;">
                <h3 style="margin: 0 0 8px 0; color: black;">${properties.NAME}</h3>
                
                ${success && data && data.length > 0 ? `
                  <p style="margin: 0 0 5px 0; color: black;">${data[0].description}</p>
                  <div style="margin: 8px 0;">
                    ${Object.entries(data[0].metadata).map(([key, value]) => `
                      <p style="margin: 0 0 5px 0; color: black;">
                        <strong>${key.replace(/_/g, ' ')}:</strong> ${Array.isArray(value) ? value.join(', ') : value}
                      </p>
                    `).join('')}
                  </div>
                ` : `                  <!-- Fallback to basic info if no Supabase data -->
                  <p style="margin: 0 0 5px 0; color: black;"><strong>Location:</strong> ${properties.INTPTLAT}, ${properties.INTPTLON}</p>
                `}
              </div>
            `;

            popup
              .setLngLat(coordinates)
              .setHTML(content)
              .addTo(map.current);
          } catch (error) {
            console.error('Error fetching tribal nation data:', error);
          }
        });

        // Add click handlers for distressed areas
        map.current.on('click', 'distressed-layer', async (e) => {
          if (e.features.length > 0) {
            const coordinates = e.lngLat;
            const properties = e.features[0].properties;
            
            // Format county-state ID with hyphens between all words (e.g., "bennett-south-dakota")
            const countyName = properties.County?.toLowerCase()
              .replace(/\s+county/i, '') // Remove 'County' if present
              .replace(/\s+/g, '-');
            const stateName = properties.State?.toLowerCase()
              .replace(/\s+/g, '-'); // Add hyphens between state words
            const countyStateId = `${countyName}-${stateName}`;

            console.log('Fetching county data for:', countyStateId);

            try {
              const response = await fetch(`/api/features?layerId=county&featureId=${countyStateId}`);
              const { success, data } = await response.json();
              console.log('Supabase response:', { success, data }); // Debug log
              
              // Combine distressed data with Supabase data if available
              const content = `
                <div style="padding: 8px; color: black;">
                  <h3 style="margin: 0 0 8px 0; color: black;">${properties.County}, ${properties.State}</h3>
                  
                  <!-- Distressed Data -->
                  <div style="margin: 8px 0;">
                    <p style="margin: 0 0 5px 0; color: black;"><strong>Distress Score:</strong> ${properties.DistressSc}</p>
                    <p style="margin: 0 0 5px 0; color: black;"><strong>Population:</strong> ${properties.Total_Popu}</p>
                    <p style="margin: 0 0 5px 0; color: black;"><strong>Urban/Rural:</strong> ${properties.Urban_Rura}</p>
                    ${properties.Poverty_Ra ? 
                      `<p style="margin: 0 0 5px 0; color: black;"><strong>Poverty Rate:</strong> ${properties.Poverty_Ra}</p>` 
                      : ''}
                    ${properties.UNEMPLOYMENT ? 
                      `<p style="margin: 0 0 5px 0; color: black;"><strong>Unemployment:</strong> ${(properties.UNEMPLOYMENT * 100).toFixed(1)}%</p>` 
                      : ''}
                  </div>

                  ${success && data && data.length > 0 ? `
                    <!-- Supabase County Data -->
                    <div style="margin: 8px 0; border-top: 1px solid #ccc; padding-top: 8px;">
                      <p style="margin: 0 0 5px 0; color: black;">${data[0].description}</p>
                      ${Object.entries(data[0].metadata).map(([key, value]) => `
                        <p style="margin: 0 0 5px 0; color: black;">
                          <strong>${key.replace(/_/g, ' ')}:</strong> ${Array.isArray(value) ? value.join(', ') : value}
                        </p>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;

              popup
                .setLngLat(coordinates)
                .setHTML(content)
                .addTo(map.current);
            } catch (error) {
              console.error('Error fetching county data:', error);
            }
          }
        })

        // Add click handlers for all EPA layers
        // for (let i = 1; i <= 7; i++) {
        //   const layerId = `epa-disadvantaged-layer-${i}`;
        //   map.current.on('click', layerId, async (e) => {
        //     const coordinates = e.lngLat;
        //     const properties = e.features[0].properties;
        //     const countyName = properties.COUNTY?.toLowerCase();
        //     const stateName = properties.STATE?.toLowerCase();
            

        //     try {
        //       // Fetch county data from Supabase if it exists
        //       const response = await fetch(`/api/features?layerId=county&featureId=${countyName}-${stateName}`);
        //       const { success, data } = await response.json();
              
        //       // Combine EPA data with Supabase data if available
        //       const content = `
        //         <div style="padding: 8px; color: black;">
        //           <h3 style="margin: 0 0 8px 0; color: black;">${properties.COUNTY}, ${properties.STATE}</h3>
                  
        //           <!-- EPA Data -->
        //           <div style="margin: 8px 0;">
        //             <p style="margin: 0 0 5px 0; color: black;"><strong>Census Tract:</strong> ${properties.DISADVANTAGED}</p>
        //             <p style="margin: 0 0 5px 0; color: black;"><strong>EPA Score:</strong> ${properties.SCORE || 'N/A'}</p>
        //           </div>

        //           ${success && data && data.length > 0 ? `
        //             <!-- Supabase County Data -->
        //             <div style="margin: 8px 0; border-top: 1px solid #ccc; padding-top: 8px;">
        //               <p style="margin: 0 0 5px 0; color: black;">${data[0].description}</p>
        //               ${Object.entries(data[0].metadata).map(([key, value]) => `
        //                 <p style="margin: 0 0 5px 0; color: black;">
        //                   <strong>${key.replace(/_/g, ' ')}:</strong> ${Array.isArray(value) ? value.join(', ') : value}
        //                 </p>
        //               `).join('')}
        //             </div>
        //           ` : ''}
        //         </div>
        //       `;

        //       popup
        //         .setLngLat(coordinates)
        //         .setHTML(content)
        //         .addTo(map.current);
        //     } catch (error) {
        //       console.error('Error fetching county data:', error);
        //     }
        //   });
        // }

        // Add after the EPA click handlers
        // Add click handlers for all socially disadvantaged layers
        for (let i = 1; i <= 8; i++) {
          map.current.on('click', `socially-disadvantaged-layer-${i}`, async (e) => {
            if (e.features.length > 0) {
              const coordinates = e.lngLat;
              const properties = e.features[0].properties;
              
              // Format county-state ID with hyphens between all words
              const countyName = properties.COUNTY?.toLowerCase()
                .replace(/\s+county/i, '')
                .replace(/\s+/g, '-');
              const stateName = properties.STATE?.toLowerCase()
                .replace(/\s+/g, '-'); // Add hyphens between state words
              const countyStateId = `${countyName}-${stateName}`;

              console.log('Fetching county data for:', countyStateId);

              try {
                const response = await fetch(`/api/features?layerId=county&featureId=${countyStateId}`);
                const { success, data } = await response.json();
                console.log('Supabase response:', { success, data });

                const content = `
                  <div style="padding: 8px; color: black;">
                    <h3 style="margin: 0 0 8px 0; color: black;">${properties.COUNTY}, ${properties.STATE}</h3>
                    
                    <!-- Socially Disadvantaged Data -->
                    <div style="margin: 8px 0;">
                      <p style="margin: 0 0 5px 0; color: black;"><strong>Census Tract:</strong> ${properties.LOCATION}</p>
                      <p style="margin: 0 0 5px 0; color: black;"><strong>Socially Disadvantaged Status:</strong> Yes</p>
                      ${properties.SCORE ? 
                        `<p style="margin: 0 0 5px 0; color: black;"><strong>Score:</strong> ${properties.SCORE}</p>` 
                        : ''}
                    </div>

                    ${success && data && data.length > 0 ? `
                      <!-- Supabase County Data -->
                      <div style="margin: 8px 0; border-top: 1px solid #ccc; padding-top: 8px;">
                        <p style="margin: 0 0 5px 0; color: black;">${data[0].description}</p>
                        ${Object.entries(data[0].metadata).map(([key, value]) => `
                          <p style="margin: 0 0 5px 0; color: black;">
                            <strong>${key.replace(/_/g, ' ')}:</strong> ${Array.isArray(value) ? value.join(', ') : value}
                          </p>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `;

                popup
                  .setLngLat(coordinates)
                  .setHTML(content)
                  .addTo(map.current);
              } catch (error) {
                console.error('Error fetching county data:', error);
              }
            }
          });
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

        // Fetch region features from our database
        const response = await fetch('/api/features?layerId=region');
        const { data } = await response.json();
        setRegionFeatures(data);

        // Add click handler for regions
        Object.keys(REGION_STATES).forEach(region => {
          const regionId = `region-${region.toLowerCase().replace(/\s+/g, '-')}`;
          
          map.current.on('click', regionId, async (e) => {
            if (e.features.length > 0) {
              const coordinates = e.lngLat;
              
              // Log the query we're about to make
              console.log('Making query with:', {
                layerId: 'region',
                featureId: region.toLowerCase().replace(/\s+/g, '-')
              });

              try {
                const response = await fetch(`/api/features?layerId=region&featureId=${region.toLowerCase().replace(/\s+/g, '-')}`);
                const { success, data, error } = await response.json();
                console.log('API Response:', { success, data, error });
                
                if (success && data && data.length > 0) {
                  const content = formatRegionPopup(data[0]);
                  popup
                    .setLngLat(coordinates)
                    .setHTML(content)
                    .addTo(map.current);
                } else {
                  console.error('No data found for region:', region);
                }
              } catch (error) {
                console.error('Error fetching region data:', error);
              }
            }
          });

          // Add hover effects
          map.current.on('mouseenter', regionId, () => {
            map.current.getCanvas().style.cursor = 'pointer';
          });

          map.current.on('mouseleave', regionId, () => {
            map.current.getCanvas().style.cursor = '';
          });
        });

        // Add this click handler in your useEffect where map loads
        map.current.on('click', 'states-layer', async (e) => {
          if (e.features.length > 0) {
            const feature = e.features[0];
            console.log('State properties:', feature.properties);
            
            const coordinates = e.lngLat;
            const stateId = feature.properties.basename?.toLowerCase();

            console.log('Found stateId:', stateId);

            if (!stateId) {
              console.error('Could not find state name in:', feature.properties);
              return;
            }

            try {
              const response = await fetch(`/api/features?layerId=state&featureId=${stateId}`);
              const { success, data, error } = await response.json();
              console.log('API Response:', { success, data, error });
              
              if (success && data && data.length > 0) {
                const content = formatStatePopup(data[0]);
                popup
                  .setLngLat(coordinates)
                  .setHTML(content)
                  .addTo(map.current);
              }
            } catch (error) {
              console.error('Error fetching state data:', error);
            }
          }
        });

        // Add hover state
        map.current.on('mouseenter', 'states-layer', () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'states-layer', () => {
          map.current.getCanvas().style.cursor = '';
        });

      } catch (error) {
        console.error('Error loading data:', error);
      }
    });

    // Cleanup function
    return () => map.current?.remove();
  }, []);

  return (
    <>
    <div ref={mapContainer} style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} />
      <SearchBox map={map} />
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
              onChange={() => toggleLayer('epaDisadvantaged')}
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
