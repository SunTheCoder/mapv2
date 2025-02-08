import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  const client = await pool.connect();
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const layerId = searchParams.get('layerId');
    
    // Build the query
    let query = 'SELECT * FROM "Features"';
    const params = [];
    
    if (layerId) {
      query += ' WHERE "layerId" = $1';
      params.push(layerId);
    }
    
    query += ' ORDER BY "createdAt" DESC';

    // Execute query
    const { rows } = await client.query(query, params);

    // Parse metadata for each feature
    const formattedFeatures = rows.map(feature => {
      let parsedMetadata = feature.metadata;
      // Only try to parse if it's a string
      if (typeof feature.metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(feature.metadata);
        } catch (e) {
          console.error(`Error parsing metadata for feature ${feature.id}:`, e);
        }
      }
      
      return {
        ...feature,
        metadata: parsedMetadata
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedFeatures
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching features',
        details: error.message 
      }, 
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request) {
  const client = await pool.connect();
  try {
    const { layerId, featureId, name, description, properties } = await request.json();

    const query = `
      INSERT INTO "Features" ("id", "layerId", "featureId", "name", "description", "metadata", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT ("layerId", "featureId") 
      DO UPDATE SET 
        "name" = $3,
        "description" = $4,
        "metadata" = $5,
        "updatedAt" = NOW()
      RETURNING *
    `;

    const { rows } = await client.query(query, [
      layerId, 
      featureId, 
      name, 
      description, 
      JSON.stringify(properties)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...rows[0],
        metadata: JSON.parse(rows[0].metadata)
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error saving feature',
        details: error.message 
      }, 
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 