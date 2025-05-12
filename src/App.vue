<template>
  <div id="app">
    <ThreeWorld msg="Surface and Tractography 3D Viewer"/>
  </div>
</template>

<script>
import ThreeWorld from './components/ThreeWorld.vue'

export default {
  name: 'App',
  components: {
    ThreeWorld
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0;
  padding: 0;
  height: 100vh;
}
body {
  margin: 0;
  padding: 0;
}
</style>
