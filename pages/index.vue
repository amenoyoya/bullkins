<template>
  <div class="flex flex-col justify-center items-center">
    <Logo />
    <h1 class="title">
      metakins
    </h1>
    <div class="links">
      <a
        href="https://nuxtjs.org/"
        target="_blank"
        rel="noopener noreferrer"
        class="button--green"
      >
        Documentation
      </a>
      <a
        href="https://github.com/nuxt/nuxt.js"
        target="_blank"
        rel="noopener noreferrer"
        class="button--grey"
      >
        GitHub
      </a>
    </div>
    <div class="mt-8">
      <button class="btn bg-blue-600 text-white" @click.prevent="$axios.post('/server/test/').then((res) => {
        $toast.success(JSON.stringify(res.data), {duration: 3000})
      })">Execute</button>
    </div>
  </div>
</template>

<style lang="postcss">
.title {
  @apply block font-light text-6xl tracking-wider text-teal-800;
}

.links {
  @apply pt-8;
}
</style>
