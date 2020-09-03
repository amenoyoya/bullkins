const express = require('express')
const RED = require('node-red')
const http = require('http')

const app = express()
const server = http.createServer(app)

// ※ Express 4.16 以降、Body-Parser機能は標準搭載されている
// ※ 4.16 未満のバージョンを使っている場合は、別途 body-parser パッケージのインストールが必要
app.use(express.json()); // クライアントデータを JSON 形式で取得可能にする
app.use(express.urlencoded({ extended: true })); // 配列型のフォームデータを取得可能にする

/**
 * Node-RED 設定
 */
const settings = {
  httpAdminRoot: '/red', // Node-RED Editor UI URI
  httpNodeRoot: '/', // HTTP Node Root URI
  userDir: `${__dirname}/.node-red/`, // user setting dir
  nodesDir: `${__dirname}/.node-red/nodes/`, // nodes dir
  functionGlobalContext: {
    socketTimeout: 0
  }
}

RED.init(server, settings)
app.use(settings.httpAdminRoot, RED.httpAdmin)
app.use(settings.httpNodeRoot, RED.httpNode)

// Node-RED ランタイム起動
RED.start()

// サーバ実行
const port = 3333
console.log(`Backend server\nListening on: http://localhost:${port}`)
server.listen(port)
