import Vue from 'vue'
import axios from 'axios'

Vue.prototype.$axios = axios
Vue.prototype.$console = console

/**
 * NeDB操作関連
 */
Vue.prototype.$nedb = {
  // get all collections
  async enumerate() {
    return (await axios.get('/server/nedb/')).data
  },

  // create new collection
  async create(collection) {
    return (await axios.post(`/server/nedb/${collection}/`)).data
  },

  // delete collection
  async delete(collection) {
    return (await axios.delete(`/server/nedb/${collection}/`)).data
  },

  // paginate documents in collection
  async paginate(collection, page = 1) {
    return (await axios.get(`/server/nedb/${collection}/?page=${page}`)).data
  },

  // paginate documents in collection
  async paginate(collection, page = 1) {
    return (await axios.get(`/server/nedb/${collection}/?page=${page}`)).data
  },

  // insert/update documents into collection
  async post(collection, data) {
    return (await axios.put(`/server/nedb/${collection}/`, data)).data
  },
}