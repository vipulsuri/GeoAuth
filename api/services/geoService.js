const axios = require('axios');

/**
 * Geocodes an address string using Mapbox Geocoding API.
 * @param {string} address - The full address string.
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
async function geocodeAddress(address) {
  try {
    const response = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`, {
      params: {
        access_token: process.env.MAPBOX_ACCESS_TOKEN,
        limit: 1
      }
    });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const result = response.data.features[0];
      return {
        lat: parseFloat(result.center[1]),
        lon: parseFloat(result.center[0])
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error.message);
    throw new Error('Failed to geocode address');
  }
}

/**
 * Gets driving duration and distance using Mapbox Directions API.
 * @param {{lat: number, lon: number}} origin - Origin coordinates
 * @param {{lat: number, lon: number}} destination - Destination coordinates
 * @returns {Promise<{durationSec: number, distanceMeters: number} | null>}
 */
async function getDrivingRoute(origin, destination) {
  try {
    const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`;
    
    const response = await axios.get(url, {
      params: {
        access_token: process.env.MAPBOX_ACCESS_TOKEN,
        overview: 'false'
      }
    });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        durationSec: route.duration,
        distanceMeters: route.distance
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching driving route:', error.message);
    throw new Error('Failed to fetch driving route');
  }
}

/**
 * Gets driving durations and distances to multiple destinations using Mapbox Matrix API.
 * This is crucial for scaling to all states, as it processes up to 24 destinations in a single request.
 * @param {{lat: number, lon: number}} origin - Origin coordinates
 * @param {Array<{id: any, lat: number, lon: number}>} destinations - Array of destination objects
 * @returns {Promise<Map<any, {durationSec: number, distanceMeters: number}>>}
 */
async function getDrivingRouteBatch(origin, destinations) {
  if (!destinations || destinations.length === 0) return new Map();
  
  // Mapbox Matrix API limits to 25 coordinates total (1 origin + 24 destinations)
  // For production scaling, we would chunk the destinations array into groups of 24
  const chunkedDestinations = [];
  for (let i = 0; i < destinations.length; i += 24) {
    chunkedDestinations.push(destinations.slice(i, i + 24));
  }

  const resultsMap = new Map();

  for (const chunk of chunkedDestinations) {
    try {
      // Coordinate format: {lon},{lat};{lon},{lat}...
      let coordinatesStr = `${origin.lon},${origin.lat}`;
      const destIndices = [];
      
      chunk.forEach((dest, index) => {
        coordinatesStr += `;${dest.lon},${dest.lat}`;
        destIndices.push(index + 1); // +1 because origin is index 0
      });

      const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinatesStr}`;
      
      const response = await axios.get(url, {
        params: {
          access_token: process.env.MAPBOX_ACCESS_TOKEN,
          sources: '0', // Calculate from the first coordinate (origin)
          destinations: destIndices.join(';'), // To all other coordinates
          annotations: 'duration,distance'
        }
      });

      if (response.data && response.data.durations && response.data.distances) {
        // Durations/distances are returned as a matrix where row 0 is our origin
        const durations = response.data.durations[0];
        const distances = response.data.distances[0];
        
        chunk.forEach((dest, index) => {
          if (durations[index] !== null && distances[index] !== null) {
            resultsMap.set(dest.id, {
              durationSec: durations[index],
              distanceMeters: distances[index]
            });
          }
        });
      }
    } catch (error) {
      console.error('Error fetching driving route batch:', error.response?.data || error.message);
      // Fallback to null for these if Matrix fails
      chunk.forEach(dest => resultsMap.set(dest.id, null));
    }
  }

  return resultsMap;
}

module.exports = {
  geocodeAddress,
  getDrivingRoute,
  getDrivingRouteBatch
};
