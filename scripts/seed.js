import { supabase } from '../src/lib/supabase.js';
import regions from '../seeders/20240208000001-region-features.js';

async function seed() {
  try {
    // First, log what we're about to insert
    console.log('Seeding regions:', regions);
    
    // Insert the regions
    for (const region of regions) {
      const { data, error } = await supabase
        .from('Features')
        .upsert({
          id: region.id,
          layerId: region.layerId,
          featureId: region.featureId,
          name: region.name,
          description: region.description,
          metadata: region.metadata,
          createdAt: region.createdAt,
          updatedAt: region.updatedAt
        })
        .select();

      if (error) throw error;
      console.log(`Seeded region ${region.name}:`, data[0]);
    }
    
    console.log('Seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed(); 