const nedb = require('nedb-promise')

/**
 * NeDBコレクション作成
 * @param {string} name [a-zA-Z0-9\-_] のみ許可
 * @return {object}
 */
const collection = name => {
  if (!name.match(/[a-z0-9\-_]+/i)) {
    throw new Error('NeDB collection name allowed chars: [a-z][A-Z][1-9]-_')
  }
  const db = new nedb({
    filename: `./nedb/${name}.db`,
    autoload: true,
  })
  // cursor 共通メソッド
  const cursor = (method, condition) => {
    const res = method(condition)
    if ('$sort' in condition && typeof condition['$sort'] === 'object') {
      res = res.sort(condition['$sort'])
    }
    if ('$limit' in condition && typeof condition['$limit'] === 'number') {
      res = res.limit(condition['$limit'])
    }
    if ('$skip' in condition && typeof condition['$skip'] === 'number') {
      res = res.skip(condition['$skip'])
    }
    return res
  }
  return {
    /**
     * findメソッド
     * @param {object} condition
     * @return {object[]} docs
     */
    async find(condition) {
      return await cursor(db.find, condition).exec()
    },

    /**
     * countメソッド
     * @param {object} condition
     * @return {number} count
     */
    async count(condition) {
      return await cursor(db.count, condition).exec()
    },

    /**
     * insertメソッド
     * @param {object|object[]} docs 
     * @return {object|object[]} inserted
     */
    async insert(docs) {
      return await db.insert(docs)
    },

    /**
     * updateメソッド
     * @param {object} condition 
     * @param {object} updateDoc 
     * @return {number} updated
     */
    async update(condition, updateDoc) {
      const dbupdate = query => {
        return db.update(query, updateDoc, {multi: true})
      }
      return await cursor(dbupdate, condition).exec()
    },

    /**
     * removeメソッド
     * @param {object} condition 
     * @return {number} removed
     */
    async remove(condition) {
      const dbremove = query => {
        return db.remove(query, {multi: true})
      }
      return await cursor(dbremove, condition).exec()
    },
  }
}

module.exports = RED => {
  RED.nodes.registerType('nedb', function(config) {
    const node = this
    RED.nodes.createNode(node, config)
    node.on('input', async msg => {
      const db = collection(config.db)
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