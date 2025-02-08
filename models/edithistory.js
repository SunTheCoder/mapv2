import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class EditHistory extends Model {}

EditHistory.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  featureId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  editedBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  changes: {
    type: DataTypes.JSONB
  }
}, {
  sequelize,
  modelName: 'EditHistory',
  timestamps: true,
  updatedAt: false
});

export default EditHistory; 