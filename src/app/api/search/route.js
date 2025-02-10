import { supabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term')?.toLowerCase();

  if (!term) {
    return Response.json({ success: false, error: 'Search term required' });
  }

  try {
    const { data, error } = await supabase
      .from('Features')
      .select('*')
      .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      .order('name')
      .limit(5);

    if (error) throw error;

    return Response.json({
      success: true,
      data: data.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ success: false, error: error.message });
  }
} 