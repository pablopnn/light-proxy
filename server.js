const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const selfsigned = require('selfsigned');

const destinationURL = process.argv[2];
const clientHostname = process.argv[3];

const pems = selfsigned.generate(null, { days: 365 });

const proxy = httpProxy.createProxyServer({
    secure: false,
    changeOrigin: true,
});

proxy.on('proxyRes', function (proxyRes, req, res) {
    if (req.headers.origin) {
        proxyRes.headers['access-control-allow-origin'] = req.headers.origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
        const setCookieHeader = proxyRes.headers['set-cookie'];
        if (setCookieHeader) {
            const cookies = Array.isArray(setCookieHeader)
                ? setCookieHeader
                : [setCookieHeader];
            const rewrittenCookies = cookies.map((cookie) =>
                cookie.replace(
                    /domain=[^;]*;?/,
                    `domain=${clientHostname || 'localhost'}; SameSite=None; Secure`
                )
            );
            proxyRes.headers['set-cookie'] = rewrittenCookies;
        }
    }
});

const server = http.createServer((req, res) => {
    if (req.headers.origin) {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
            res.setHeader(
                'Access-Control-Allow-Methods',
                'GET, POST, PUT, DELETE, OPTIONS'
            );
            res.setHeader(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization'
            );
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.writeHead(200);
            res.end();
            return;
        }
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    proxy.web(req, res, { target: destinationURL }, (e) => {
        console.error('Proxy request error:', e);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    });
});

const port = 3000;

https.createServer({
    key: pems.private,
    cert: pems.cert
}, (req, res) => {
    server.emit('request', req, res);
}).listen(port, () => {
    console.log(`Proxy server is running on port ${port}`);
});
