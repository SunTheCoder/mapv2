# Interactive Geographic Data Visualization

An interactive web application for visualizing and exploring geographic data across the United States, including states, regions, tribal nations, and various demographic indicators.

## Features

### Interactive Map
- Dynamic map visualization using Mapbox GL JS
- Smooth animations and transitions between locations
- Multiple data layers that can be toggled on/off:
  - State Boundaries
  - Regional Divisions
  - Tribal Nations
  - Distressed Areas
  - EPA Disadvantaged Communities
  - Socially Disadvantaged Areas

### Advanced Search Functionality
- Real-time search across multiple geographic entities:
  - States (including Pacific territories)
  - Counties
  - Tribal Nations
  - Regions
- Smart zoom behavior:
  - Automatically enables relevant layers when searching
  - Smooth transitions between locations
  - Intelligent viewport management for distant territories

### User Interface
- Clean, intuitive layer controls
- Responsive search box with autocomplete
- Interactive popups with detailed information
- Mobile-friendly design

### Data Integration
- Multiple data sources combined into a single view
- Vector tile optimization for performance
- Real-time data querying and filtering

### Technical Features
- Dynamic layer management
- Optimized data loading
- Smooth animations and transitions
- Error handling and fallbacks
- Responsive design

## Technical Stack
- React
- Next.js
- Tailwind CSS
- Framer Motion
- Mapbox GL JS
- Vector Tiles
- Supabase for data management

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```
4. Run the development server: `npm run dev`

## Usage

### Layer Management
Use the checkboxes in the top-right corner to toggle different data layers:
- State Boundaries: View state outlines
- Regions: See regional divisions
- Distressed Areas: View economically distressed regions
- Tribal Nations: Explore tribal territories
- EPA Disadvantaged Communities: View EPA-designated areas

### Search
1. Click the search box in the top-left corner
2. Type a location name (state, county, or tribal nation)
3. Select from the dropdown of matching results
4. The map will automatically:
   - Enable relevant layers
   - Zoom to the selected location
   - Display detailed information

## License

This project is licensed under the MIT License - see the LICENSE file for details.
