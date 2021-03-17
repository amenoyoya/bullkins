const express = require('express');
const app = express();

const http = require('http').Server(app);
const proxy = require('http-proxy');

const cookieParser = require('cookie-parser');

/**
 * process.env form .env
 */
require('dotenv').config({path: `${__dirname}/.env`});

// ※ Express 4.16 以降、Body-Parser機能は標準搭載されている
// ※ 4.16 未満のバージョンを使っている場合は、別途 body-parser パッケージのインストールが必要
/**
 * クライアントデータを JSON 形式で取得可能にする
 * limit: POSTデータの上限サイズを設定
 */
app.use(express.json({ limit: '50mb' }));

/**
 * limit: POSTデータの上限サイズを設定
 * extended: 配列型のフォームデータを取得可能にする
 */
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ※ Express 4.X 以降 cookie-parser は標準搭載されていないため、別途インストール
app.use(cookieParser());

/**
 * Shell Command Job Queueing API: /api/shell/*
 */
app.use('/api/shell', require('./api_shell'));

/**
 * Playwright (Browserless Scraping) API: /api/playwright/*
 */
app.use('/api/playwright', require('./api_playwright'));

/**
 * Redis Commander Admin Panel: /admin/redis/*
 */
if (process.env.REDIS_COMMANDER_URL) {
  const redis_commander_proxy = proxy.createProxyServer({
    target: process.env.REDIS_COMMANDER_URL
  });
  app.use('/admin/redis', (req, res) => {
    redis_commander_proxy.web(req, res);
  });
}

/**
 * MongoDB Express Admin Panel: /admin/mongodb/*
 */
if (process.env.MONGODB_EXPRESS_URL) {
  const mongodb_express_proxy = proxy.createProxyServer({
    target: process.env.MONGODB_EXPRESS_URL
  });
  app.use('/admin/mongodb', (req, res) => {
    mongodb_express_proxy.web(req, res);
  });
}

// listen: http://localhost:8000/
const port = 8000;
const server = http.listen(port, () => {
  console.log(`Backend server\nListening on: http://localhost:${port}/`);
});