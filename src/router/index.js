import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'
import ShopView from '../views/ShopView.vue'
import InventoryView from '../views/InventoryView.vue'
import AdminLoginView from '../views/AdminLoginView.vue'
import AdminView from '../views/AdminView.vue'
import { getSession } from '../store/session'
import { getAdminSession } from '../store/adminSession'

const router = createRouter({
  // 使用 hash 路由，保证直接双击 index.html（file:// 协议）时也能正常切换页面
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/home', name: 'home', component: HomeView, meta: { auth: true } },
    { path: '/shop', name: 'shop', component: ShopView, meta: { auth: true } },
    { path: '/inventory', name: 'inventory', component: InventoryView, meta: { auth: true } },
    // 后台管理系统
    { path: '/admin/login', name: 'adminLogin', component: AdminLoginView },
    { path: '/admin', name: 'admin', component: AdminView, meta: { adminAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to) => {
  const session = getSession()
  const adminSession = getAdminSession()
  // 游戏玩家路由守卫
  if (to.meta.auth && !session) {
    return { path: '/' }
  }
  // 后台管理员路由守卫
  if (to.meta.adminAuth && !adminSession) {
    return { path: '/admin/login' }
  }
  // 已登录再访问登录/注册页，直接进主页
  if ((to.path === '/' || to.path === '/register') && session) {
    return { path: '/home' }
  }
  // 已是管理员又访问后台登录页，直接进后台
  if (to.path === '/admin/login' && adminSession) {
    return { path: '/admin' }
  }
  return true
})

export default router
