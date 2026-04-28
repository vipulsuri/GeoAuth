require('dotenv').config();
const { query } = require('./db');

async function initializeDB() {
  try {
    console.log('Initializing database schema...');
    
    // Enable PostGIS extension
    await query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS extension enabled.');

    // Create providers table
    await query(`
      CREATE TABLE IF NOT EXISTS providers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        specialty VARCHAR(100) NOT NULL,
        address VARCHAR(255) NOT NULL,
        location GEOMETRY(Point, 4326)
      );
    `);
    console.log('Providers table created.');

    // Create a spatial index on the location column for faster distance queries
    await query(`
      CREATE INDEX IF NOT EXISTS providers_location_idx
      ON providers
      USING GIST (location);
    `);
    console.log('Spatial index created.');

    console.log('Database initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDB();
