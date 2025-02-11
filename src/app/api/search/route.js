import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term')?.toLowerCase();

  if (!term) {
    return Response.json({ success: false, error: 'Search term required' });
  }

  try {
    // First get state matches
    const { data: stateData, error: stateError } = await supabase
      .from('Features')
      .select('*')
      .eq('layerId', 'state')
      .ilike('name', `%${term}%`)
      .order('name')
      .limit(5);

    if (stateError) throw stateError;

    // Then get other matches
    const { data: otherData, error: otherError } = await supabase
      .from('Features')
      .select('*')
      .neq('layerId', 'state')
      .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      .in('layerId', ['tribal-nation', 'county'])
      .order('name')
      .limit(5);

    if (otherError) throw otherError;

    // Combine results with states first
    const combinedData = [
      ...(stateData || []),
      ...(otherData || [])
    ];

    return Response.json({
      success: true,
      data: combinedData.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }))
    });

  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ success: false, error: error.message });
  }
} 