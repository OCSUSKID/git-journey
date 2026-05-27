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
  const admin = createPasswordRecord('admin123');

  const statements = [
    'PRAGMA foreign_keys = ON',
    'BEGIN TRANSACTION',
    'DROP TABLE IF EXISTS orders',
    'DROP TABLE IF EXISTS products',
    'DROP TABLE IF EXISTS users',
    `CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'General',
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `INSERT INTO products (name, description, category, price, stock, image_url) VALUES
      ('Canvas Sneakers', 'Lightweight everyday sneakers with a clean finish.', 'Footwear', 59.99, 18, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'),
      ('Leather Backpack', 'Durable commuter backpack with multiple compartments.', 'Accessories', 89.5, 12, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80'),
      ('Wireless Headphones', 'Noise-isolating headphones with 30-hour battery life.', 'Electronics', 129.0, 25, 'https://images.unsplash.com/photo-1518441902117-f0a9d6b0bb58?auto=format&fit=crop&w=900&q=80')`,
    `INSERT INTO users (username, password_salt, password_hash, role) VALUES
      ('admin', '${admin.salt}', '${admin.password_hash}', 'admin')`,
    `INSERT INTO orders (customer_name, product_id, quantity, status) VALUES
      ('Ava Johnson', 1, 2, 'paid')`,
    'COMMIT'
  ];

  db.exec(statements.join(';\n'), (err) => {
    if (err) {
      console.error('Seed failed', err.message);
      process.exitCode = 1;
      db.close();
      return;
    }

    db.get('SELECT COUNT(*) AS productCount FROM products', [], (countErr, row) => {
      if (countErr) {
        console.error('Seed verification failed', countErr.message);
        process.exitCode = 1;
      } else {
        console.log(`Seeded ${row.productCount} products into ${dbFile}`);
      }
      db.close();
    });
  });
});