const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')

/**
 * generate bcrypt hash
 * @patch /bcrypt/
 * @param {plain: string, salt: string|number} payload plain を salt で bcrypt する
 * @return {string} hash
 */
router.patch('/bcrypt', (req, res) => {
  return res.send(bcrypt.hashSync(req.body.plain || '', req.body.salt || 10))
})

/**
 * verify bcrypt hash
 * @post /bcrypt/
 * @param {plain: string, hash: string} payload password と hash を比較する
 * @return {boolean} verified
 */
router.post('/bcrypt', (req, res) => {
  return res.send(bcrypt.compareSync(req.body.plain || '', req.body.hash || ''))
})

// export
module.exports = router