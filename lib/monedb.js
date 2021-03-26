/**
 * MongoDB + NeDB wrapper client
 */
const {MongoClient} = require('mongodb');
const NeDB = require('nedb-promises');
const fs = require('fs');
const path = require('path');
const omit = require('./omit');

/**
 * Check directory exists
 * @param {string} dirname 
 * @return {boolean}
 */
function isDirectory(dirname) {
  try {
    return fs.statSync(dirname).isDirectory();
  } catch {
    return false;
  }
}

/**
 * MongoDB + NeDB wrapper Client
 */
class Client {
  /**
   * @param {string} url
   *   - MongoDB: 'mongodb://{user}:{password}@{host}:{port}'
   *   - NeDB: './' etc (FilePath: '{url}/{database}.db/{collection}.table')
   * @param {string} id_format = 'number'; Format of data._id
   *   - 'number': Format of _id like RDB such as MySQL (1, 2, 3, ...)
   *   - 'string': Default _id format of MongoDB and NeDB ('4W3JKyAaJNXGzo8b', ...)
   */
  constructor(url, id_format = 'number') {
    this.__format = id_format;

    if (url.match(/^mongodb:/)) {
      // MongoDB Client
      this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

      /**
       * Get a list of databases
       * @return {object[]} {name: string, sizeOnDisk: number, empty: boolean}[]
       */
      this.client.databases = async () => (await this.client.db().admin().listDatabases()).databases;
    } else {
      // NeDB Client: provide API like MongoDB Client
      const collections = {};
      this.client = {
        /**
         * Dummy method for MongoClient.connect()
         */
        connect: async () => {
          return true;
        },

        /**
         * Close NeDB Client
         */
        close: () => {
          Object.keys(collections).forEach(key => delete collections[key]);
        },

        /**
         * Get a list of databases
         * @return {object[]} {name: string}[]
         */
        databases: async () => {
          try {
            const dirents = fs.readdirSync(url, {withFileTypes: true});
            return dirents.reduce((result, dirent) => {
              if (dirent.isDirectory() && dirent.name.match(/\.db$/)) {
                result.push({name: dirent.name.replace(/\.db$/, '')});
              }
              return result;
            }, []);
          } catch (err) {
            return [];
          }
        },
        
        /**
         * Get database instance
         * @param {string} database 
         * @return {object} {__type: 'nedb', database_path: string, collections: {*}}
         */
        db: (database) => {
          if (!database.match(/[a-z0-9\-_#$@]+/i)) {
            throw new Error('NeDB database name allowed chars: [a-z][A-Z][1-9]-_')
          }
          // NeDB database structure: ${url}/${database}.db/${collection}.table
          const dir = path.join(url, `${database}.db`);
          if (!isDirectory(dir)) {
            fs.mkdirSync(dir, {recursive: true});
          }
          return {
            __type: 'nedb',
            database_path: dir,
            collections,
          };
        },
      };
    }
  }

  /**
   * Connect to the MongoDB
   * @return {*}
   */
  async connect() {
    return await this.client.connect();
  }

  /**
   * Get a database instance
   * @param {string} database_name
   * @return {Database}
   */
  db(database_name) {
    const database = this.client.db(database_name);
    database.__format = this.__format; // keep id format
    return new Database(database);
  }

  /**
   * Get a list of databases
   * @return {object[]} {name: string, ...}[]
   */
   async databases() {
    return await this.client.databases();
  }

  /**
   * Close connection
   */
  close() {
    this.client.close();
  }
}

/**
 * MongoDB + NeDB wrapper Database
 */
class Database {
  /**
   * @param {mongodb.Db} dbHandler
   */
  constructor(dbHandler) {
    this.db = dbHandler;
  }

  /**
   * Get a collection (table) object
   * @param {string} collection_name 
   * @return {Collection}
   */
  collection(collection_name) {
    if (this.db.__type === 'nedb') {
      // NeDB
      if (!collection_name.match(/[a-z0-9\-_#$@]+/i)) {
        throw new Error('NeDB collection name allowed chars: [a-z][A-Z][1-9]-_')
      }
      const filename = path.join(this.db.database_path, `${collection_name}.table`);
      if (!this.db.collections[collection_name]) {
        const nedb = new NeDB({filename, autoload: true});
        nedb.__type = 'nedb';
        nedb.__format = this.db.__format;
        this.db.collections[collection_name] = nedb;
      }
      return new Collection(this.db.collections[collection_name]);
    }
    // MongoDB
    const collection = this.db.collection(collection_name);
    collection.__format = this.db.__format;
    return new Collection(collection);
  }

  /**
   * Get a list of collections (tables)
   * @return {object[]} {name: string, type: string, ...}[]
   */
  async collections() {
    if (this.db.__type === 'nedb') {
      // NeDB
      const dirents = fs.readdirSync(this.db.database_path, {withFileTypes: true});
      return dirents.reduce((result, dirent) => {
        if (dirent.isFile() && dirent.name.match(/\.table$/)) {
          result.push({name: dirent.name.replace(/\.table$/, ''), type: 'nedb'});
        }
        return result;
      }, []);
    }
    // MongoDB
    return await this.db.listCollections().toArray();
  }
}

/**
 * MongoDB + NeDB wrapper Collection
 */
class Collection {
  /**
   * @param {mongodb.Collection} handler
   */
  constructor(handler) {
    this.handler = handler;
  }

  /**
   * Get count of data
   * @param {object} filter {_id: string|number, ...}
   * @return {number}
   */
  async count(filter = {}) {
    return this.handler.__type === 'nedb'? await this.handler.count(filter): await this.handler.find(filter).count();
  }

  /**
   * Search for resources
   * @param {object} params {pagination: {page: int, perPage: int}, sort: {field: string, order: 'ASC'|'DESC'}, filter: {*}}
   * @param {object} paginator set if you want to get pagination info; => return {page: number, count: number, skip: number, perPage: number, lastPage: number}
   * @return {object[]}
   */
  async find(params, paginator = {}) {
    const cursor = this.handler.find(params.filter || {});
    if (params.sort && params.sort.field) {
      cursor.sort({[params.sort.field]: params.sort.order === 'DESC'? -1: 1});
    }
    if (params.pagination) {
      const page = typeof(params.pagination.page) === 'number'? (params.pagination.page < 1? 1: params.pagination.page): 1;
      const perPage = params.pagination.perPage || 50;
      const count = await this.count(params.filter || {});
      const skip = count > 0? (page - 1) * perPage: 0;
      
      cursor.limit(perPage).skip(skip);
      // set pagination info
      if (typeof(paginator) === 'object') {
        paginator.page = page;
        paginator.count = count;
        paginator.skip = skip;
        paginator.perPage = perPage;
        paginator.lastPage = Math.ceil(count / perPage);
      } else {
        // set count info
        if (typeof(paginator) === 'object') {
          paginator.page = 1;
          paginator.count = await this.count(params.filter || {});
          paginator.skip = 0;
          paginator.perPage = paginator.count;
          paginator.lastPage = 1;
        }
      }
    }
    return this.handler.__type === 'nedb'? await cursor: await cursor.toArray();
  }

  /**
   * Insert data
   * @param {object|object[]} data 
   * @return {object[]} inserted data
   */
  async insert(data) {
    let docs = data;
    // if the id format is 'number', increment _id
    if (this.handler.__format === 'number') {
      const maxIdData = await this.find({sort: {field: '_id', order: 'DESC'}, pagination: {page: 1, perPage:  1}});
      const maxId = maxIdData.length > 0? maxIdData[0]._id: 0
      if (Array.isArray(data)) {
        let i = 0;
        docs = docs.reduce((accumulator, e) => {
          if (e && typeof e === 'object' && Object.keys(e).length > 0) {
            accumulator.push({...e, _id: maxId + (++i)});
          }
          return accumulator;
        }, []);
      } else {
        docs = {...docs, _id: maxId + 1};
      }
    }
    // nedb
    if (this.handler.__type === 'nedb') {
      return Array.isArray(docs)? await this.handler.insert(docs): await this.handler.insert([docs]);
    }
    // mongodb
    return Array.isArray(docs)? (await this.handler.insertMany(docs)).ops: (await this.handler.insertOne(docs)).ops;
  }

  /**
   * Update data
   * @param {object} filter target data filter
   * @param {object} data update data: {$set: {*}}
   * @return {number} updated count
   */
  async update(filter, data) {
    return this.handler.__type === 'nedb'?
      await this.handler.update(filter, data, {multi: true})
      : (await this.handler.updateMany(filter, data)).result.nModified;
  }

  /**
   * Update or Insert data
   * @param {object} filter target data filter
   * @param {object} data update data: {$set: {*}}
   * @return {object[]|number} inserted data | updated count
   */
  async upsert(filter, data) {
    if ((await this.find({filter})).length === 0) {
      // insert: [{$set: {*}} => {*}] + filter
      let insert = {...filter, ...omit(data, ['$set'])};
      if (typeof data.$set === 'object') {
        insert = {...insert, ...data.$set};
      }
      return await this.insert(insert);
    }
    return await this.update(filter, data);
  }

  /**
   * Delete data 
   * @param {object} filter target data filter
   * @return {*}
   */
  async delete(filter) {
    return this.handler.__type === 'nedb'?
      await this.handler.remove(filter, {multi: true})
      : (await this.handler.deleteMany(filter)).result.n;
  }
}

module.exports = Client;