const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json()); // ersetzt bodyParser.json()
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("database.sqlite");

// Tabelle erzeugen
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

// Alle Reparaturen abrufen
app.get("/api/repairs", (req, res) => {
    db.all("SELECT * FROM repairs ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Neue Reparatur hinzufügen
app.post("/api/repairs", (req, res) => {
    const { createdDate, creatorName, deviceName, description } = req.body;
    if (!creatorName || !deviceName || !description) {
        return res.status(400).json({ error: "Pflichtfelder fehlen." });
    }

    db.run(
        `INSERT INTO repairs (createdDate, creatorName, deviceName, description)
         VALUES (?, ?, ?, ?)`,
        [createdDate, creatorName, deviceName, description],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ id: this.lastID });
        }
    );
});

// Reparatur aktualisieren
app.put("/api/repairs/:id", (req, res) => {
    const { id } = req.params;
    const { repairDate, repairedBy, repairDetails, completed } = req.body;

    db.run(
        `UPDATE repairs
         SET repairDate = ?, repairedBy = ?, repairDetails = ?, completed = ?
         WHERE id = ?`,
        [repairDate, repairedBy, repairDetails, completed ? 1 : 0, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.listen(PORT, () =>
    console.log(`✅ Server läuft auf http://localhost:${PORT}`)
);
