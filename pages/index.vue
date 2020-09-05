<template>
  <div class="container justify-center items-center w-full">
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
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      password: '',
    }
  },
  methods: {
    async submit() {
      if (await this.$refs.vobs.validate()) {
        try{
          await this.$nedb.insert('temp_users', {
            email: this.email,
            password: await this.$util.bcryptHash(this.password),
            token: this.$util.uid(64),
            created: new Date(),
            updated: new Date(),
          })
          this.$toast.success('仮会員登録が完了がしました', {duration: 3000})
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
