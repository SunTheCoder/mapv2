import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

// Add this test query
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT * FROM "Features" LIMIT 1');
    console.log('Database connection successful:', result.rows);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};

testConnection();

export default pool; 