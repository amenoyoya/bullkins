const {MongoClient} = require('mongodb');
const omit = require('./omit');

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
    return await this.handler.find(query).toArray();
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
      // query の内、$で始まるキーを削除したものは挿入オブジェクトとする
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
  const client = new MongoClient(url, { useUnifiedTopology: true });
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