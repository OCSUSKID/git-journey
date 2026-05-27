const assert = require('assert');
const request = require('supertest');
const app = require('../server');

async function main() {
  const agent = request.agent(app);

  const unauthorizedProductResponse = await request(app)
    .post('/api/products')
    .send({
      name: 'Blocked Product',
      description: 'Should not be created without login',
      price: 10,
      stock: 1,
      image_url: ''
    });
  assert.strictEqual(unauthorizedProductResponse.status, 401, 'write route should require auth');

  const loginResponse = await agent
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  assert.strictEqual(loginResponse.status, 200, 'login should return 200');
  assert.strictEqual(loginResponse.body.authenticated, true, 'login should authenticate');

  const meResponse = await agent.get('/api/auth/me');
  assert.strictEqual(meResponse.status, 200, 'me should return 200');
  assert.strictEqual(meResponse.body.authenticated, true, 'me should show authenticated');

  const productResponse = await agent
    .post('/api/products')
    .send({
      name: 'Test Product',
      description: 'Test product description',
      price: 49.99,
      stock: 8,
      image_url: ''
    });
  assert.strictEqual(productResponse.status, 201, 'create product should return 201');
  const productId = productResponse.body.id;
  assert.ok(productId, 'created product should include id');

  const productsResponse = await request(app).get('/api/products');
  assert.strictEqual(productsResponse.status, 200, 'list products should return 200');
  assert.ok(Array.isArray(productsResponse.body), 'products response should be an array');
  assert.ok(productsResponse.body.some((product) => product.id === productId), 'created product should be listed');

  const updateProductResponse = await agent
    .put(`/api/products/${productId}`)
    .send({
      name: 'Updated Product',
      description: 'Updated description',
      price: 59.99,
      stock: 3,
      image_url: ''
    });
  assert.strictEqual(updateProductResponse.status, 200, 'update product should return 200');
  assert.strictEqual(updateProductResponse.body.name, 'Updated Product', 'updated product should have new name');

  const orderResponse = await agent
    .post('/api/orders')
    .send({
      customer_name: 'Jordan Lee',
      product_id: productId,
      quantity: 2,
      status: 'paid'
    });
  assert.strictEqual(orderResponse.status, 201, 'create order should return 201');
  const orderId = orderResponse.body.id;
  assert.ok(orderId, 'created order should include id');

  const ordersResponse = await request(app).get('/api/orders');
  assert.strictEqual(ordersResponse.status, 200, 'list orders should return 200');
  assert.ok(Array.isArray(ordersResponse.body), 'orders response should be an array');
  assert.ok(ordersResponse.body.some((order) => order.id === orderId), 'created order should be listed');

  const updateOrderResponse = await agent
    .put(`/api/orders/${orderId}`)
    .send({
      customer_name: 'Jordan Lee',
      product_id: productId,
      quantity: 4,
      status: 'shipped'
    });
  assert.strictEqual(updateOrderResponse.status, 200, 'update order should return 200');
  assert.strictEqual(updateOrderResponse.body.quantity, 4, 'updated order should have new quantity');
  assert.strictEqual(updateOrderResponse.body.status, 'shipped', 'updated order should have new status');

  const deleteOrderResponse = await agent.delete(`/api/orders/${orderId}`);
  assert.strictEqual(deleteOrderResponse.status, 200, 'delete order should return 200');
  assert.strictEqual(deleteOrderResponse.body.deleted, true, 'delete order should confirm deletion');

  const deleteProductResponse = await agent.delete(`/api/products/${productId}`);
  assert.strictEqual(deleteProductResponse.status, 200, 'delete product should return 200');
  assert.strictEqual(deleteProductResponse.body.deleted, true, 'delete product should confirm deletion');

  const logoutResponse = await agent.post('/api/auth/logout');
  assert.strictEqual(logoutResponse.status, 200, 'logout should return 200');
  assert.strictEqual(logoutResponse.body.authenticated, false, 'logout should clear auth');

  console.log('All ecommerce CRUD tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});