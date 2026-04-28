require('dotenv').config();
const { query } = require('./db');

async function addBarriers() {
  try {
    console.log('Adding natural_barriers table...');
    
    // Create table
    await query(`
      CREATE TABLE IF NOT EXISTS natural_barriers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        geom GEOMETRY(LineString, 4326)
      );
    `);

    // Clear existing
    await query('TRUNCATE TABLE natural_barriers RESTART IDENTITY;');

    // Insert a rough linestring for the Rio Grande River through Albuquerque
    // Coords approximate the river path from north to south
    await query(`
      INSERT INTO natural_barriers (name, type, geom)
      VALUES (
        'Rio Grande River', 
        'river', 
        ST_GeomFromText('LINESTRING(-106.666 35.250, -106.660 35.150, -106.680 35.050, -106.690 35.000)', 4326)
      )
    `);

    console.log('Natural barriers added successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error adding barriers:', error);
    process.exit(1);
  }
}

addBarriers();
