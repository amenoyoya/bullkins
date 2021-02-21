const express = require('express');
const router = express.Router();
const globby = require('globby');
const path = require('path');
const nedb = require('./lib/nedb');
const rison = require('rison');

/**
 * get all nedb collections
 * @get /
 * @return {result: string[]|boolean, error: string}
 */
router.get('/', async (req, res) => {
  try {
    const collections = []
    for (const file of await globby(`${__dirname}/nedb/*.db`)) {
      collections.push(path.basename(file, path.extname(file)))
    }
    return res.json({result: collections})
  } catch(err) {
    return res.json({result: false, error: err.toString()})
  }
});

/**
 * create nedb collection
 * @post /?collection={collection}
 * @param {string} query.collection
 * @return {result: boolean, error: string}
 */
router.post('/', async (req, res) => {
  if (!req.query.collection) {
    return res.json({
      result: false,
      error: 'query parameter "collection" required',
    });
  }
  try {
    return res.json({
      result: typeof nedb(req.query.collection, 'open', `${__dirname}/nedb`) === 'object'
    });
  } catch (err) {
    return res.json({
      result: false,
      error: err.toString(),
    });
  }
});

/**
 * delete nedb collection
 * @delete /?collection={collection}
 * @param {string} query.collection
 * @return {result: number|boolean, error: string}
 */
router.delete('/', async (req, res) => {
  if (!req.query.collection) {
    return res.json({
      result: false,
      error: 'query parameter "collection" required',
    });
  }
  try {
    return res.json(nedb(req.query.collection, 'delete', `${__dirname}/nedb`));
  } catch (err) {
    return res.json({
      result: false,
      error: err.toString(),
    });
  }
});

/**
 * get nedb documents
 * @get /:collection/?query={rison_format_data}|pager={rison_format_data}
 * @param {[search_key]: object, $sort: object, $limit: number, $skip: number} query.query: object[] を取得
 *    @see https://github.com/louischatriot/nedb#finding-documents
 * @param {[search_key]: object, $sort: object, $page: number, $per: number} query.pager: Pager を取得
 * @return {error: string, result: object[] | Pager {
 *    page: number,
 *    prev: number,
 *    next: number,
 *    last: number,
 *    first: number,
 *    end: number,
 *    count: number,
 *    data: [{*}]
 * }}
 */
router.get('/:collection', async (req, res) => {
  if (req.query.query) {
    // 通常検索
    try {
      const query = rison.decode(req.query.query);
      return res.json({
        result: await nedb(req.params.collection, 'open', `${__dirname}/nedb`).find(query)
      });
    } catch(err) {
      return res.json({result: false, error: err.toString()});
    }
  }
  if (req.query.pager) {
    // ページャ取得
    try {
      const query = rison.decode(req.query.pager);
      return res.json({
        result: await nedb(req.params.collection, 'open', `${__dirname}/nedb`).paginate(query, query['$page'] || 1, query['$per'] || 50)
      });
    } catch(err) {
      return res.json({result: false, error: err.toString()});
    }
  }
  // 通常検索(limit: 50件)
  try {
    return res.json({
      result: await nedb(req.params.collection, 'open', `${__dirname}/nedb`).find({$limit: 50})
    });
  } catch(err) {
    return res.json({result: false, error: err.toString()});
  }
});

/**
 * insert nedb documents
 * @post /:collection/
 * @param {object|object[]} payload
 * @return {result: object|number|boolean, error: string}
 */
router.post('/:collection/', async (req, res) => {
  try {
    return res.json({
      result: await nedb(req.params.collection, 'open', `${__dirname}/nedb`).insert(req.body)
    });
  } catch(err) {
    return res.json({result: false, error: err.toString()});
  }
});

/**
 * update nedb documents
 * @put /:collection/?query={rison_format_data}
 * @param {[search_key]: object} query.query 更新したいデータ条件
 * @param {object} payload 指定keyのみ更新したい場合は {$set: {object}}
 * @return {result: number|boolean, error: string}
 */
router.put('/:collection/', async (req, res) => {
  let query = {};
  if (req.query.query) {
    try {
      query = rison.decode(req.query.query);
    } catch(err) {
      return res.json({result: false, error: err.toString()});
    }
  }
  try {
    return res.json({
      result: await nedb(req.params.collection, 'open', `${__dirname}/nedb`).update(query, req.body)
    });
  } catch(err) {
    return res.json({result: false, error: err.toString()});
  }
});

/**
 * delete nedb documents
 * @delete /:collection/?query={rison_format_data}
 * @param {[search_key]: object} query.query 削除したいデータ条件
 * @return {result: number|boolean, error: string}
 */
router.delete('/:collection', async (req, res) => {
  let query = {};
  if (req.query.query) {
    try {
      query = rison.decode(req.query.query);
    } catch(err) {
      return res.json({result: false, error: err.toString()});
    }
  }
  try {
    return res.json({
      result: await nedb(req.params.collection, 'open', `${__dirname}/nedb`).remove(query)
    });
  } catch(err) {
    return res.json({result: false, error: err.toString()});
  }
});

// export
module.exports = router;
