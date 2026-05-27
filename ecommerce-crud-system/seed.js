const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB', err.message);
    process.exit(1);
  }
});

const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, password_hash: hashPassword(password, salt) };
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
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

  db.run('DELETE FROM orders');
  db.run('DELETE FROM products');

  db.run('DELETE FROM users');

  const products = db.prepare('INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)');
  products.run('Canvas Sneakers', 'Lightweight everyday sneakers with a clean finish.', 59.99, 18, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80');
  products.run('Leather Backpack', 'Durable commuter backpack with multiple compartments.', 89.5, 12, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80');
  products.run('Wireless Headphones', 'Noise-isolating headphones with 30-hour battery life.', 129.0, 25, 'https://images.unsplash.com/photo-1518441902117-f0a9d6b0bb58?auto=format&fit=crop&w=900&q=80');
  products.finalize();

  const admin = createPasswordRecord('admin123');
  db.run('INSERT INTO users (username, password_salt, password_hash, role) VALUES (?, ?, ?, ?)', [
    'admin',
    admin.salt,
    admin.password_hash,
    'admin'
  ]);

  db.get('SELECT id FROM products ORDER BY id ASC LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('Seed verification failed', err.message);
      process.exitCode = 1;
      db.close();
      return;
    }

    if (row) {
      db.run('INSERT INTO orders (customer_name, product_id, quantity, status) VALUES (?, ?, ?, ?)', [
        'Ava Johnson',
        row.id,
        2,
        'paid'
      ]);
    }

    db.all('SELECT * FROM products', [], (productErr, productRows) => {
      if (productErr) {
        console.error('Seed verification failed', productErr.message);
        process.exitCode = 1;
      } else {
        console.log(`Seeded ${productRows.length} products into ${dbFile}`);
      }
      db.close();
    });
  });
});