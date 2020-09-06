const routes = [
  {
    "name": "nedb",
    "path": "/nedb",
    "chunkName": "pages/nedb/index",
  },
  {
    "name": "register",
    "path": "/register",
    "chunkName": "pages/register",
  },
  {
    "name": "nedb-collection",
    "path": "/nedb/:collection",
    "chunkName": "pages/nedb/_collection",
  },
  {
    "name": "nedb-collectionData-edit",
    "path": "/nedb/:collectionData/edit",
    "chunkName": "pages/nedb/_collectionData/edit",
  },
  {
    "name": "index",
    "path": "/",
    "chunkName": "pages/index",
  }
]

console.log(routes.find(v => v.name === 'nedb-collectionData-edit'))