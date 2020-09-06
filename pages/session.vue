<template>
  <div class="container">
    <button class="btn" @click.prevent="save">セッションにデータ保存</button>
    <div class="my-6 border rounded flex justify-center items-center py-4">
      <p>Cookieを確認するときは Chrome Dev tool > Application > Storage > Cookies から確認</p>
    </div>
    <button class="btn" @click.prevent="load">セッションからデータ取得</button>
    <button class="btn mt-4" @click.prevent="clear">セッションクリア</button>
  </div>
</template>

<script>
export default {
  methods: {
    async save() {
      // cookie.test に有効期限 1時間でセッションID保存（セッションには有効期限 1時間でデータ保存）
      try {
        await this.$util.saveSession('test', {username: 'admin-user', role: 'admin'}, 3600)
        this.$toast.success('セッション保存しました', {duration: 3000})
      } catch (err) {
        this.$toast.error(err.toString(), {duration: 3000})
      }
    },
    async load() {
      // cookie.test に保存されているセッションIDからセッションデータ取得
      try {
        const data = await this.$util.loadSession('test')
        this.$toast.success(JSON.stringify(data, null, 2), {duration: 3000})
      } catch(err) {
        this.$toast.error(err.toString(), {duration: 3000})
      }
    },
    async clear() {
      // cookie.test に保存されているセッションIDのデータを削除し、クッキーも削除
      try {
        await this.$util.clearSession('test')
        this.$toast.success('セッション削除しました', {duration: 3000})
      } catch(err) {
        this.$toast.error(err.toString(), {duration: 3000})
      }
    },
  }
}
</script>

<style>

</style>