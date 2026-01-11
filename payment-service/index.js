const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const paymentStatus = {};

const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3004';

// 1. REQUEST TOPUP (Generate QR Dummy)
app.post('/payments/topup/request', (req, res) => {
    const { userId, amount } = req.body;

    if (parseInt(amount) < 10000) {
        return res.status(400).json({ error: "Minimal Top Up adalah Rp 10.000" });
    }

    const paymentId = `PAY-${Date.now()}`;

    paymentStatus[paymentId] = { status: 'PENDING', userId, amount };
    
    const approvalLink = `${PUBLIC_URL}/payments/topup/approve/${paymentId}`;

    // Return URL QR Code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(approvalLink)}`;

    res.json({ 
        paymentId, 
        qrUrl, 
        message: "Silakan scan QR Code untuk konfirmasi" 
    });
});

app.get('/payments/status/:paymentId', (req, res) => {
    const status = paymentStatus[req.params.paymentId];
    res.json({ status: status ? status.status : 'UNKNOWN' });
});

// 2. APPROVAL PAGE
app.get('/payments/topup/approve/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    const data = paymentStatus[paymentId];

    if (!data || data.status !== 'PENDING') {
        return res.send("<h1 style='text-align:center'>Transaksi kadaluarsa / sudah selesai.</h1>");
    }

    try {
        // Proses ke Wallet Service
        await axios.post('http://wallet-service:3002/wallets/update', { 
            userId: data.userId, 
            amount: parseInt(data.amount) 
        });

        //Log ke Transaction Service
        await axios.post('http://transaction-service:3003/transactions/internal/record', {
            userId: data.userId,
            amount: parseInt(data.amount),
            type: 'TOPUP',
            description: 'Top Up via QR Payment'
        }).catch(e => console.error("Gagal lapor history:", e.message));
        
        // Log ke Analytics
        axios.post('http://analytics-service:3005/analytics/ingest', {
            user_id: data.userId,
            amount: parseInt(data.amount),
            type: 'TOPUP',
            created_at: new Date().toISOString()
        }).catch(e => console.log("Analytics Log Error"));

        // Update status jadi SUCCESS
        paymentStatus[paymentId].status = 'SUCCESS';

        // Tampilan di HP
        res.send(`
            <div style="text-align:center; padding: 40px; font-family: sans-serif;">
                <div style="font-size: 50px;">✅</div>
                <h2 style="color: green;">Pembayaran Berhasil!</h2>
                <p>Anda menyetujui Top Up <b>Rp ${parseInt(data.amount).toLocaleString()}</b></p>
                <p style="color: grey;">Silakan kembali ke Laptop Anda.</p>
            </div>
        `);

    } catch (e) {
        console.error(e);
        res.send("<h1 style='color:red; text-align:center'>Gagal memproses pembayaran backend.</h1>");
    }
});

app.listen(3004, () => console.log(`Payment Service running on 3004. Public URL: ${PUBLIC_URL}`));