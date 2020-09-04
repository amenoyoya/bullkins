const express = require('express')
const RED = require('node-red')
const http = require('http')
const globby = require('globby')
const path = require('path')
const nedb = require('./.node-red/lib/nedb')

const main = async () => {
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
    httpAdminRoot: '/server/red', // Node-RED Editor UI URI
    httpNodeRoot: '/server', // HTTP Node Root URI
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

  /**
   * NeDB REST API: /server/nedb/:collection/*
   */
  // get nedb collections: GET /server/nedb/
  app.get('/server/nedb', async (req, res) => {
    const databases = []
    for (const file of await globby('./nedb/*.db')) {
      databases.push(path.basename(file, path.extname(file)))
    }
    res.json(databases).send()
  })

  // get nedb documents: GET /server/nedb/:collection/?page=X
  app.get('/server/nedb/:collection', async (req, res) => {
    res.json(
      await nedb(req.params.collection).paginate({}, typeof req.query.page === 'number'? req.query.page: 1)
    ).send()
  })

  // create nedb collection: POST /server/nedb/:collection/
  app.post('/server/nedb/:collection', async (req, res) => {
    try {
      res.json({
        result: typeof nedb(req.params.collection) === 'object'
      }).send()
    } catch (err) {
      res.json({
        result: false,
        error: err.toString(),
      }).send()
    }
  })

  // delete nedb collection: DELETE /server/nedb/:collection
  app.delete('/server/nedb/:collection', async (req, res) => {
    try {
      res.json(nedb(req.params.collection, 'delete')).send()
    } catch (err) {
      res.json({
        result: false,
        error: err.toString(),
      }).send()
    }
  })

  /**
   * Server listen
   */
  const port = process.env.SERVER_PORT || 3333
  console.log(`Backend server\nListening on: http://localhost:${port}`)
  server.listen(port)
}

main()

// module.exports = {
//   path: '/server',
//   handle: server,
// }