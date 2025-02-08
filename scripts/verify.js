import { Sequelize } from 'sequelize';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = process.env.NODE_ENV || 'development';
const config = JSON.parse(
  readFileSync(join(__dirname, '..', 'config', 'config.json'))
)[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect
  }
);

async function verifyData() {
  try {
    const [results] = await sequelize.query('SELECT * FROM "Features" WHERE "layerId" = \'region\'');
    console.log('Found Features:', results.length);
    results.forEach(feature => {
      console.log('\nRegion:', feature.name);
      console.log('Metadata:', JSON.parse(feature.metadata));
    });
  } catch (error) {
    console.error('Error verifying data:', error);
  } finally {
    await sequelize.close();
  }
}

verifyData(); 