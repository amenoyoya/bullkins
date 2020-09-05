import Vue from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/ja'

// 日本時間に設定
dayjs.locale('ja')

// vue.$dayjs に export
Vue.prototype.$dayjs = dayjs

/**
 * asyncData で使えるように context.app へ export
 */
export default ({app}) => {
  app.$dayjs = dayjs
}