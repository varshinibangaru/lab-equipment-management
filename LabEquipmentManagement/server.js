const express = require('express');
const mysql = require('mysql2');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'lab_management',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.log("Database Connection Failed", err);
    } else {
        console.log("MySQL Connected Successfully");
    }
});

// Home Page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// View Equipment
app.get('/equipment', (req, res) => {
    db.query('SELECT * FROM equipment', (err, result) => {
        if (err) return res.status(500).send(err.message);
        res.json(result);
    });
});

// Add Equipment
app.post('/add-equipment', (req, res) => {
    const { name, category, quantity, available, status } = req.body;

    db.query(
        'INSERT INTO equipment (name, category, quantity, available, status) VALUES (?, ?, ?, ?, ?)',
        [name, category, quantity, available, status],
        (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.send("Equipment Added Successfully");
        }
    );
});

// Search Equipment
app.get('/search-equipment', (req, res) => {
    const name = req.query.name;

    db.query(
        'SELECT * FROM equipment WHERE name LIKE ?',
        [`%${name}%`],
        (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.json(result);
        }
    );
});

// Update Equipment
app.put('/update-equipment/:id', (req, res) => {
    const { name, category, quantity, available, status } = req.body;

    db.query(
        'UPDATE equipment SET name=?, category=?, quantity=?, available=?, status=? WHERE id=?',
        [name, category, quantity, available, status, req.params.id],
        (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.send("Equipment Updated Successfully");
        }
    );
});

// Delete Equipment
app.delete('/delete-equipment/:id', (req, res) => {
    db.query(
        'DELETE FROM equipment WHERE id=?',
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.send("Equipment Deleted Successfully");
        }
    );
});
app.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, result) => {
        if (err) return res.status(500).send(err.message);
        res.json(result);
    });
});
// Add User
app.post('/add-user', (req, res) => {
    const { name, roll_no, department, role, phone } = req.body;

    db.query(
        'INSERT INTO users (name, roll_no, department, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name, roll_no, department, role, phone],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.send('User Added Successfully');
        }
    );
});

// Search User
app.get('/search-user', (req, res) => {
    const value = req.query.value || '';

    db.query(
        'SELECT * FROM users WHERE name LIKE ? OR roll_no LIKE ?',
        [`%${value}%`, `%${value}%`],
        (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.json(result);
        }
    );
});

// Update User
app.put('/update-user/:id', (req, res) => {
    const { name, roll_no, department, role, phone } = req.body;

    db.query(
        'UPDATE users SET name=?, roll_no=?, department=?, role=?, phone=? WHERE id=?',
        [name, roll_no, department, role, phone, req.params.id],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.send('User Updated Successfully');
        }
    );
});

// Delete User
app.delete('/delete-user/:id', (req, res) => {
    db.query(
        'DELETE FROM users WHERE id=?',
        [req.params.id],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.send('User Deleted Successfully');
        }
    );
});
// Issue Equipment
app.post('/issue-equipment', (req, res) => {
    const { equipment_id, user_id, issue_date } = req.body;

    db.query(
        'SELECT available FROM equipment WHERE id=?',
        [equipment_id],
        (err, result) => {
            if (err) return res.status(500).send(err.message);

            if (result.length === 0 || result[0].available <= 0) {
                return res.status(400).send('Equipment Not Available');
            }

            db.query(
                'INSERT INTO issue_records (equipment_id, user_id, issue_date, status) VALUES (?, ?, ?, ?)',
                [equipment_id, user_id, issue_date, 'Issued'],
                (err) => {
                    if (err) return res.status(500).send(err.message);

                    db.query(
                        'UPDATE equipment SET available = available - 1 WHERE id=?',
                        [equipment_id],
                        (err) => {
                            if (err) return res.status(500).send(err.message);
                            res.send('Equipment Issued Successfully');
                        }
                    );
                }
            );
        }
    );
});

// View Issue Records
app.get('/issue-records', (req, res) => {
    db.query('SELECT * FROM issue_records', (err, result) => {
        if (err) return res.status(500).send(err.message);
        res.json(result);
    });
});

// Return Equipment
app.put('/return-equipment/:id', (req, res) => {
    db.query(
        'SELECT equipment_id, status FROM issue_records WHERE id=?',
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).send(err.message);

            if (result.length === 0 || result[0].status !== 'Issued') {
                return res.status(400).send('Invalid Return');
            }

            const equipmentId = result[0].equipment_id;

            db.query(
                'UPDATE issue_records SET status=?, return_date=CURDATE() WHERE id=?',
                ['Returned', req.params.id],
                (err) => {
                    if (err) return res.status(500).send(err.message);

                    db.query(
                        'UPDATE equipment SET available=available+1 WHERE id=?',
                        [equipmentId],
                        (err) => {
                            if (err) return res.status(500).send(err.message);
                            res.send('Equipment Returned Successfully');
                        }
                    );
                }
            );
        }
    );
});
// View All Reports
app.get('/all-reports', (req, res) => {

    const sql = `
        SELECT 
            ir.id,
            e.name AS equipment_name,
            u.name AS user_name,
            u.roll_no,
            ir.issue_date,
            ir.return_date,
            ir.status
        FROM issue_records ir
        JOIN equipment e ON ir.equipment_id = e.id
        JOIN users u ON ir.user_id = u.id
        ORDER BY ir.id DESC
    `;

    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        res.json(result);
    });
});
// Dashboard Issued Equipment Count
app.get('/dashboard-stats', (req, res) => {

    const sql = `
        SELECT COUNT(*) AS issued_count
        FROM issue_records
        WHERE LOWER(TRIM(status)) = 'issued'
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err.message);

        res.json({
            issued: result[0].issued_count
        });
    });
});
// Dashboard Statistics
app.get('/dashboard-stats', (req, res) => {

    const sql = `
        SELECT
            (SELECT COUNT(*) FROM equipment) AS total_equipment,
            (SELECT SUM(available) FROM equipment) AS available_equipment,
            (SELECT COUNT(*) FROM issue_records
             WHERE status = 'Issued') AS issued_equipment,
            (SELECT COUNT(*) FROM users) AS total_users
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send(err.message);
        }

        res.json(result[0]);
    });
});
// Start Server
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});