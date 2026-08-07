const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const TARGET_URL = 'https://winter-mouse-7490.poonamchouhan076.workers.dev/';

app.use('/', createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    ws: true,
    onProxyRes: function (proxyRes, req, res) {
        // Frame restrictions aur security headers ko remove karna taaki content block na ho
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
    }
}));

// Local testing ke liye (Vercel par automatic chalega)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Local server running on port ${PORT}`);
    });
}

module.exports = app;
