const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: 'postgres://admin:root@postgres:5432/transaction_db' });

// TRANSFER LOGIC
app.post('/transactions/transfer', async (req, res) => {
    const { fromUserId, toAccountNumber, amount, pin, description } = req.body;
    const trxId = `TRX-${Date.now()}`;

    try {
        // 1. Validasi PIN
        try {
            await axios.post('http://identity-service:3001/auth/validate-pin', { userId: fromUserId, pin });
        } catch (e) {
            return res.status(401).json({ error: "PIN Salah!" });
        }

        // 2. Cek Penerima & Ambil Info Pengirim (untuk keterangan mutasi)
        let toUserId, fromAccountInfo;
        try {
            // Cari ID Penerima
            const respTo = await axios.get(`http://wallet-service:3002/wallets/lookup/${toAccountNumber}`);
            toUserId = respTo.data.user_id;

            // Cari No Rekening Pengirim (Agar penerima tau siapa yang kirim)
            const respFrom = await axios.get(`http://wallet-service:3002/wallets/${fromUserId}`);
            fromAccountInfo = respFrom.data.account_number;

        } catch (e) {
            return res.status(404).json({ error: "Rekening Tujuan Tidak Ditemukan" });
        }

        if (String(fromUserId) === String(toUserId)) return res.status(400).json({error: "Tidak bisa transfer ke diri sendiri"});

        // 3. Update Saldo (Debit Pengirim & Kredit Penerima)
        try {
            await axios.post('http://wallet-service:3002/wallets/update', { userId: fromUserId, amount: -amount });
        } catch (e) {
            return res.status(400).json({ error: "Saldo Tidak Cukup" });
        }
        await axios.post('http://wallet-service:3002/wallets/update', { userId: toUserId, amount: amount });

        // 4. CATAT TRANSAKSI (2 RECORD: OUT & IN)
        // Record PENGIRIM (Uang Keluar)
        await pool.query(
            'INSERT INTO transactions (id, user_id, counterparty_account, amount, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [trxId + '-OUT', fromUserId, toAccountNumber, amount, 'TRANSFER_OUT', 'SUCCESS', `Transfer ke ${toAccountNumber}`]
        );

        // Record PENERIMA (Uang Masuk)
        await pool.query(
            'INSERT INTO transactions (id, user_id, counterparty_account, amount, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [trxId + '-IN', toUserId, fromAccountInfo, amount, 'TRANSFER_IN', 'SUCCESS', `Terima dari ${fromAccountInfo}`]
        );
        
        // 5. KIRIM DATA KE ANALYTICS (2 Log: Pengirim & Penerima)
        const timeNow = new Date().toISOString();
        
        // Log Pengeluaran
        axios.post('http://analytics-service:3005/analytics/ingest', {
            user_id: fromUserId,
            amount: parseInt(amount),
            type: 'TRANSFER_OUT',
            created_at: timeNow
        }).catch(err => {});

        // Log Pemasukan
        axios.post('http://analytics-service:3005/analytics/ingest', {
            user_id: toUserId,
            amount: parseInt(amount),
            type: 'TRANSFER_IN',
            created_at: timeNow
        }).catch(err => {});

        res.json({ status: 'success', transactionId: trxId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'System Error' });
    }
});

// HISTORY
app.get('/transactions/history/:userId', async (req, res) => {
    const result = await pool.query('SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC', [req.params.userId]);
    res.json(result.rows);
});

// Mencatat top up dari payment service
app.post('/transactions/internal/record', async (req, res) => {
    const { userId, amount, type, description } = req.body;
    const trxId = `TRX-${Date.now()}-TOPUP`;

    try {
        await pool.query(
            'INSERT INTO transactions (id, user_id, counterparty_account, amount, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [trxId, userId, 'SYSTEM', amount, type, 'SUCCESS', description]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Gagal catat transaksi internal:", error);
        res.status(500).json({ error: "Database Error" });
    }
});

app.listen(3003, () => console.log('Transaction Service running on 3003'));