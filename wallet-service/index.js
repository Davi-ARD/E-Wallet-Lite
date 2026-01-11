const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: 'postgres://admin:root@postgres:5432/wallet_db' });

// Generate 12 Digit Angka
const generateAccountNumber = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

// 1. CREATE WALLET
app.post('/wallets/create', async (req, res) => {
    const { userId } = req.body;
    let created = false;
    
    // Loop untuk memastikan No Rekening unik
    while(!created) {
        try {
            const accNum = generateAccountNumber();
            await pool.query('INSERT INTO wallets (user_id, account_number, balance) VALUES ($1, $2, 0)', [userId, accNum]);
            created = true;
            res.json({ status: 'success', accountNumber: accNum });
        } catch (err) {
            if (err.code !== '23505') { // Jika errornya BUKAN karena duplikat, throw error
                return res.status(500).json({ error: err.message });
            }
        }
    }
});

// 2. CEK SALDO & INFO REKENING
app.get('/wallets/:userId', async (req, res) => {
    const result = await pool.query('SELECT * FROM wallets WHERE user_id=$1', [req.params.userId]);
    if(result.rows.length === 0) return res.status(404).json({error: "Wallet not found"});
    res.json(result.rows[0]);
});

// 3. LOOKUP USER ID BY ACCOUNT NUMBER (Untuk Transfer)
app.get('/wallets/lookup/:accountNumber', async (req, res) => {
    const result = await pool.query('SELECT user_id FROM wallets WHERE account_number=$1', [req.params.accountNumber]);
    if(result.rows.length === 0) return res.status(404).json({error: "Account not found"});
    res.json(result.rows[0]);
});

// 4. UPDATE SALDO (Atomic Transaction)
app.post('/wallets/update', async (req, res) => {
    const { userId, amount } = req.body; 
    
    try {
        // Menjamin saldo tidak akan menjadi negatif
        const result = await pool.query(
            'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 AND (balance + $1) >= 0 RETURNING balance', 
            [amount, userId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Saldo tidak cukup" });
        }
        res.json({ status: 'success', newBalance: result.rows[0].balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3002, () => console.log('Wallet Service running on 3002'));