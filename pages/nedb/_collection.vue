<template>
  <div class="container">
    <h1 class="border-b-4 text-3xl font-bold">NeDB Express</h1>
    <section class="mt-4">
      <div class="bg-gray-300 flex flex-row justify-between p-2 items-center">
        <h2 class="text-xl"><a href="/nedb/" class="link">Collections</a> > {{ collection }}</h2>
      </div>
      <ul class="flex justify-center p-2 items-center">
        <li>
          <a :class="'btn ' + (docs.page <= 1? 'disabled': '')"
            :href="docs.page <= 1? null: `/nedb/${collection}/?page=1`"
          >
            <i class="fas fa-angle-double-left" />
          </a>
        </li>
        <li v-for='page in pages' :key="page">
          <a :class="'btn ' + (docs.page == page + 1? 'disabled': '')"
            :href="docs.page == page + 1? null: `/nedb/${collection}/?page=${page + 1}`"
          >
            {{ page + 1 }}
          </a>
        </li>
        <li>
          <a :class="'btn ' + (docs.page >= docs.last? 'disabled': '')"
            :href="docs.page >= docs.last? null: `/nedb/${collection}/?page=${docs.last}`"
          >
            <i class="fas fa-angle-double-right" />
          </a>
        </li>
      </ul>
      <div class="flex justify-center items-center">
        {{ docs.start }} - {{ docs.end }} / {{ docs.count }}
      </div>
      <button class="btn bg-green-600 text-white">
        <i class="fas fa-sticky-note mr-2" />New
      </button>
      <table class="min-w-full mt-4">
        <thead class="shadow-md">
          <tr v-if="columns.length">
            <th class="border">Edit</th>
            <th class="border" v-for="(column, index) in columns" :key="index">
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, x) in docs.data" :key="x">
            <td class="border p-2 flex justify-evenly">
              <button class="btn bg-orange-400 text-white">
                <i class="fas fa-edit mr-2" />Edit
              </button>
              <button class="btn bg-red-600 text-white" @click.prevent="deleteDocument(row._id)">
                <i class="fas fa-trash mr-2" />Delete
              </button>
            </td>
            <td class="border p-2" v-for="(column, y) in columns" :key="y">
              {{ row[column] }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'plain',
  data() {
    return {
      collection: this.$route.params.collection,
      pages: [],
      docs: [],
      columns: [],
    }
  },
  async mounted() {
    await this.initialize()
  },
  methods: {
    /**
     * ページ初期化: mounted時に呼び出す
     */
    async initialize() {
      const page = parseInt(this.$route.query.page) || 1
      // documents取得
      this.docs = (await this.$axios.get(`/server/nedb/${this.collection}/?page=${page}`)).data
      // columns取得
      if (this.docs.data.length) {
        this.columns = ['_id']
        for (const key of Object.keys(this.docs.data[0])) {
          if (!this.columns.includes(key)) {
            this.columns.push(key)
          }
        }
      } else {
        this.columns = []
      }
      // ページネーションリスト生成
      this.pages = [...Array(this.docs.last).keys()].slice(
        (this.docs.page - 1) - 2 < 0? 0: (this.docs.page - 1) - 2,
        this.docs.page + 2 > this.docs.last? this.docs.last: this.docs.page + 2
      )
    },

    /**
     * ドキュメント削除
     * @param {string} document_id
     */
    async deleteDocument(document_id) {
      const vue = this
      vue.$dialog.confirm({
        title: '確認',
        body: `${document_id} を削除しますか？`,
      }).then(async () => {
        try {
          const res = (await vue.$axios.delete(`/server/nedb/${vue.collection}/${document_id}`)).data
          if (res.result) {
            await vue.initialize() // ページリロード
            vue.$toast.success(`${vue.collection}/${document_id} を削除しました`, {duration: 3000})
          } else {
            vue.$toast.error(res.error, {duration: 3000})
          }
        } catch {
          vue.$toast.error(`${vue.collection}/${document_id} を削除できません`, {duration: 3000})
        }
      })
    },
  }
}
</script>
