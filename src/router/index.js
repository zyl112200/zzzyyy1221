import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'
import ShopView from '../views/ShopView.vue'
import InventoryView from '../views/InventoryView.vue'
import AssociationView from '../views/AssociationView.vue'
import CodexView from '../views/CodexView.vue'
import SkillsView from '../views/SkillsView.vue'
import AchievementsView from '../views/AchievementsView.vue'
import LeaderboardView from '../views/LeaderboardView.vue'
import PondView from '../views/PondView.vue'
import QuestsView from '../views/QuestsView.vue'
import BondView from '../views/BondView.vue'
import IdentityView from '../views/IdentityView.vue'
import MoreLayout from '../views/more/MoreLayout.vue'
import AbyssView from '../views/more/AbyssView.vue'
import VeinView from '../views/more/VeinView.vue'
import RebirthView from '../views/more/RebirthView.vue'
import PassView from '../views/more/PassView.vue'
import AdminLoginView from '../views/AdminLoginView.vue'
import AdminDashboardView from '../views/AdminDashboardView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import { getSession } from '../store/session'
import { getAdminSession } from '../admin/store'

const router = createRouter({
  // 使用 hash 路由，保证直接双击 index.html（file:// 协议）时也能正常切换页面
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/home', name: 'home', component: HomeView, meta: { auth: true } },
    { path: '/shop', name: 'shop', component: ShopView, meta: { auth: true } },
    { path: '/inventory', name: 'inventory', component: InventoryView, meta: { auth: true } },
    { path: '/assoc', name: 'assoc', component: AssociationView, meta: { auth: true } },
    { path: '/codex', name: 'codex', component: CodexView, meta: { auth: true } },
    { path: '/skills', name: 'skills', component: SkillsView, meta: { auth: true } },
    { path: '/achievements', name: 'achievements', component: AchievementsView, meta: { auth: true } },
    { path: '/leaderboard', name: 'leaderboard', component: LeaderboardView, meta: { auth: true } },
    { path: '/pond', name: 'pond', component: PondView, meta: { auth: true } },
    { path: '/quests', name: 'quests', component: QuestsView, meta: { auth: true } },
    { path: '/bond', name: 'bond', component: BondView, meta: { auth: true } },
    { path: '/identity', name: 'identity', component: IdentityView, meta: { auth: true } },
    {
      path: '/more', component: MoreLayout, meta: { auth: true },
      redirect: '/more/abyss',
      children: [
        { path: 'abyss', name: 'more-abyss', component: AbyssView, meta: { auth: true } },
        { path: 'vein', name: 'more-vein', component: VeinView, meta: { auth: true } },
        { path: 'rebirth', name: 'more-rebirth', component: RebirthView, meta: { auth: true } },
        { path: 'pass', name: 'more-pass', component: PassView, meta: { auth: true } }
      ]
    },
    { path: '/admin', name: 'admin-login', component: AdminLoginView },
    { path: '/admin/home', name: 'admin-home', component: AdminDashboardView, meta: { adminAuth: true } },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersView, meta: { adminAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to) => {
  const session = getSession()
  const adminSession = getAdminSession()
  // 需要登录的页面
  if (to.meta.auth && !session) {
    return { path: '/' }
  }
  // 已登录再访问登录/注册页，直接进主页
  if ((to.path === '/' || to.path === '/register') && session) {
    return { path: '/home' }
  }
  // 已是管理员再访问后台登录页，直接进后台主页
  if (to.path === '/admin' && adminSession) {
    return { path: '/admin/home' }
  }
  // 需要管理员权限的后台页面
  if (to.meta.adminAuth && !adminSession) {
    return { path: '/admin' }
  }
  return true
})

export default router
