const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run('DELETE FROM items');

  const stmt = db.prepare('INSERT INTO items (name, description) VALUES (?, ?)');
  stmt.run('Sample task', 'This item was added by the seed script.');
  stmt.run('Another task', 'You can edit or delete this item from the UI.');
  stmt.finalize();

  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
      console.error('Seed verification failed', err.message);
      process.exitCode = 1;
    } else {
      console.log(`Seeded ${rows.length} items into ${dbFile}`);
    }
    db.close();
  });
});
