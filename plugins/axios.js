import Vue from 'vue'
import axios from 'axios'
import rison from 'rison'

Vue.prototype.$axios = axios
Vue.prototype.$console = console

/**
 * NeDB操作関連
 */
const nedb = axios => {
  return {
    /**
     * get all nedb collections
     * @get /
     * @return {string[]} collections
     */
    async enumerate() {
      const res = (await axios.get('/server/nedb/')).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },

    /**
     * create nedb collection
     * @param {string} collection
     * @return {boolean}
     */
    async create(collection) {
      const res = (await axios.post('/server/nedb/', {collection})).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },

    /**
     * delete nedb collection
     * @param {string} collection
     * @return {number} deleted
     */
    async delete(collection) {
      const res = (await axios.delete(`/server/nedb/?collection=${collection}`)).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },

    /**
     * get nedb documents from collection
     * @param {string} collection
     * @param {[search_key]: object, $sort: object, $limit: number, $skip: number} condition
     *    @see https://github.com/louischatriot/nedb#finding-documents
     * @return {object[]} docs
     */
    async find(collection, condition = {}) {
      const res = (await axios.get(`/server/nedb/${collection}/?query=${rison.encode(condition)}`)).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },

    /**
     * get nedb documents from collection
     * @param {string} collection
     * @param {[search_key]: object, $sort: object, $page: number, $per: number} condition
     * @return {Pager {
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
    async paginate(collection, condition) {
      const res = (await axios.get(`/server/nedb/${collection}/?pager=${rison.encode(condition)}`)).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },

    /**
     * insert nedb documents into collection
     * @param {string} collection
     * @param {object|object[]} data
     * @return {object|number} inserted
     */
    async insert(collection, data) {
      const res = (await axios.post(`/server/nedb/${collection}/`, data)).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },

    /**
     * update nedb documents in collection
     * @param {string} collection
     * @param {[search_key]: object} condition 更新したいデータ条件
     * @param {object} data 指定keyのみ更新したい場合は {$set: {object}}
     * @return {number} updated
     */
    async update(collection, condition, data) {
      const res = (await axios.put(`/server/nedb/${collection}/?query=${rison.encode(condition)}`, data)).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },

    /**
     * remove nedb documents from collection
     * @param {string} collection
     * @param {[search_key]: object} condition 削除したいデータ条件
     * @return {number} deleted
     */
    async remove(collection, condition = {}) {
      const res = (await axios.delete(`/server/nedb/${collection}/?query=${rison.encode(condition)}`)).data
      if (!res.result) {
        throw new Error(res.error)
      }
      return res.result
    },
  }
}

Vue.prototype.$nedb = nedb(axios)

/**
 * asyncData で使えるように context.app へ export
 */
export default ({app, $axios}) => {
  app.$nedb = nedb($axios)
}