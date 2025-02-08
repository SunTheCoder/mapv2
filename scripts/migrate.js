import { Sequelize } from 'sequelize';
import { exec } from 'child_process';
import { promisify } from 'util';
import createFeatures from '../migrations/20240208000001-create-feature.js';
import createEditHistory from '../migrations/20240208000002-create-edit-history.js';
import createUsers from '../migrations/20250208200728-create-user.js';

const execAsync = promisify(exec);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

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