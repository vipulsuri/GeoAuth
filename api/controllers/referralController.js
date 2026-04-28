const { query } = require('../db');
const { geocodeAddress, getDrivingRouteBatch } = require('../services/geoService');

// Delay helper to avoid hitting Nominatim/OSRM rate limits too hard if processing many providers
const delay = ms => new Promise(res => setTimeout(res, ms));

async function getReferrals(req, res) {
  try {
    const { address, specialty, maxDistanceMiles = 50 } = req.body;

    if (!address || !specialty) {
      return res.status(400).json({ error: 'Address and specialty are required.' });
    }

    // 1. Geocode the patient's address
    console.log(`Geocoding address: ${address}`);
    const originCoords = await geocodeAddress(address);
    console.log(`Geocoding result:`, originCoords);
    if (!originCoords) {
      return res.status(404).json({ error: 'Could not geocode the provided address.' });
    }

    // Convert maxDistanceMiles to meters for PostGIS ST_DWithin (geography uses meters)
    const maxDistanceMeters = maxDistanceMiles * 1609.34;

    // 2. Spatial Pre-filtering
    // Find providers with the requested specialty within maxDistanceMeters (straight-line)
    // We use ST_DWithin with geography type for accurate distance in meters.
    // Also extract lon/lat using ST_X and ST_Y for the routing API.
    const preFilteredProviders = await query(`
      SELECT 
        id, 
        name, 
        specialty, 
        address,
        ST_X(location::geometry) as lon,
        ST_Y(location::geometry) as lat,
        ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as straight_line_distance_meters,
        (
          SELECT string_agg(b.name, ', ')
          FROM natural_barriers b
          WHERE ST_Intersects(
            ST_MakeLine(ST_SetSRID(ST_MakePoint($1, $2), 4326)::geometry, location::geometry),
            b.geom
          )
        ) as crossed_barriers
      FROM providers
      WHERE specialty = $3
      AND ST_DWithin(
        location::geography, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        $4
      )
    `, [originCoords.lon, originCoords.lat, specialty, maxDistanceMeters]);

    if (preFilteredProviders.rows.length === 0) {
      return res.json({ 
        message: 'No providers found within the search radius.', 
        origin: originCoords,
        providers: [] 
      });
    }

    // 3. Routing & Travel Time Calculation (Using Batch Matrix API for Scale)
    console.log(`Fetching driving routes for ${preFilteredProviders.rows.length} providers simultaneously...`);
    const routeResults = await getDrivingRouteBatch(originCoords, preFilteredProviders.rows);
    
    const providersWithRoutes = [];
    
    for (const provider of preFilteredProviders.rows) {
      const routeData = routeResults.get(provider.id);
      
      try {
        if (routeData) {
          // Calculate geographic nuances
          const insights = [];
          const distanceRatio = routeData.distanceMeters / provider.straight_line_distance_meters;
          const avgSpeedMph = (routeData.distanceMeters / 1609.34) / (routeData.durationSec / 3600);

          if (distanceRatio > 1.2 && provider.crossed_barriers) {
            insights.push(`Route actively avoids natural barrier: ${provider.crossed_barriers}.`);
          } else if (distanceRatio > 1.5) {
            insights.push("Significant routing detour detected (lacks direct roads or complex topography).");
          } else if (distanceRatio > 1.2) {
            insights.push("Minor routing detour (standard road network variations).");
          }

          if (avgSpeedMph < 25 && routeData.distanceMeters > 3000) {
            insights.push("Slower travel time factored in (likely due to urban traffic, intersections, or school zones).");
          } else if (avgSpeedMph > 50) {
            insights.push("Fast travel time (mostly highway routing).");
          }

          providersWithRoutes.push({
            ...provider,
            driving_duration_sec: routeData.durationSec,
            driving_duration_min: Math.round(routeData.durationSec / 60),
            driving_distance_meters: routeData.distanceMeters,
            driving_distance_miles: (routeData.distanceMeters / 1609.34).toFixed(2),
            insights: insights
          });
        } else {
          // If routing fails (e.g., no roads found or matrix failed), we fall back to straight line
          providersWithRoutes.push({
            ...provider,
            driving_duration_sec: Infinity,
            driving_duration_min: null,
            driving_distance_meters: null,
            driving_distance_miles: null,
            note: 'Routing failed',
            insights: ["Could not calculate driving route (possibly an isolated location)."]
          });
        }
      } catch (err) {
        console.error(`Failed parsing route data for provider ${provider.id}:`, err);
      }
    }

    // 4. Sorting & Response
    // Sort primarily by driving duration (shortest first)
    providersWithRoutes.sort((a, b) => a.driving_duration_sec - b.driving_duration_sec);

    res.json({
      origin: originCoords,
      providers: providersWithRoutes
    });

  } catch (error) {
    console.error('Error in getReferrals:', error);
    res.status(500).json({ 
      error: 'Internal server error while processing referrals.',
      details: error.message || String(error)
    });
  }
}

module.exports = {
  getReferrals
};
