import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const layerId = searchParams.get('layerId');
  
  try {
    const result = await pool.query(
      'SELECT * FROM "Features" WHERE "layerId" = $1',
      [layerId]
    );
    // Parse metadata for each row
    const data = result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ success: false, error: error.message });
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