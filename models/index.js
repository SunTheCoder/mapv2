'use strict';

import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Feature from './feature.js';
import EditHistory from './edithistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const env = process.env.NODE_ENV || 'development';
const config = JSON.parse(fs.readFileSync(join(__dirname, '..', 'config', 'config.json')))[env];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const db = {
  Feature: Feature(sequelize, Sequelize.DataTypes),
  EditHistory: EditHistory(sequelize, Sequelize.DataTypes)
};

// Define associations
Feature.hasMany(EditHistory, {
  foreignKey: 'featureId',
  as: 'editHistory'
});

EditHistory.belongsTo(Feature, {
  foreignKey: 'featureId',
  as: 'feature'
});

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
