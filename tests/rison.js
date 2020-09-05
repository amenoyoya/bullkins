const rison = require('rison')

const json = {
  $limit: 1, $sort: {name: 1}
}
console.log(encodeURI(`http://localhost:3000/server/nedb/users/?query=${rison.encode(json)}`))