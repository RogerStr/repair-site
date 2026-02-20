const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    createdDate TEXT,
    creatorName TEXT,
    deviceName TEXT,
    problem TEXT,
    solvedDate TEXT,
    solverName TEXT,
    solution TEXT
  )`);
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/repairs', (req, res) => {
  db.all('SELECT * FROM repairs', [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/api/repairs', (req, res) => {
  const r = req.body;
  db.run(`INSERT INTO repairs (createdDate, creatorName, deviceName, problem, solvedDate, solverName, solution)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [r.createdDate, r.creatorName, r.deviceName, r.problem, r.solvedDate, r.solverName, r.solution]);
  res.json({status:'ok'});
});

app.put('/api/repairs/:id', (req, res) => {
  const r = req.body;
  db.run(`UPDATE repairs SET createdDate=?, creatorName=?, deviceName=?, problem=?, solvedDate=?, solverName=?, solution=? WHERE id=?`,
    [r.createdDate, r.creatorName, r.deviceName, r.problem, r.solvedDate, r.solverName, r.solution, req.params.id]);
  res.json({status:'updated'});
});

app.delete('/api/repairs/:id', (req, res) => {
  db.run('DELETE FROM repairs WHERE id=?', req.params.id);
  res.json({status:'deleted'});
});

app.get('/api/stats', (req, res) => {
  const stats = {};
  db.serialize(() => {
    db.get('SELECT COUNT(*) as total FROM repairs', (err, row) => {
      stats.total = row.total;
      db.all('SELECT deviceName, COUNT(*) as count FROM repairs GROUP BY deviceName', (err, rows) => {
        stats.devices = rows;
        db.get('SELECT COUNT(*) as solved FROM repairs WHERE solvedDate IS NOT NULL AND solvedDate != ""', (err, row) => {
          stats.solved = row.solved;
          res.json(stats);
        });
      });
    });
  });
});

app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
