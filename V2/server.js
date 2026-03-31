const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Upload-Verzeichnis erstellen
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer-Konfiguration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    },
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Nur Bilder erlaubt."), false);
    }
}});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

const db = new sqlite3.Database("database.sqlite");

// Tabelle erzeugen
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createdDate TEXT,
        creatorName TEXT,
        deviceName TEXT,
        description TEXT,
        photos TEXT DEFAULT '[]',
        repairDate TEXT,
        repairedBy TEXT,
        repairDetails TEXT,
        completed INTEGER DEFAULT 0
    )`);
    // Spalte nachrüsten falls Tabelle schon existiert
    db.run(`ALTER TABLE repairs ADD COLUMN photos TEXT DEFAULT '[]'`, () => {});
});

// Alle Reparaturen abrufen
app.get("/api/repairs", (req, res) => {
    db.all("SELECT * FROM repairs ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Neue Reparatur hinzufügen
app.post("/api/repairs", upload.array("photos", 10), (req, res) => {
    const { createdDate, creatorName, deviceName, description } = req.body;
    if (!creatorName || !deviceName || !description) {
        return res.status(400).json({ error: "Pflichtfelder fehlen." });
    }

    const photos = (req.files || []).map(f => "/uploads/" + f.filename);

    db.run(
        `INSERT INTO repairs (createdDate, creatorName, deviceName, description, photos)
         VALUES (?, ?, ?, ?, ?)`,
        [createdDate, creatorName, deviceName, description, JSON.stringify(photos)],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ id: this.lastID });
        }
    );
});

// Reparatur aktualisieren
app.put("/api/repairs/:id", (req, res) => {
    const { id } = req.params;
    const { deviceName, description, repairDate, repairedBy, repairDetails, completed } = req.body;

    db.run(
        `UPDATE repairs
         SET deviceName = ?, description = ?, repairDate = ?, repairedBy = ?, repairDetails = ?, completed = ?
         WHERE id = ?`,
        [deviceName, description, repairDate, repairedBy, repairDetails, completed ? 1 : 0, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

// Fotos nachträglich hinzufügen
app.post("/api/repairs/:id/photos", upload.array("photos", 10), (req, res) => {
    const { id } = req.params;
    const newPhotos = (req.files || []).map(f => "/uploads/" + f.filename);
    if (!newPhotos.length) {
        return res.status(400).json({ error: "Keine Fotos hochgeladen." });
    }

    db.get("SELECT photos FROM repairs WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Reparatur nicht gefunden." });

        let existing = [];
        try { existing = JSON.parse(row.photos || "[]"); } catch (e) {}
        const combined = existing.concat(newPhotos);

        db.run("UPDATE repairs SET photos = ? WHERE id = ?", [JSON.stringify(combined), id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ photos: combined });
        });
    });
});

// Einzelnes Foto löschen
app.delete("/api/repairs/:id/photos", express.json(), (req, res) => {
    const { id } = req.params;
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ error: "Foto-Pfad fehlt." });

    db.get("SELECT photos FROM repairs WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Reparatur nicht gefunden." });

        let existing = [];
        try { existing = JSON.parse(row.photos || "[]"); } catch (e) {}
        const updated = existing.filter(p => p !== photo);

        db.run("UPDATE repairs SET photos = ? WHERE id = ?", [JSON.stringify(updated), id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Datei vom Dateisystem löschen
            const filePath = path.join(__dirname, photo);
            fs.unlink(filePath, () => {});

            res.json({ photos: updated });
        });
    });
});

app.listen(PORT, () =>
    console.log(`✅ Server läuft auf http://localhost:${PORT}`)
);
