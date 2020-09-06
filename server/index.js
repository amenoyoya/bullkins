const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()

// ※ Express 4.16 以降、Body-Parser機能は標準搭載されている
// ※ 4.16 未満のバージョンを使っている場合は、別途 body-parser パッケージのインストールが必要
app.use(express.json()); // クライアントデータを JSON 形式で取得可能にする
app.use(express.urlencoded({ extended: true })); // 配列型のフォームデータを取得可能にする

// ※ Express 4.X 以降 cookie-parser は標準搭載されていないため、別途インストール
app.use(cookieParser())

/**
 * NeDB REST API: /server/nedb/*
 */
app.use('/nedb', require('./api_nedb'))

/**
 * Utility REST API: /server/util/*
 */
app.use('/util', require('./api_util'))

/**
 * Nuxt system REST API: /server/nuxt/*
 */
app.use('/nuxt', require('./api_nuxt'))

module.exports = {
  path: '/server',
  handle: app,
}
