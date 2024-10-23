const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Set up SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error(err.message);
    }
});

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL
    )`);
    
    db.run(`CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
        category INTEGER,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (category) REFERENCES categories (id)
    )`);
});

// API Endpoints

// Add a new transaction
app.post('/transactions', (req, res) => {
    const { type, category, amount, date, description } = req.body;
    db.run(`INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)`, 
        [type, category, amount, date, description], function(err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID });
    });
});

// Get all transactions
app.get('/transactions', (req, res) => {
    db.all(`SELECT * FROM transactions`, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get a transaction by ID
app.get('/transactions/:id', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM transactions WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(row);
    });
});

// Update a transaction by ID
app.put('/transactions/:id', (req, res) => {
    const { type, category, amount, date, description } = req.body;
    const id = req.params.id;
    db.run(`UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?`, 
        [type, category, amount, date, description, id], function(err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({ updatedID: id });
    });
});

// Delete a transaction by ID
app.delete('/transactions/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM transactions WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ deletedID: id });
    });
});

// Get transaction summary
app.get('/summary', (req, res) => {
    const { startDate, endDate } = req.query; // Optional date filtering
    let query = `SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
                 FROM transactions`;
    const params = [];

    if (startDate && endDate) {
        query += ` WHERE date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    db.get(query, params, (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        const balance = row.totalIncome - row.totalExpenses;
        res.json({ ...row, balance });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
