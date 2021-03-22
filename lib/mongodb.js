const {MongoClient} = require('mongodb');
const omit = require('./omit');

/**
 * @private
 * findクエリ修正メソッド（$regex オペレータの値に文字列が指定されている場合は RegExp に変換）
 * @param {object} query
 * @return {object}
 */
const fix_query = (query) => {
  const data = Object.assign({}, query);
  for (const key of Object.keys(data)) {
    if (Object.prototype.toString.call(data[key]) === '[object Object]') {
      data[key] = fix_query(data[key]);
    } else {
      if (key === '$regex' && typeof data[key] === 'string') {
        data[key] = new RegExp(data[key]);
      }
    }
  }
  return data;
}

/**
 * @private
 * cursor 共通メソッド
 * $sort, $limit, $skip operator => cursor.sort(), cursor.limit(), cursor.skip()
 * @param {mongodb.Cursor} cursor 
 * @param {object} condition 
 * @return {mongodb.Cursor}
 */
const sort_limit_skip = (cursor, condition) => {
  if (typeof condition === 'object' && typeof condition['$sort'] === 'object') {
    cursor = cursor.sort(condition['$sort']);
  }
  if (typeof condition === 'object' && typeof condition['$limit'] === 'number') {
    cursor = cursor.limit(condition['$limit']);
  }
  if (typeof condition === 'object' && typeof condition['$skip'] === 'number') {
    cursor = cursor.skip(condition['$skip']);
  }
  return cursor;
}

/**
 * MongoDB Collection
 */
class MongoCollection {
  constructor(handler) {
    this.handler = handler;
  }

  /**
   * データ取得
   * @param {object} query 
   * @return {object[]}
   */
  async find(query = {}) {
    // $sort, $limit, $skip キーを除く検索条件
    const all_query = fix_query(query);
    const condition = omit(all_query, ['$sort', '$limit', '$skip'])
    return await sort_limit_skip(this.handler.find(condition), all_query).toArray();
  }

  /**
   * データ挿入
   * @param {object|object[]} data 
   * @return {*}
   */
  async insert(data) {
    return Array.isArray(data)?
      await this.handler.insertMany(data):
      await this.handler.insertOne(data);
  }

  /**
   * データ更新
   * @param {object} query 更新対象データ絞り込み条件
   * @param {object} data
   * @return {*}
   */
  async update(query, data) {
    return await this.handler.updateMany(query, data);
  }

  /**
   * データ更新 or 挿入
   * @param {object} query 更新対象データ絞り込み条件
   * @param {object} data
   * @return {*}
   */
  async upsert(query, data) {
    if ((await this.find(query)).length === 0) {
      // query の内、$で始まるキーを削除したものを挿入オブジェクトとする
      let insert = omit(query, [], (val, key, obj) => key.match(/^\$/)? false: true);
      // data の内、$set データは通常挿入に変更する
      insert = {...insert, ...omit(data, ['$set'])};
      if (typeof data.$set === 'object') {
        insert = {...insert, ...data.$set};
      }
      return await this.insert(insert);
    }
    return await this.update(query, data);
  }

  /**
   * データ削除 
   * @param {object} query 削除対象データ絞り込み条件 
   * @return {*}
   */
  async delete(query) {
    return await this.handler.deleteMany(query);
  }
}

/**
 * MongoDB接続
 * @param {string} url mongodb://{user}:{pass}@{host}:{port}
 * @return {object} {
 *    db(database_name: string) => object: MongoDB内のデータベースオブジェクトを取得
 *    dblist() => {databases: {name: string, sizeOnDisk: number, empty: boolean}[], totalSize: number} データベース一覧取得
 *    close() => null: MongoDB接続を閉じる
 * }
 */
async function connectMongoDB(url) {
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  return {
    /**
     * データベースオブジェクト取得
     * @param {string} database_name 
     * @return {object} {
     *    collection(collection_name: string) => MongoCollection: データベース内のコレクション（テーブル）オブジェクトを取得
     *    collections() => {name: string, type: string, ...}[]: データベース内のコレクション（テーブル）一覧を取得
     * }
     */
    db(database_name) {
      const database = client.db(database_name);
      return {
        handler: database,

        /**
         * コレクション（テーブル）オブジェクト取得
         * @param {string} collection_name 
         * @return {MongoCollection}
         */
        collection(collection_name) {
          return new MongoCollection(database.collection(collection_name));
        },

        /**
         * コレクション（テーブル）一覧取得
         * @return {object[]} {name: string, type: string, ...}[]
         */
         async collections() {
          return await database.listCollections().toArray();
        },
      };
    },

    /**
     * データベース一覧取得
     * @return {object} {databases: {name: string, sizeOnDisk: number, empty: boolean}[], totalSize: number}
     */
    async dblist() {
      return await client.db().admin().listDatabases();
    },

    /**
     * MongoDB接続クローズ
     */
    close() {
      return client.close();
    },
  };
}

module.exports = {
  connectMongoDB,
};