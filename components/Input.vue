<template>
  <ValidationProvider :rules="rules" v-slot="{errors}">
    <input
      :aria-label="label" :id="label" :name="name" :type="type? type: 'text'" :class="className || 'input'"
      :placeholder="placeholder" :value="value" @input="$emit('input', $event.target.value)"
    />
    <Error v-show="errors">{{ errors[0] }}</Error>
  </ValidationProvider>
</template>

<script>
export default {
  props: {
    label: String,
    name: String,
    type: String,
    className: String,
    rules: String,
    placeholder: String,
    value: String,
  }
}
</script>
