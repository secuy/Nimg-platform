<template>
  <ThreeWorld :msg="msg" />
</template>

<script>
import ThreeWorld from './ThreeWorld/index.vue';

export default {
  name: 'ThreeWorldWrapper',
  components: {
    ThreeWorld
  },
  props: {
    msg: String
  }
}
</script>