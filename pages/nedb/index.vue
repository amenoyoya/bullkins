<template>
  <div class="container">
    <h1 class="border-b-4 text-3xl font-bold">NeDB Express</h1>
    <section class="mt-4">
      <div class="bg-gray-300 flex flex-row justify-between p-2 items-center">
        <h2 class="text-xl">Databases</h2>
        <form class="flex flex-row ml-4" @submit.prevent="createDatabase">
          <input type="text" class="input" placeholder="Database Name" v-model="database">
          <button type="submit" class="btn bg-blue-600 text-white">
            <i class="fas fa-plus mr-2" />Create Database
          </button>
        </form>
      </div>
      <ul class="table w-full mt-2">
        <li v-for="(collection, index) in collections" :key="index" class="table-row h-20">
            <div class="table-cell align-middle w-1/6 border px-1">
              <nuxt-link :to="{name: 'nedb-collection', params: {collection}}" class="btn w-full bg-green-600 text-white">
                <i class="fas fa-eye" /><br />View
              </nuxt-link>
            </div>
            <div class="table-cell align-middle w-2/3 text-2xl border px-2">
              <nuxt-link :to="{name: 'nedb-collection', params: {collection}}" class="link">{{ collection }}</nuxt-link>
            </div>
            <div class="table-cell align-middle w-1/6 border px-1">
              <button class="btn w-full bg-red-600 text-white" @click.prevent="deleteDatabase(collection)">
                <i class="fas fa-trash" /><br />Delete
              </button>
            </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'plain',
  data() {
    return {
      collections: [],
      database: '',
    }
  },
  async mounted() {
    this.collections = (await this.$axios.get('/server/nedb')).data
  },
  methods: {
    async createDatabase() {
      if (this.database === '') {
        return this.$toast.info('作成するデータベース名を指定してください', {duration: 3000})
      }
      if (this.collections.includes(this.database)) {
        return this.$toast.info('すでに存在するデータベースです', {duration: 3000})
      }
      try {
        const res = await this.$axios.post(`/server/nedb/${this.database}`)
        if (res.data.result) {
          this.$toast.success(`${this.database} を作成しました`, {duration: 3000})
          this.collections.unshift(this.database)
          this.database = ''
        } else {
          this.$toast.error(`${this.database} を作成できません`, {duration: 3000})
        }
      } catch {
        this.$toast.error(`${this.database} を作成できません`, {duration: 3000})
      }
    },

    deleteDatabase(collection) {
      const vue = this
      vue.$dialog.confirm({
        title: '確認',
        body: `${collection} を削除しますか？`,
      }).then(async () => {
        try {
          const res = await vue.$axios.delete(`/server/nedb/${collection}`)
          if (res.data.result) {
            vue.$toast.success(`${collection} を削除しました`, {duration: 3000})
            vue.collections = vue.collections.filter(c => c !== collection)
          } else {
            vue.$toast.error(`${collection} を削除できません`, {duration: 3000})
          }
        } catch(err) {
          vue.$toast.error(`${collection} を削除できません`, {duration: 3000})
        }
      })
    }
  }
}
</script>