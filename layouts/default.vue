<template>
  <div class="container">
    <ul class="tabs">
      <li
        v-for="(tab, index) in tabs" :key="index"
        :class="index == cur? 'active': 'inactive'"
        @click.prevent="cur = index"
      >
        <i :class="`${tab.icon} mr-2`" />{{ tab.name }}
      </li>
    </ul>
    <div class="w-full py-4 border-l-2 border-r-2 border-b-2" style="height: 90vh">
      <div v-if="tabs[cur].src === 'nuxt'" class="w-full h-full"><Nuxt /></div>
      <iframe v-else-if="tabs[cur].src" :src="tabs[cur].src" class="w-full h-full" />
      <AceEditor v-else
        v-model="content" lang="html" theme="tomorrow" width="auto" height="100%"
        :options="{fontSize: '1rem', useWorker: false}"
      />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      cur: 0,
      tabs: [
        {icon: 'fas fa-tablet-alt', name: 'Frontend', src: 'nuxt'},
        {icon: 'fas fa-code', name: 'Source'},
        {icon: 'fas fa-database', name: 'Database', src: '/nedb/'},
        {icon: 'fas fa-envelope', name: 'Mail', src: '/maildev/'},
      ],
      content: '',
    }
  },
  async mounted() {
    const info = await this.$system.getComponent(this.$route.name)
    this.content = info.content
    console.log(this.content)
  }
}
</script>

<style lang="postcss">
ul.tabs {
  @apply flex justify-evenly items-center w-full;
  li {
    @apply flex-1 p-1 text-center;
    &.active {
      @apply border-t-2 border-l-2 border-r-2 text-teal-600 font-semibold;
    }
    &.inactive {
      @apply border-2 bg-gray-200 cursor-pointer text-gray-600;
    }
  }
}
</style>