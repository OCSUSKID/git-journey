const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbFile = path.join(__dirname, 'data.db');

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) console.error('Failed to open DB', err);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// List items
app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get single item
app.get('/api/items/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });
});

// Create item
app.post('/api/items', (req, res) => {
  let { name, description } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Name required' });
  name = name.trim();
  description = (description || '').toString().trim();
  if (name.length === 0 || name.length > 200) return res.status(400).json({ error: 'Name must be 1-200 chars' });
  if (description.length > 1000) return res.status(400).json({ error: 'Description too long' });
  db.run('INSERT INTO items (name, description) VALUES (?, ?)', [name, description], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM items WHERE id = ?', [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(row);
    });
  });
});

// Update item
app.put('/api/items/:id', (req, res) => {
  const id = req.params.id;
  let { name, description } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Name required' });
  name = name.trim();
  description = (description || '').toString().trim();
  if (name.length === 0 || name.length > 200) return res.status(400).json({ error: 'Name must be 1-200 chars' });
  if (description.length > 1000) return res.status(400).json({ error: 'Description too long' });
  db.run('UPDATE items SET name = ?, description = ? WHERE id = ?', [name, description, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM items WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

module.exports = app;
