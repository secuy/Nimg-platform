<template>
  <div id="app">
    <div class="nav-container">
      <nav>
        <router-link to="/">ThreeWorld</router-link> |
        <router-link to="/fibervis">FiberVis</router-link>
      </nav>
    </div>
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App'
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

.nav-container {
  background-color: #f8f9fa;
  padding: 10px 0;
  margin-bottom: 20px;
}

nav {
  padding: 10px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
  margin: 0 10px;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
