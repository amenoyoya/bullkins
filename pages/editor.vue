<template>
  <div class="container">
    <AceEditor
      v-model="content" lang="json" theme="tomorrow_night_eighties" width="auto" height="500"
      :options="{fontSize: 16}"
    />
  </div>
</template>

<script>
export default {
  layout: 'plain',
  data() {
    return {
      content: ''
    }
  },
}
</script>

<style>

</style>