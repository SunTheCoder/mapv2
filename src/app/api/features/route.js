import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const layerId = searchParams.get('layerId');
  const featureId = searchParams.get('featureId');
  
  console.log('API Request:', { layerId, featureId }); // Debug log
  
  try {
    let query = supabase
      .from('Features')
      .select('*')
      .eq('layerId', layerId);
    
    if (featureId) {
      query = query.eq('featureId', featureId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return Response.json({ 
      success: true, 
      data: data.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }))
    });
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ success: false, error: error.message });
  }
}

export async function POST(request) {
  try {
    const { layerId, featureId, name, description, properties } = await request.json();

    const { data, error } = await supabase
      .from('Features')
      .upsert({
        layerId,
        featureId,
        name,
        description,
        metadata: JSON.stringify(properties),
        updatedAt: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        ...data[0],
        metadata: typeof data[0].metadata === 'string' ? JSON.parse(data[0].metadata) : data[0].metadata
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
  }
} 