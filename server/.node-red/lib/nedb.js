const nedb = require('nedb-promise')
const fs = require('fs')

/**
 * ファイル存在判定
 * @param {string} filename 
 * @return {boolean}
 */
const isFile = filename => {
  try {
    return fs.statSync(filename).isFile()
  } catch {
    return false
  }
}

/**
 * NeDBコレクション作成
 * @param {string} name [a-zA-Z0-9\-_] のみ許可
 * @param {string} mode 'delete' ならコレクション削除
 * @return {object}
 */
module.exports = (name, mode = 'open') => {
  if (!name.match(/[a-z0-9\-_]+/i)) {
    throw new Error('NeDB collection name allowed chars: [a-z][A-Z][1-9]-_')
  }
  // コレクション削除
  if (mode === 'delete') {
    if (isFile(`./nedb/${name}.db`)) {
      fs.unlinkSync(`./nedb/${name}.db`)
      return {
        result: true
      }
    }
    return {
      result: false
    }
  }
  // コレクション作成
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
     * paginateメソッド
     * @param {object} condition 
     * @param {number} page = 1
     * @param {number} perPage = 50
     * @return {object{count, data, page, prev, next, last}}
     */
    async paginate(condition, page = 1, perPage = 50) {
      page = page < 1? 1: page
      
      const count = await db.count(condition).exec()
      const last = Math.ceil(count / perPage)
      
      page = page > last? last: page
      
      const find = db.find(condition).limit(perPage).skip((page - 1) * perPage)
      if ('$sort' in condition && typeof condition['$sort'] === 'object') {
        find = find.sort(condition['$sort'])
      }
      const data = await find.exec()
      return {
        page,
        count,
        data,
        last,
        prev: page > 1? page - 1: false,
        next: page < last? page + 1: false,
      }
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
