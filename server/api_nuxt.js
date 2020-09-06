const express = require('express')
const router = express.Router()
const fs = require('fs')

/**
 * get nuxt routes info
 * @get /routes/:name
 * @return {result: {object|boolean}, error: string}
 */
router.get('/routes/:name', (req, res) => {
  try {
    // load .nuxt/routes.json
    const routes = JSON.parse(fs.readFileSync('./.nuxt/routes.json'))
    const route = routes.find(v => v.name === req.params.name)
    if (!route) {
      throw new Error(`route '${req.params.name}' not found`)
    }
    return res.json({
      result: {
        path: `${route.chunkName}.vue`,
        content: fs.readFileSync(route.component).toString()
      }
    }).send()
  } catch(err) {
    return res.json({result: false, error: err.toString()}).send()
  }
})

// export
module.exports = router