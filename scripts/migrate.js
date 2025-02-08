import { Sequelize } from 'sequelize';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import createFeatures from '../migrations/20240208000001-create-feature.js';
import createEditHistory from '../migrations/20240208000002-create-edit-history.js';
import createUsers from '../migrations/20250208200728-create-user.js';

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

async function runMigrations() {
  try {
    // Run migrations in order
    await createFeatures.up(sequelize.getQueryInterface(), Sequelize);
    console.log('Features table created');
    
    await createEditHistory.up(sequelize.getQueryInterface(), Sequelize);
    console.log('EditHistory table created');
    
    await createUsers.up(sequelize.getQueryInterface(), Sequelize);
    console.log('Users table created');
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await sequelize.close();
  }
}

runMigrations(); 