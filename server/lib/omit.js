/**
 * 特定プロパティを除外してオブジェクトをクローン
 * @param {object} obj クローン元オブジェクト
 * @param {string[]} props 除外キーの配列
 * @param {function(value: any, key: string, obj: object) => boolean} fn 除外条件関数
 * @return {object}
 * 
 * @example const obj = omit({a:1, b:2, c:3, d:4, e:5}, ['b', 'd'])
 *          console.log(obj) // => {a:1, c:3, e:5}
 */
module.exports = (obj, props, fn) => {
  if (typeof obj !== 'object') {
    return {}
  }
  if (typeof props === 'function') {
    fn = props
    props = []
  }
  if (typeof props === 'string') {
    props = [props];
  }

  const isFunction = typeof fn === 'function'
  const res = {}

  for (const [key, val] of Object.entries(obj)) {
    if (!props || (props.indexOf(key) === -1 && (!isFunction || fn(val, key, obj)))) {
      res[key] = val
    }
  }
  return res
}