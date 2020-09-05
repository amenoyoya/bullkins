const express = require('express')
const router = express.Router()
const globby = require('globby')
const path = require('path')
const nedb = require('./lib/nedb')

/**
 * get nedb collections
 * @get /
 * @return {string[]} collections
 */
router.get('/', async (req, res) => {
  const collections = []
  for (const file of await globby('./nedb/*.db')) {
    collections.push(path.basename(file, path.extname(file)))
  }
  res.json(collections).send()
})

/**
 * create nedb collection
 * @post /:collection
 * @return {object {result: boolean, error: string}}
 */
router.post('/:collection', async (req, res) => {
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

/**
 * delete nedb collection
 * @delete /:collection
 * @return {object {result: number|boolean, error: string}}
 */
router.delete('/:collection', async (req, res) => {
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
 * get nedb documents
 * @get /:collection/?page=X
 * @return {object{
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
  res.json(
    await nedb(req.params.collection).paginate({}, parseInt(req.query.page) || 1)
  ).send()
})

/**
 * get nedb document
 * @get /:collection/:document_id
 * @return {result: object|boolean, error: string}
 */
router.get('/:collection/:document_id', async (req, res) => {
  try {
    const docs = await nedb(req.params.collection).find({_id: req.params.document_id})
    res.json({
      result: docs.length > 0? docs[0]: false,
    }).send()
  } catch (err) {
    res.json({
      result: false,
      error: err.toString(),
    }).send()
  }
})

/**
 * insert/update nedb document
 * @put /:collection/
 * @param {object|object[]} docs {$query: {条件式}} が指定されていれば update
 * @return {result: object|number|boolean, error: string}
 */
router.put('/:collection/', async (req, res) => {
  try {
    if (typeof req.body['$query'] === 'object') {
      // update
      const query = req.body['$query']
      delete req.body['$query']
      res.json({
        result: await nedb(req.params.collection).update(query, req.body)
      }).send()
    } else {
      // insert
      res.json({
        result: await nedb(req.params.collection).insert(req.body)
      }).send()
    }
  } catch (err) {
    res.json({
      result: false,
      error: err.toString(),
    }).send()
  }
})

/**
 * delete nedb document
 * @delete /:collection/:document_id
 * @return {object {result: number|boolean, error: string}}
 */
router.delete('/:collection/:document_id', async (req, res) => {
  try {
    res.json({
      result: await nedb(req.params.collection).remove({_id: req.params.document_id})
    }).send()
  } catch (err) {
    res.json({
      result: false,
      error: err.toString(),
    }).send()
  }
})

// export
module.exports = router