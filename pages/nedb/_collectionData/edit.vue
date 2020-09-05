<template>
  <div class="container">
    <h1 class="border-b-4 text-3xl font-bold">NeDB Express</h1>
    <section class="mt-4">
      <div class="bg-gray-300 flex flex-row justify-between p-2 items-center">
        <ul class="breadcrumb">
          <li><a href="/nedb/" class="link">Collections</a></li>
          <li><a :href="`/nedb/${collection}`" class="link">{{ collection }}</a></li>
          <li>Edit</li>
        </ul>
      </div>
      <div class="mt-4 w-full">
        <AceEditor
          v-model="document" lang="json" theme="tomorrow" width="auto" height="60vh"
          :options="{fontSize: '1rem'}"
        />
        <div class="flex justify-end my-2">
          <div class="flex justify-evenly">
            <button class="btn bg-green-600 text-white mr-2" @click.prevent="saveData">
              <i class="fas fa-save mr-2" />Save
            </button>
            <button class="btn bg-orange-500 text-white" @click.prevent="$router.go(-1)">
              <i class="fas fa-undo mr-2" />Cancel
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'plain',
  data() {
    return {
      collection: this.$route.params.collectionData,
    }
  },
  /**
   * 非同期通信: レンダリング前にデータ取得
   */
  async asyncData({app, params, query}) {
    if (query.id) {
      try {
        const docs = await app.$nedb.find(params.collectionData, {_id: query.id})
        if (docs.length > 0) {
          return {
            id: query.id,
            document: JSON.stringify(docs[0], null, 4),
          }
        }
      } catch {
        return {
          id: undefined, document: '',
        }
      }
    }
    return {
      id: undefined, document: ''
    }
  },
  methods: {
    /**
     * データ保存
     */
    async saveData() {
      try {
        const data = JSON.parse(this.document)
        if (this.id !== undefined) {
          // 指定IDのドキュメントを更新
          await this.$nedb.update(this.collection, {_id: this.id}, data)
          this.$router.go(-1) // 前の画面に戻る
          return true
        }
        // 新規ドキュメントinsert
        await this.$nedb.insert(this.collection, data)
        this.$router.go(-1) // 前の画面に戻る
      } catch(err) {
        this.$toast.error(err.toString(), {duration: 3000})
      }
    }
  },
}
</script>

<style lang="postcss">
ul.breadcrumb {
  @apply flex text-xl;
  li {
    &::after {
      content: ">";
      @apply mx-2;
    }
    &:last-child::after {
      content: none;
    }
  }
}
</style>