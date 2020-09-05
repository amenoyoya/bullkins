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
      <table class="min-w-full mt-4">
        <thead class="shadow-md">
          <tr v-if="docs.data">
            <th class="border">_id</th>
            <th class="border"
              v-for="(col, index) in Object.keys(docs.data[0]).filter(c => c != '_id')" :key="index"
            >
              {{ col }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, x) in docs.data" :key="x">
            <td class="border p-2">{{ row['_id'] }}</td>
            <td class="border p-2"
              v-for="(key, y) in Object.keys(row).filter(k => k != '_id')" :key="y"
            >
              {{ row[key] }}
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
    }
  },
  async mounted() {
    const page = parseInt(this.$route.query.page) || 1
    console.log(page)
    this.docs = (await this.$axios.get(`/server/nedb/${this.collection}/?page=${page}`)).data
    this.pages = [...Array(this.docs.last).keys()].slice(
      (this.docs.page - 1) - 2 < 0? 0: (this.docs.page - 1) - 2,
      this.docs.page + 2 > this.docs.last? this.docs.last: this.docs.page + 2
    )
  }
}
</script>
