const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();

app.use(cors());

// Log setiap request yang masuk
app.use((req, res, next) => {
    console.log(`[GATEWAY] Request masuk: ${req.method} ${req.url}`);
    next();
});

const services = [
    { route: '/auth', target: 'http://identity-service:3001' }, 
    { route: '/users', target: 'http://identity-service:3001' },
    { route: '/wallets', target: 'http://wallet-service:3002' },
    { route: '/transactions', target: 'http://transaction-service:3003' },
    { route: '/payments', target: 'http://payment-service:3004' },
    { route: '/analytics', target: 'http://analytics-service:3005' },
];

services.forEach(({ route, target }) => {
    app.use(route, createProxyMiddleware({
        target,
        changeOrigin: true,
        // Menambahkan path
        pathRewrite: (path, req) => {
            return route + path; 
        },
        onError: (err, req, res) => {
            console.error(`[PROXY ERROR] Gagal ke ${target}`);
            res.status(500).json({ error: `Gateway Error: ${err.message}` });
        }
    }));
});

app.listen(3000, () => {
    console.log('API Gateway running on port 3000 (Final Fix)');
});