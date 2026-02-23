const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Datenbank initialisieren ---
const db = new sqlite3.Database("database.sqlite");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    createdDate TEXT,
    creatorName TEXT,
    deviceName TEXT,
    description TEXT,
    repairDate TEXT,
    repairedBy TEXT,
    repairDetails TEXT,
    completed INTEGER DEFAULT 0
  )`);
});

// --- API Endpoints ---

// Liste aller Reparaturen
app.get("/api/repairs", (req, res) => {
    db.all("SELECT * FROM repairs ORDER BY id DESC", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Neue Reparatur erfassen
app.post("/api/repairs", (req, res) => {
    const { createdDate, creatorName, deviceName, description } = req.body;

    db.run(
        `INSERT INTO repairs (createdDate, creatorName, deviceName, description) VALUES (?, ?, ?, ?)`,
        [createdDate, creatorName, deviceName, description],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID });
        }
    );
});

// Eintrag bearbeiten (für Reparaturdetails)
app.put("/api/repairs/:id", (req, res) => {
    const { repairDate, repairedBy, repairDetails, completed } = req.body;
    const { id } = req.params;

    db.run(
        `UPDATE repairs SET repairDate=?, repairedBy=?, repairDetails=?, completed=? WHERE id=?`,
        [repairDate, repairedBy, repairDetails, completed ? 1 : 0, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ updated: this.changes });
        }
    );
});

app.listen(PORT, () => {
    console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
