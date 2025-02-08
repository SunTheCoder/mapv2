import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class Feature extends Model {}

Feature.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  layerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  featureId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING
  },
  description: {
    type: DataTypes.TEXT
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  sequelize,
  modelName: 'Feature',
  timestamps: true
});

export default Feature; 