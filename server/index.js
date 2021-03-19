const express = require('express');
const app = express();

const http = require('http').Server(app);

const cookieParser = require('cookie-parser');

/**
 * process.env form .env
 */
require('dotenv').config({path: `${__dirname}/../.env`});

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
 * Job Queueing (Bullkins) API: /api/bullkins/*
 */
 app.use('/api/bullkins', require('./api_bullkins'));

// listen: http://localhost:8000/
const port = 8000;
const server = http.listen(port, () => {
  console.log(`Backend server\nListening on: http://localhost:${port}/`);
});