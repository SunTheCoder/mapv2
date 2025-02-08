'use strict';

const regions = [
  {
    id: '1',
    layerId: 'region',
    featureId: 'pacific-west',
    name: 'Pacific West',
    description: 'Pacific West region of the United States',
    metadata: '{"states":["WA","OR","CA","NV","AK","HI","AS","GU","MP"],"population":"78.2M","area":"1,009,261 sq mi"}',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    layerId: 'region',
    featureId: 'west-central',
    name: 'West Central',
    description: 'West Central region of the United States',
    metadata: '{"states":["MT","ID","WY","UT","CO","AZ","NM","ND","SD","NE","KS","IA","MN","MO"],"population":"45.3M","area":"929,479 sq mi"}',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    layerId: 'region',
    featureId: 'south-central',
    name: 'South Central',
    description: 'South Central region of the United States',
    metadata: '{"states":["TX","OK","AR","LA","MS","AL"],"population":"51.8M","area":"503,926 sq mi"}',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    layerId: 'region',
    featureId: 'east-central',
    name: 'East Central',
    description: 'East Central region of the United States',
    metadata: '{"states":["WI","MI","IL","IN","OH","KY","TN","WV"],"population":"65.7M","area":"378,234 sq mi"}',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    layerId: 'region',
    featureId: 'southeast',
    name: 'Southeast',
    description: 'Southeast region of the United States',
    metadata: '{"states":["NC","SC","GA","FL","PR","VI","VA"],"population":"57.9M","area":"292,773 sq mi"}',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '6',
    layerId: 'region',
    featureId: 'northeast',
    name: 'Northeast',
    description: 'Northeast region of the United States',
    metadata: '{"states":["ME","NH","VT","MA","RI","CT","NY","PA","NJ","DE","MD","DC"],"population":"65.5M","area":"181,324 sq mi"}',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const seeder = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('Features', regions, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Features', {
      layerId: 'region'
    }, {});
  }
};

export default seeder; 