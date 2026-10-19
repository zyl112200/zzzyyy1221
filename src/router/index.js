import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'
import ShopView from '../views/ShopView.vue'
import InventoryView from '../views/InventoryView.vue'
import { getSession } from '../store/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/home', name: 'home', component: HomeView, meta: { auth: true } },
    { path: '/shop', name: 'shop', component: ShopView, meta: { auth: true } },
    { path: '/inventory', name: 'inventory', component: InventoryView, meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to) => {
  const session = getSession()
  if (to.meta.auth && !session) {
    return { path: '/' }
  }
  // 已登录再访问登录/注册页，直接进主页
  if ((to.path === '/' || to.path === '/register') && session) {
    return { path: '/home' }
  }
  return true
})

export default router
