const express = require('express');
const cookieParser = require('cookie-parser');
const proxy = require('express-http-proxy');
const app = express();

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

// API base URI
const basepath = ''; // '/server'

/**
 * NeDB REST API: /server/nedb/*
 */
app.use(`${basepath}/nedb`, require('./api_nedb'));

/**
 * Shell Command Job Queueing API: /server/shell/*
 */
app.use(`${basepath}/shell`, require('./api_shell'));

/**
 * Redis Commander Admin Panel: /server/admin/redis/*
 */
if (process.env.REDIS_COMMANDER_URL) {
  app.use(`${basepath}/admin/redis`, proxy(process.env.REDIS_COMMANDER_URL));
}

/**
 * Utility REST API: /server/util/*
 */
app.use(`${basepath}/util`, require('./api_util'));

/**
 * Nuxt system REST API: /server/nuxt/*
 */
app.use(`${basepath}/nuxt`, require('./api_nuxt'));

module.exports = {
  path: '/server',
  handle: app,
};

// listen: http://localhost:3333/server/
// const port = process.env.SERVER_PORT || 3333
// console.log(`Backend server\nListen on: http://localhost:${port}/server/`)
// app.listen(port)
