const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const mailer = require('nodemailer')

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

/**
 * send mail
 * @post /mail/
 * @param {transport: object, config: object} payload
 *    @example {
 *      transport: {
 *        host: '127.0.0.1',
 *        port: 3025,
 *        secure: false, // true for 465, false for other ports
 *        tls: {
 *          rejectUnauthorized: false, // no authorization
 *        }
 *      },
 *      config: {
 *        from: '"差出人名" <アドレス>',
 *        to: 'アドレス1, アドレス2, ...',
 *        subject: 'mail title',
 *        text: 'plain text mail body',
 *        html: '<p>HTML mail body</p>',
 *      }
 *    }
 * @return {result: string|boolean, error: string}
 */
router.post('/mail', async (req, res) => {
  try {
    const transporter = mailer.createTransport(req.body.transport || {})
    const info = await transporter.sendMail(req.body.config || {})
    return res.json({result: info.messageId}).send()
  } catch(err) {
    return res.json({result: false, error: err.toString()}).send()
  }
})

// export
module.exports = router