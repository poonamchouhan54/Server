const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const TARGET_URL = 'https://winter-mouse-7490.poonamchouhan076.workers.dev/';

app.use('/', createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    onProxyRes: function (proxyRes, req, res) {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
    }
}));

module.exports = app;
