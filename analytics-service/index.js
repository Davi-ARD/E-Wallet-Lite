const express = require('express');
const { BigQuery } = require('@google-cloud/bigquery');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

// --- KONFIGURASI ---
const bigquery = new BigQuery({
  keyFilename: path.join(__dirname, process.env.GCP_KEYFILE),
  projectId: process.env.GCP_PROJECT_ID, 
});
const datasetId = process.env.BQ_DATASET; 
const tableId = 'transactions_log';

// --- ENDPOINT INGEST ---
app.post('/analytics/ingest', async (req, res) => {
    try {
        const { user_id, amount, type, created_at } = req.body;
        
        // Data payload
        const row = {
            user_id: parseInt(user_id), 
            amount: parseInt(amount),
            type, // 'TOPUP', 'TRANSFER_IN', 'TRANSFER_OUT'
            created_at: created_at || new Date().toISOString()
        };

        // BATCH LOAD
        const tempFileName = path.join(__dirname, `temp-${Date.now()}.json`);
        fs.writeFileSync(tempFileName, JSON.stringify(row));

        await bigquery
            .dataset(datasetId)
            .table(tableId)
            .load(tempFileName, {
                sourceFormat: 'NEWLINE_DELIMITED_JSON',
                autodetect: true // BigQuery mendeteksi kolom user_id baru
            });

        fs.unlinkSync(tempFileName);
        res.json({ success: true });

    } catch (error) {
        console.error('[BigQuery Error]', error.message);
        res.json({ success: false });
    }
});

// --- ENDPOINT DASHBOARD (FILTER PER USER) ---
app.get('/analytics/dashboard/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Query FILTER BY USER_ID
        const query = `
            SELECT type, SUM(amount) as total, COUNT(*) as count 
            FROM \`${datasetId}.${tableId}\` 
            WHERE user_id = @userId
            GROUP BY type
        `;
        
        const options = {
            query: query,
            location: 'US',
            params: { userId: parseInt(userId) }
        };

        const [rows] = await bigquery.query(options);
        res.json(rows);
    } catch (error) {
        console.error("Query Error (Mungkin data masih kosong):", error.message);
        res.json([]);
    }
});

// --- ENDPOINT EXPORT CSV (FILTER PER USER) ---
app.get('/analytics/export/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Ambil data spesifik milik user tersebut
        const query = `
            SELECT type, amount, created_at 
            FROM \`${datasetId}.${tableId}\` 
            WHERE user_id = @userId
            ORDER BY created_at DESC
            LIMIT 100
        `;
        
        const options = {
            query: query,
            location: 'US',
            params: { userId: parseInt(userId) }
        };

        const [rows] = await bigquery.query(options);

        // Convert JSON ke format CSV
        const header = "Tipe Transaksi,Jumlah (Rp),Tanggal\n";
        const csv = rows.map(row => {
            // Handle format tanggal BigQuery
            const dateStr = row.created_at && row.created_at.value ? row.created_at.value : new Date().toISOString();
            return `${row.type},${row.amount},${dateStr}`;
        }).join("\n");

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="mutasi_user_${userId}.csv"`);
        res.send(header + csv);

    } catch (e) {
        console.error("Export Error:", e.message);
        res.status(500).send("Gagal mengunduh data.");
    }
});

app.listen(3005, () => console.log('Analytics Service running on 3005'));