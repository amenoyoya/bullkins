<template>
  <div class="container">
    <AceEditor
      v-model="content" lang="json" theme="tomorrow" width="auto" height="80vh"
      :options="{fontSize: '1rem'}"
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