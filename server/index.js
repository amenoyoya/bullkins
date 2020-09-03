const express = require('express')

const app = express()

// ※ Express 4.16 以降、Body-Parser機能は標準搭載されている
// ※ 4.16 未満のバージョンを使っている場合は、別途 body-parser パッケージのインストールが必要
app.use(express.json()); // クライアントデータを JSON 形式で取得可能にする
app.use(express.urlencoded({ extended: true })); // 配列型のフォームデータを取得可能にする

app.get('/', function(req, res) {
  res.send('Express Server Running')
})

module.exports = {
  // serverMiddleware path: /server/*
  path: '/server/',
  handler: app
}