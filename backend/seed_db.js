require('dotenv').config();
const { query } = require('./db');

// Sample providers in Albuquerque, NM to test routing across the Rio Grande river.
const providers = [
  {
    name: 'Westside Cardiology Associates',
    specialty: 'Cardiology',
    address: '10501 Golf Course Rd NW, Albuquerque, NM 87114',
    lon: -106.671382,
    lat: 35.195029
  },
  {
    name: 'Downtown Heart Institute',
    specialty: 'Cardiology',
    address: '500 Walter St NE, Albuquerque, NM 87102',
    lon: -106.634629,
    lat: 35.085868
  },
  {
    name: 'East Mountain Orthopedics',
    specialty: 'Orthopedics',
    address: '12127 NM-14, Cedar Crest, NM 87008',
    lon: -106.377317,
    lat: 35.109121
  },
  {
    name: 'Rio Rancho Orthopedic Care',
    specialty: 'Orthopedics',
    address: '1721 Rio Rancho Blvd SE, Rio Rancho, NM 87124',
    lon: -106.638548,
    lat: 35.228511
  }
];

async function seedDB() {
  try {
    console.log('Seeding database with mock providers...');
    
    // Clear existing data to avoid duplicates
    await query('TRUNCATE TABLE providers RESTART IDENTITY;');

    for (const p of providers) {
      await query(`
        INSERT INTO providers (name, specialty, address, location)
        VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
      `, [p.name, p.specialty, p.address, p.lon, p.lat]);
    }

    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDB();
