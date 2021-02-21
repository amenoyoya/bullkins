const nedb = require('nedb-promises')
const omit = require('./omit')
const fs = require('fs')
const path = require('path')

const databases = {}

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
 * @param {string} name [a-zA-Z0-9\-_#$@] のみ許可
 * @param {string} mode 'delete' ならコレクション削除
 * @param {string} dir = './nedb'
 * @return {object}
 */
module.exports = (name, mode = 'open', dir = './nedb') => {
  if (!name.match(/[a-z0-9\-_#$@]+/i)) {
    throw new Error('NeDB collection name allowed chars: [a-z][A-Z][1-9]-_')
  }
  const filename = path.join(dir, `${name}.db`)
  // コレクション削除
  if (mode === 'delete') {
    if (isFile(filename)) {
      fs.unlinkSync(filename)
      return {
        result: true
      }
    }
    return {
      result: false
    }
  }
  // コレクション作成
  const db = databases[filename] || new nedb({filename, autoload: true})
  databases[filename] = db
  // query 修正メソッド
  const fix_query = (query) => {
    const data = Object.assign({}, query)
    for (const key of Object.keys(data)) {
      if (Object.prototype.toString.call(data[key]) === '[object Object]') {
        data[key] = fix_query(data[key])
      } else {
        if (key === '$regex' && typeof data[key] === 'string') {
          data[key] = new RegExp(data[key]);
        }
      }
    }
    return data
  }
  // cursor 共通メソッド: sort, limit, skip
  const sort_limit_skip = (cursor, condition) => {
    if (typeof condition === 'object' && typeof condition['$sort'] === 'object') {
      cursor = cursor.sort(condition['$sort'])
    }
    if (typeof condition === 'object' && typeof condition['$limit'] === 'number') {
      cursor = cursor.limit(condition['$limit'])
    }
    if (typeof condition === 'object' && typeof condition['$skip'] === 'number') {
      cursor = cursor.skip(condition['$skip'])
    }
    return cursor
  }
  return {
    /**
     * findメソッド
     * @param {[search_key]: object, $sort: object, $limit: number, $skip: number} condition
     *    @see https://github.com/louischatriot/nedb#finding-documents
     * @return {object[]} docs
     */
    async find(condition) {
      // $sort, $limit, $skip キーを除く検索条件
      const cond = fix_query(condition)
      const query = omit(cond, ['$sort', '$limit', '$skip'])
      return await sort_limit_skip(db.find(query), cond).exec()
    },

    /**
     * countメソッド
     * @param {object} condition
     * @return {number} count
     */
    async count(condition) {
      // $sort, $limit, $skip キーを除く検索条件
      const cond = fix_query(condition)
      const query = omit(cond, ['$sort', '$limit', '$skip'])
      return await sort_limit_skip(db.count(query), cond).exec()
    },

    /**
     * paginateメソッド
     * @param {object} condition 
     * @param {number} page = 1
     * @param {number} perPage = 50
     * @return {count, data, start, end, page, prev, next, last}
     */
    async paginate(condition, page = 1, perPage = 50) {
      const cond = fix_query(condition)
      page = page < 1? 1: page
      
      // $sort, $limit, $skip, $page, $per キーを除く検索条件
      const query = omit(cond, ['$sort', '$limit', '$skip', '$page', '$per'])
      const count = await db.count(query).exec()
      const last = Math.ceil(count / perPage)
      
      page = page > last? last: page
      
      const start = count > 0? (page - 1) * perPage: 0
      let find = db.find(query).limit(perPage).skip(start)
      if (typeof cond['$sort'] === 'object') {
        find = find.sort(cond['$sort'])
      }
      const data = await find.exec()
      return {
        page,
        count,
        data,
        start: count > 0? start + 1: 0,
        end: start + data.length,
        last,
        prev: page > 1? page - 1: false,
        next: page < last? page + 1: false,
      }
    },

    /**
     * insertメソッド
     * @param {object|object[]} docs
     * @param {boolean} useNumberId = true: trueなら _id に数値IDを使う（falseならランダム文字列）
     * @return {object|object[]} inserted
     */
    async insert(docs, useNumberId = true) {
      if (useNumberId) {
        const maxIdData = await sort_limit_skip(db.find(), {'$sort': {_id: -1}, '$limit': 1}).exec()
        const maxId = maxIdData.length > 0? maxIdData[0]._id: 0
        if (Array.isArray(docs)) {
          let i = 0;
          docs = docs.reduce((accumulator, e) => {
            if (e && typeof e === 'object' && Object.keys(e).length > 0) {
              accumulator.push({...e, _id: maxId + (++i)});
            }
            return accumulator;
          }, []);
        } else {
          docs._id = maxId + 1
        }
      }
      return await db.insert(docs)
    },

    /**
     * updateメソッド
     * @param {object} condition 
     * @param {object} updateDoc 指定カラムのみ更新したい場合は {$set: {column: value}}
     * @return {number} updated
     */
    async update(condition, updateDoc) {
      const cond = fix_query(condition)
      return await db.update(cond, updateDoc, {multi: true})
    },

    /**
     * removeメソッド
     * @param {object} condition 
     * @return {number} removed
     */
    async remove(condition) {
      const cond = fix_query(condition)
      return await db.remove(cond, {multi: true})
    },

    /**
     * ファイル書き込みフラッシュ
     */
    flash() {
      new nedb({filename, autoload: true});
    },
  }
}
