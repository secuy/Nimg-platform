import Vue from 'vue'
import VueRouter from 'vue-router'
import ThreeWorld from '../components/ThreeWorld.vue'
import FiberVis from '../components/FiberVis/FiberVis.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'ThreeWorld',
    component: ThreeWorld
  },
  {
    path: '/fibervis',
    name: 'FiberVis',
    component: FiberVis
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router 