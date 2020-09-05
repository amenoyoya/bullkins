<template>
  <div class="container justify-center items-center w-full h-full" v-if="!complete">
    <h1 class="text-2xl">仮会員登録テスト</h1>
    <ValidationObserver
      ref="vobs" tag="form" class="mt-8 md:w-3/4 sm:w-full px-4"
      @submit.prevent="submit" v-slot="{invalid}"
    >
      <InputWithLabel
        v-model="email" rules="required|email" type="email"
        name="email" className="input w-full" placeholder="xxx@yyy.zzz"
      >
        <i class="fas fa-envelope mr-2" />メールアドレス
      </InputWithLabel>
      <div class="mt-6" />
      <InputWithLabel
        v-model="password" rules="required|min:4|max:16" type="password"
        name="password" className="input w-full" placeholder="4文字以上16文字以内のパスワード"
      >
        <i class="fas fa-lock mr-2" />パスワード
      </InputWithLabel>
      <div class="mt-6">
        <button type="submit" :class="`btn ${invalid? 'disabled': ''}`" :disabled="invalid? true: null">
          <i class="fas fa-paper-plane mr-2" />仮会員登録
        </button>
      </div>
    </ValidationObserver>
    <div class="mt-4 border border-orange-500 rounded flex flex-col justify-center items-center p-4 w-3/4" v-if="announce">
      <p>すでに会員登録済みです</p>
      <p>パスワードを忘れた場合は <a class="link" href="/reminder">こちら</a> から再設定してください</p>
    </div>
  </div>
  <div class="container justify-center items-center w-full h-full" v-else>
    <h1 class="text-2xl">仮会員登録テスト</h1>
    <div class="mt-6">
      <p>入力されたメールアドレス宛にメールを送信しました</p>
      <p>メールに記載されたURLから本会員登録手続きを行ってください</p>
      <p class="mt-4">※URLの有効期限は24時間です</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      password: '',
      announce: false,
      complete: false,
    }
  },
  methods: {
    async submit() {
      if (await this.$refs.vobs.validate()) {
        this.announce = false
        try{
          // すでに会員かどうか確認
          if ((await this.$nedb.find('temp_users', {email: this.email})).length > 0) {
            return this.$toast.info('仮会員登録されています\nメールをご確認ください', {duration: 3000})
          }
          if ((await this.$nedb.find('users', {email: this.email})).length > 0) {
            this.announce = true
            return false
          }
          // temp_users に登録
          const token = this.$util.uid(64)
          await this.$nedb.insert('temp_users', {
            email: this.email,
            password: await this.$util.bcryptHash(this.password),
            token: token,
            created: this.$dayjs(),
            updated: this.$dayjs(),
          })
          // メール送信
          await this.$util.sendmail({
            from: '"metakins" <admin@metakins.localhost>',
            to: this.email,
            subject: '仮会員登録が完了がしました',
            text: `以下のURLから本会員登録を完了してください\n※リンクは24時間有効\n\n${process.env.APP_URI}/register?token=${token}`
          })
          this.complete = true
        } catch(err) {
          this.$toast.error(err.toString(), {duration: 3000})
        }
      }
    }
  }
}
</script>

<style lang="postcss">
.title {
  @apply block font-light text-6xl tracking-wider text-teal-800;
}

.links {
  @apply pt-8;
}
</style>
