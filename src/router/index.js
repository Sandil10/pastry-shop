import { createRouter, createWebHashHistory } from 'vue-router'
import { systemSettings } from '../composables/useSettings'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Register from '../views/Register.vue'
import Settings from '../views/Settings.vue'
import Products from '../views/Products.vue'
import Analytics from '../views/Analytics.vue'
import SalesReport from '../views/SalesReport.vue'
import ReturnsReport from '../views/ReturnsReport.vue'
import ShiftHistory from '../views/ShiftHistory.vue'


const routes = [
  { path: '/', component: Login },
  { path: '/dashboard', component: Dashboard },
  { path: '/register', component: Register },
  { path: '/settings', component: Settings },
  { path: '/products', component: Products },
  { path: '/analytics', component: Analytics },
  { path: '/analytics/sales-by-item', component: SalesReport },
  { path: '/analytics/returns-summary', component: ReturnsReport },
  { path: '/analytics/shift-history', component: ShiftHistory }
]


const router = createRouter({
  history: createWebHashHistory(),
  routes
})


export default router
