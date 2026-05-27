const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

describe('Ecommerce CRUD API', function () {
  let productId;
  let orderId;

  it('creates a product', async function () {
    const res = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        description: 'Test product description',
        price: 49.99,
        stock: 8,
        image_url: ''
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('id');
    productId = res.body.id;
  });

  it('lists products', async function () {
    const res = await request(app).get('/api/products');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.some((product) => product.id === productId)).to.equal(true);
  });

  it('updates a product', async function () {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send({
        name: 'Updated Product',
        description: 'Updated description',
        price: 59.99,
        stock: 3,
        image_url: ''
      });

    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('Updated Product');
  });

  it('creates an order', async function () {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Jordan Lee',
        product_id: productId,
        quantity: 2,
        status: 'paid'
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('id');
    orderId = res.body.id;
  });

  it('lists orders', async function () {
    const res = await request(app).get('/api/orders');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.some((order) => order.id === orderId)).to.equal(true);
  });

  it('updates an order', async function () {
    const res = await request(app)
      .put(`/api/orders/${orderId}`)
      .send({
        customer_name: 'Jordan Lee',
        product_id: productId,
        quantity: 4,
        status: 'shipped'
      });

    expect(res.status).to.equal(200);
    expect(res.body.quantity).to.equal(4);
    expect(res.body.status).to.equal('shipped');
  });

  it('deletes the order', async function () {
    const res = await request(app).delete(`/api/orders/${orderId}`);
    expect(res.status).to.equal(200);
    expect(res.body.deleted).to.equal(true);
  });

  it('deletes the product', async function () {
    const res = await request(app).delete(`/api/products/${productId}`);
    expect(res.status).to.equal(200);
    expect(res.body.deleted).to.equal(true);
  });
});