<template>
  <div class="container justify-center items-center w-full h-full">
    <h1 class="text-2xl">本会員登録テスト</h1>
    <div v-if="result" class="mt-6">
      <p>本会員登録が完了しました</p>
    </div>
    <div v-else class="mt-6">
      <p>リンクが無効です</p>
      <p>お手数ですが、もう一度仮会員登録からやり直してください</p>
      <div class="mt-4">
        <a class="link" href="/">仮会員登録ページへ</a>
      </div>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'

export default {
  /**
   * Server Side 処理
   */
  async asyncData({app, query}) {
    try {
      // token 確認
      if (!query.token) {
        return {result: false}
      }
      const docs = await app.$nedb.find('temp_users', {token: query.token})
      if (docs.length === 0) {
        return {result: false}
      }
      // 一回しか使わないため、DBからデータ削除
      const doc = docs[0]
      await app.$nedb.remove('temp_users', {_id: doc._id})
      // 有効期限確認: 24時間以内
      const created = dayjs(doc.created)
      const now = dayjs()
      if (now > created.add(24, 'hours')) {
        return {result: false}
      }
      // 本登録
      delete doc.token
      doc.created = now;
      doc.updated = now;
      await app.$nedb.insert('users', doc)
      return {result: true}
    } catch {
      return {result: false}
    }
  }
}
</script>