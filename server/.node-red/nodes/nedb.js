const nedb = require('../lib/nedb.js')

module.exports = RED => {
  RED.nodes.registerType('nedb', function(config) {
    const node = this
    RED.nodes.createNode(node, config)
    node.on('input', async msg => {
      const db = nedb(config.db)
      switch (config.method) {
        case 'insert':
          msg.payload = await db.insert(msg.docs)
          break
        case 'update':
          msg.payload = await db.update(msg.query, msg.docs)
          break
        case 'remove':
          msg.payload = await db.insert(msg.query)
          break
        case 'count':
          msg.payload = await db.count(msg.query)
          break
        default:
          msg.payload = await db.find(msg.query)
          break
      }
      node.send(msg)
    })
  })
}