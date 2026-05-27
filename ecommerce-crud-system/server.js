const express = require('express');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbFile = path.join(__dirname, 'data.db');

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) console.error('Failed to open DB', err);
});

const sessions = new Map();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, password_hash: hashPassword(password, salt) };
}

function safeEqual(a, b) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getAuthToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
}

function requireAdmin(req, res, next) {
  const token = getAuthToken(req);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.adminUser = sessions.get(token);
  next();
}

function ensureColumn(tableName, columnName, definition, callback) {
  db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
    if (err) {
      callback(err);
      return;
    }

    const exists = columns.some((column) => column.name === columnName);
    if (exists) {
      callback(null);
      return;
    }

    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`, callback);
  });
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  ensureColumn('products', 'category', "category TEXT NOT NULL DEFAULT 'General'", (err) => {
    if (err) console.error('Failed to ensure category column', err.message);
  });

  db.get('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME], (err, row) => {
    if (err) {
      console.error('Failed to check default admin', err.message);
      return;
    }
    if (!row) {
      const record = createPasswordRecord(ADMIN_PASSWORD);
      db.run(
        'INSERT INTO users (username, password_salt, password_hash, role) VALUES (?, ?, ?, ?)',
        [ADMIN_USERNAME, record.salt, record.password_hash, 'admin'],
        (insertErr) => {
          if (insertErr) console.error('Failed to create default admin', insertErr.message);
        }
      );
    }
  });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function validateProduct(body) {
  const name = (body.name || '').toString().trim();
  const description = (body.description || '').toString().trim();
  const category = (body.category || 'General').toString().trim() || 'General';
  const price = Number(body.price);
  const stock = Number(body.stock);
  const image_url = (body.image_url || '').toString().trim();

  if (!name) return { error: 'Name required' };
  if (name.length > 120) return { error: 'Name must be 1-120 chars' };
  if (category.length > 80) return { error: 'Category must be 1-80 chars' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a valid positive number' };
  if (!Number.isInteger(stock) || stock < 0) return { error: 'Stock must be a whole number 0 or greater' };

  return { name, description, category, price, stock, image_url };
}

function validateOrder(body) {
  const customer_name = (body.customer_name || '').toString().trim();
  const product_id = Number(body.product_id);
  const quantity = Number(body.quantity);
  const status = (body.status || 'pending').toString().trim().toLowerCase();
  const allowedStatuses = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled'];

  if (!customer_name) return { error: 'Customer name required' };
  if (!Number.isInteger(product_id) || product_id <= 0) return { error: 'Product id required' };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'Quantity must be a whole number greater than 0' };
  if (!allowedStatuses.includes(status)) return { error: 'Invalid status' };

  return { customer_name, product_id, quantity, status };
}

app.get('/api/auth/me', (req, res) => {
  const token = getAuthToken(req);
  if (!token || !sessions.has(token)) {
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, user: sessions.get(token) });
});

app.post('/api/auth/login', (req, res) => {
  const username = (req.body?.username || '').toString().trim();
  const password = (req.body?.password || '').toString();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const expectedHash = hashPassword(password, user.password_salt);
    if (!safeEqual(expectedHash, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { id: user.id, username: user.username, role: user.role });
    res.setHeader('Set-Cookie', `admin_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax`);
    res.json({ authenticated: true, user: { id: user.id, username: user.username, role: user.role } });
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getAuthToken(req);
  if (token) {
    sessions.delete(token);
  }
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ authenticated: false });
});

app.get('/api/products', (req, res) => {
  const search = (req.query.search || '').toString().trim();
  const category = (req.query.category || '').toString().trim();
  const lowStockOnly = req.query.lowStock === '1';

  const conditions = [];
  const values = [];

  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (category) {
    conditions.push('category = ?');
    values.push(category);
  }

  if (lowStockOnly) {
    conditions.push('stock <= 5');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  db.all(`SELECT * FROM products ${whereClause} ORDER BY id DESC`, values, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

app.post('/api/products', requireAdmin, (req, res) => {
  const payload = validateProduct(req.body || {});
  if (payload.error) return res.status(400).json({ error: payload.error });

  db.run(
    'INSERT INTO products (name, description, category, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)',
    [payload.name, payload.description, payload.category, payload.price, payload.stock, payload.image_url],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(row);
      });
    }
  );
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const payload = validateProduct(req.body || {});
  if (payload.error) return res.status(400).json({ error: payload.error });

  db.run(
    'UPDATE products SET name = ?, description = ?, category = ?, price = ?, stock = ?, image_url = ? WHERE id = ?',
    [payload.name, payload.description, payload.category, payload.price, payload.stock, payload.image_url, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
      db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  });
});

app.post('/api/products/:id/restock', requireAdmin, (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a whole number greater than 0' });
  }

  db.run(
    'UPDATE products SET stock = stock + ? WHERE id = ?',
    [amount, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
      db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (selectErr, row) => {
        if (selectErr) return res.status(500).json({ error: selectErr.message });
        res.json(row);
      });
    }
  );
});

app.get('/api/stats', (req, res) => {
  db.get('SELECT COUNT(*) AS totalProducts, COALESCE(SUM(stock), 0) AS totalInventory, SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS lowStockProducts FROM products', [], (productErr, productRow) => {
    if (productErr) return res.status(500).json({ error: productErr.message });

    db.get('SELECT COUNT(*) AS totalOrders, COALESCE(SUM(quantity), 0) AS totalUnitsOrdered FROM orders', [], (orderErr, orderRow) => {
      if (orderErr) return res.status(500).json({ error: orderErr.message });

      db.all('SELECT status, COUNT(*) AS count FROM orders GROUP BY status', [], (statusErr, statusRows) => {
        if (statusErr) return res.status(500).json({ error: statusErr.message });

        const ordersByStatus = statusRows.reduce((accumulator, item) => {
          accumulator[item.status] = item.count;
          return accumulator;
        }, {});

        res.json({
          products: productRow,
          orders: orderRow,
          ordersByStatus
        });
      });
    });
  });
});

app.get('/api/orders', (req, res) => {
  db.all(
    `SELECT orders.*, products.name AS product_name, products.price AS product_price
     FROM orders
     JOIN products ON products.id = orders.product_id
     ORDER BY orders.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/orders/:id', (req, res) => {
  db.get(
    `SELECT orders.*, products.name AS product_name, products.price AS product_price
     FROM orders
     JOIN products ON products.id = orders.product_id
     WHERE orders.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    }
  );
});

app.post('/api/orders', requireAdmin, (req, res) => {
  const payload = validateOrder(req.body || {});
  if (payload.error) return res.status(400).json({ error: payload.error });

  db.get('SELECT id FROM products WHERE id = ?', [payload.product_id], (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    db.run(
      'INSERT INTO orders (customer_name, product_id, quantity, status) VALUES (?, ?, ?, ?)',
      [payload.customer_name, payload.product_id, payload.quantity, payload.status],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get(
          `SELECT orders.*, products.name AS product_name, products.price AS product_price
           FROM orders
           JOIN products ON products.id = orders.product_id
           WHERE orders.id = ?`,
          [this.lastID],
          (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json(row);
          }
        );
      }
    );
  });
});

app.put('/api/orders/:id', requireAdmin, (req, res) => {
  const payload = validateOrder(req.body || {});
  if (payload.error) return res.status(400).json({ error: payload.error });

  db.get('SELECT id FROM products WHERE id = ?', [payload.product_id], (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    db.run(
      'UPDATE orders SET customer_name = ?, product_id = ?, quantity = ?, status = ? WHERE id = ?',
      [payload.customer_name, payload.product_id, payload.quantity, payload.status, req.params.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
        db.get(
          `SELECT orders.*, products.name AS product_name, products.price AS product_price
           FROM orders
           JOIN products ON products.id = orders.product_id
           WHERE orders.id = ?`,
          [req.params.id],
          (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row);
          }
        );
      }
    );
  });
});

app.delete('/api/orders/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM orders WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

module.exports = app;