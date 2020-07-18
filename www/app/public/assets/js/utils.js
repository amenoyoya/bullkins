/**
 * ユーティリティ関数
 */

/**
 * URLパラメータを分解してオブジェクト化
 * @return object
 */
function getUrlParameters() {
  var arg = {};
  var pair = location.search.substring(1).split('&');
  for (var i = 0; pair[i]; i++) {
    var kv = pair[i].split('=');
    arg[kv[0]] = kv[1];
  }
  return arg;
}