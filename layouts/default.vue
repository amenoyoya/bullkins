<template>
  <div class="my-0 mx-auto min-h-screen flex justify-center">
    <sidebar-menu :menu="menu" collapsed="true" />
    <div class="flex-grow ml-10 h-full">
      <ul class="tabs">
        <li
          v-for="(tab, index) in tabs" :key="index"
          :class="index == cur? 'active': 'inactive'"
          @click.prevent="cur = index"
        >
          <i :class="`${tab.icon} mr-2`" />{{ tab.name }}
        </li>
      </ul>
      <div class="w-full mx-0" style="height: 94vh">
        <div v-if="tabs[cur].src === 'nuxt'" class="w-full h-full"><Nuxt /></div>
        <iframe v-else-if="tabs[cur].src" :src="tabs[cur].src" class="w-full h-full px-4" />
        <AceEditor v-else
          v-model="content" lang="html" theme="tomorrow" width="auto" height="100%"
          :options="{fontSize: '1rem', useWorker: false}"
        />
      </div>
    </div>
  </div>
</template>

<script>
import menu from './sidebar.json'

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
      menu: menu,
    }
  },
  /**
   * mountされたら表示中コンポーネントのソースコードを取得
   */
  async mounted() {
    const info = await this.$system.getComponent(this.$route.name)
    this.content = info.content
  }
}
</script>

<style lang="postcss">
ul.tabs {
  @apply flex justify-evenly items-stretch w-full;
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