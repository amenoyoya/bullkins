const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const mailer = require('nodemailer')
const crypto = require('crypto')
const nedb = require('./lib/nedb')
const dayjs = require('dayjs')

dayjs.locale('ja')

/**
 * 暗号化
 * @param {string} text
 * @param {string} passphrase
 * @param {string} algorithm = 'aes192'
 * @return {string} crypted
 */
const encrypt = (text, passphrase, algorithm = 'aes192') => {
  const cipher = crypto.createCipher(algorithm, passphrase)
  const crypted = cipher.update(text, 'utf8', 'base64')
  return crypted + cipher.final('base64')
}

/**
 * 復号
 * @param {string} text
 * @param {string} passphrase
 * @param {string} algorithm = 'aes192'
 * @return {string} decrypted
 */
const decrypt = (text, passphrase, algorithm = 'aes192') => {
  const decipher = crypto.createDecipher(algorithm, passphrase)
  const decrypted = decipher.update(text, 'base64', 'utf8')
  return decrypted + decipher.final('utf8')
}

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

/**
 * save session data
 * ※ NeDB/@session.db をセッションストアとして利用
 * @post /session/:key/?lifetime={lifetime[秒]}
 * @param {number} query.lifetime セッション有効期限（デフォルト: 1440秒）
 * @param {string} key セッションIDの保存先Cookieキー
 * @param {*} payload 保存データ
 * @return {result: boolean, error: string}
 */
router.post('/session/:key', async (req, res) => {
  try {
    const doc = await nedb('@session').insert({
      // データは暗号化した上で保存
      data: encrypt(JSON.stringify(req.body), `@session/${req.params.key}`),
      // セッション有効期限: now + lifetime
      expires: dayjs().add(req.query.lifetime || 1440, 'second').format(),
    })
    // DBデータID（セッションID）をクッキーに保存するようにブラウザへ返す
    return res.cookie(req.params.key, doc._id, {
      // クッキーとセッションの有効期限を合わせる
      maxAge: 1000 * (req.query.lifetime || 1440), // maxAge はミリ秒単位
      httpOnly: true, // HTTP通信のみで使用可能とする
      secure: process.env.APP_URI.match(/^https/), // セキュア通信かどうか
    })
      .json({result: true}).send()
  } catch(err) {
    return res.json({result: false, error: err.toString()}).send()
  }
})

/**
 * load session data
 * ※ NeDB/@session.db をセッションストアとして利用
 * @get /session/:key/
 * @param {string} key セッションIDとして取り出すCookieキー
 * @return {result: object|boolean, error: string}
 */
router.get('/session/:key', async (req, res) => {
  // 送信されたCookieからセッションID取り出し
  const sessionId = req.cookies[req.params.key]
  if (!sessionId) {
    return res.json({result: false, error: 'cookie has no session id'}).send()
  }
  try {
    // @session._id = セッションID のデータ取得
    const docs = await nedb('@session').find({_id: sessionId})
    if (docs.length === 0) {
      throw new Error('session expired')
    }
    // 有効期限切れのセッションなら削除して終了
    const doc = docs[0]
    if (dayjs(doc.expires) <= dayjs()) {
      await nedb('@session').remove({_id: sessionId})
      throw new Error('session expired')
    }
    return res.json({
      // セッションデータを復号 => JSON化して返す
      result: JSON.parse(decrypt(doc.data, `@session/${req.params.key}`))
    }).send()
  } catch(err) {
    // エラーが起きたCookieデータを削除するようにブラウザへ返す
    return res.clearCookie(req.params.key)
      .json({result: false, error: err.toString()}).send()
  }
})

/**
 * clear session data
 * ※ NeDB/@session.db をセッションストアとして利用
 * @delete /session/:key/
 * @param {string} key セッションIDとして取り出すCookieキー
 * @return {result: boolean, error: string}
 */
router.delete('/session/:key', async (req, res) => {
  // 送信されたCookieからセッションID取り出し
  const sessionId = req.cookies[req.params.key]
  if (!sessionId) {
    return res.json({result: false, error: 'cookie has no session id'}).send()
  }
  try {
    // @session._id = セッションID のデータ削除
    await nedb('@session').remove({_id: sessionId})
    return res.clearCookie(req.params.key).json({result: true}).send()
  } catch(err) {
    return res.clearCookie(req.params.key).json({result: false, error: err.toString()}).send()
  }
})

// export
module.exports = router