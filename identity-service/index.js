const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const app = express();

app.use(express.json());

const pool = new Pool({ connectionString: 'postgres://admin:root@postgres:5432/identity_db' });
const JWT_SECRET = 'rahasia_negara_api';

// 1. REGISTER
app.post('/auth/register', async (req, res) => {
    const { username, password, pin, fullName } = req.body;
    
    try {
        // Hash Password & PIN
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedPin = await bcrypt.hash(pin, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password, pin_hash, full_name) VALUES ($1, $2, $3, $4) RETURNING id', 
            [username, hashedPassword, hashedPin, fullName]
        );
        const userId = result.rows[0].id;

        // Panggil Wallet Service untuk generate Rekening (Inter-service communication)
        await axios.post('http://wallet-service:3002/wallets/create', { userId });

        res.json({ message: "Registrasi Berhasil", userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal Register / Username sudah ada" });
    }
});

// 2. LOGIN (Return JWT)
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    
    if (result.rows.length === 0) return res.status(401).json({ message: "User tidak ditemukan" });
    
    const user = result.rows[0];
    const validPass = await bcrypt.compare(password, user.password);
    
    if (!validPass) return res.status(401).json({ message: "Password salah" });

    // Buat Token JWT
    const token = jwt.sign({ userId: user.id, name: user.full_name }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user.id, fullName: user.full_name });
});

// 3. VALIDASI PIN (Internal Use Only - Dipanggil Transaction Service)
app.post('/auth/validate-pin', async (req, res) => {
    const { userId, pin } = req.body;
    const result = await pool.query('SELECT pin_hash FROM users WHERE id=$1', [userId]);
    
    if (result.rows.length === 0) return res.status(404).json({ valid: false });
    
    const valid = await bcrypt.compare(pin, result.rows[0].pin_hash);
    if(valid) res.json({ valid: true });
    else res.status(401).json({ valid: false });
});

// 4. GET PROFILE
app.get('/users/:id', async (req, res) => {
    const result = await pool.query('SELECT id, username, full_name, profile_pic FROM users WHERE id=$1', [req.params.id]);
    res.json(result.rows[0]);
});

// UPDATE PROFILE
app.put('/users/update', async (req, res) => {
    const { userId, fullName, newPassword, newPin } = req.body;
    
    try {
        // Update Nama
        if (fullName) {
            await pool.query('UPDATE users SET full_name=$1 WHERE id=$2', [fullName, userId]);
        }

        // Update Password
        if (newPassword) {
            const hashedPass = await bcrypt.hash(newPassword, 10);
            await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashedPass, userId]);
        }

        // Update PIN
        if (newPin) {
            const hashedPin = await bcrypt.hash(newPin, 10);
            await pool.query('UPDATE users SET pin_hash=$1 WHERE id=$2', [hashedPin, userId]);
        }

        res.json({ status: 'success', message: "Profil berhasil diperbarui" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal update profil" });
    }
});

app.listen(3001, () => console.log('Identity Service running on 3001'));