'use strict';

/** @type {import('sequelize-cli').Migration} */
const migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Features', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      layerId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      featureId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      metadata: {
        type: Sequelize.JSONB
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addConstraint('Features', {
      fields: ['layerId', 'featureId'],
      type: 'unique',
      name: 'unique_layer_feature'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Features');
  }
};

export default migration; 