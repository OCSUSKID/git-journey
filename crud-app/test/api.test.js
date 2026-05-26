const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

describe('API basic CRUD', function () {
  let createdId;

  it('creates an item', async function () {
    const res = await request(app)
      .post('/api/items')
      .send({ name: 'test item', description: 'desc' })
      .set('Accept', 'application/json');
    expect(res.status).to.be.oneOf([200,201]);
    expect(res.body).to.have.property('id');
    createdId = res.body.id;
  });

  it('lists items', async function () {
    const res = await request(app).get('/api/items');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('updates an item', async function () {
    const res = await request(app)
      .put(`/api/items/${createdId}`)
      .send({ name: 'updated', description: 'updated desc' });
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('updated');
  });

  it('deletes the item', async function () {
    const res = await request(app).delete(`/api/items/${createdId}`);
    expect(res.status).to.equal(200);
    expect(res.body.deleted).to.equal(true);
  });
});
