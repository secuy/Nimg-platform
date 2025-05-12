import Vue from 'vue'
import VueRouter from 'vue-router'
import CrossSpecies from '../components/CrossSpecies/index.vue'
import FiberVis from '../components/FiberVis/FiberVis.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/cross-species',
    name: 'CrossSpecies',
    component: CrossSpecies
  },
  {
    path: '/fibervis',
    name: 'FiberVis',
    component: FiberVis
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL, // 
  routes
})

export default router 