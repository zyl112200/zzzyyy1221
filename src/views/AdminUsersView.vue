<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminSession, clearAdminSession } from '../admin/store.js'
import {
  listUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
  createUser
} from '../api/admin.js'

const router = useRouter()
const admin = getAdminSession()
const adminName = admin ? admin.username : ''

// ---------- 列表状态 ----------
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const permissionFilter = ref('')
const loading = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

// ---------- toast ----------
const toast = ref('')
const toastVisible = ref(false)
let timer = null
function showToast(msg) {
  toast.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (toastVisible.value = false), 2600)
}

// ---------- 加载用户 ----------
async function loadUsers() {
  loading.value = true
  try {
    const res = await listUsers({
      keyword: keyword.value,
      permission: permissionFilter.value,
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.code === 200 && res.data) {
      list.value = res.data.list || []
      total.value = res.data.total || 0
      page.value = res.data.page || 1
      pageSize.value = res.data.pageSize || 10
    } else {
      showToast(res.message || '加载失败')
    }
  } catch (e) {
    showToast('网络开小差了，请稍后再试 🌊')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  loadUsers()
}
function onFilterChange() {
  page.value = 1
  loadUsers()
}
function changePage(delta) {
  const next = page.value + delta
  if (next < 1 || next > totalPages.value) return
  page.value = next
  loadUsers()
}

onMounted(loadUsers)

// ---------- 退出 ----------
function logout() {
  clearAdminSession()
  router.push('/admin')
}

// ---------- 编辑 ----------
const showEdit = ref(false)
const editForm = reactive({
  id: null,
  username: '',
  email: '',
  shells: 0,
  strength: 10,
  goldStones: 0,
  powerRealm: 1,
  permission: 1
})
const editMsg = ref('')

function openEdit(u) {
  editForm.id = u.id
  editForm.username = u.username
  editForm.email = u.email
  editForm.shells = u.shells
  editForm.strength = u.strength
  editForm.goldStones = u.goldStones
  editForm.powerRealm = u.powerRealm
  editForm.permission = u.permission
  editMsg.value = ''
  showEdit.value = true
}

async function submitEdit() {
  const res = await updateUser({
    id: editForm.id,
    email: editForm.email,
    shells: Number(editForm.shells),
    strength: Number(editForm.strength),
    goldStones: Number(editForm.goldStones),
    powerRealm: Number(editForm.powerRealm),
    permission: Number(editForm.permission)
  })
  editMsg.value = res.message
  if (res.code === 200) {
    showToast(res.message)
    showEdit.value = false
    loadUsers()
  }
}

// ---------- 重置密码 ----------
const showReset = ref(false)
const resetTarget = ref(null)
const resetPwd = ref('')
const resetMsg = ref('')

function openReset(u) {
  resetTarget.value = u
  resetPwd.value = ''
  resetMsg.value = ''
  showReset.value = true
}

async function submitReset() {
  const res = await resetUserPassword(resetTarget.value.id, resetPwd.value)
  resetMsg.value = res.message
  if (res.code === 200) {
    showToast(res.message)
    showReset.value = false
  }
}

// ---------- 删除 ----------
const showDelete = ref(false)
const deleteTarget = ref(null)

function openDelete(u) {
  if (u.username === adminName) {
    showToast('不能删除当前登录的管理员账号 🛑')
    return
  }
  deleteTarget.value = u
  showDelete.value = true
}

async function submitDelete() {
  const res = await deleteUser(deleteTarget.value.id)
  if (res.code === 200) {
    showToast(res.message)
    showDelete.value = false
    // 当前页可能变空
    if (list.value.length === 1 && page.value > 1) page.value -= 1
    loadUsers()
  } else {
    showToast(res.message || '删除失败')
  }
}

// ---------- 新建 ----------
const showCreate = ref(false)
const createForm = reactive({
  username: '',
  email: '',
  password: '',
  permission: 1,
  shells: 50,
  strength: 10,
  goldStones: 0,
  powerRealm: 1
})
const createMsg = ref('')

function openCreate() {
  Object.assign(createForm, {
    username: '',
    email: '',
    password: '',
    permission: 1,
    shells: 50,
    strength: 10,
    goldStones: 0,
    powerRealm: 1
  })
  createMsg.value = ''
  showCreate.value = true
}

async function submitCreate() {
  const res = await createUser({
    username: createForm.username,
    email: createForm.email,
    password: createForm.password,
    permission: Number(createForm.permission),
    shells: Number(createForm.shells),
    strength: Number(createForm.strength),
    goldStones: Number(createForm.goldStones),
    powerRealm: Number(createForm.powerRealm)
  })
  createMsg.value = res.message
  if (res.code === 200) {
    showToast(res.message)
    showCreate.value = false
    page.value = 1
    loadUsers()
  }
}

// ---------- 工具 ----------
function roleLabel(p) {
  return p === 0 ? '管理员' : '普通玩家'
}
function formatTime(t) {
  if (!t) return '—'
  try {
    return new Date(t).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return '—'
  }
}
</script>

<template>
  <div class="admin">
    <header class="topbar">
      <div class="brand">🛠️ 后台管理系统</div>
      <nav class="nav">
        <router-link to="/admin/home">控制台</router-link>
        <router-link to="/admin/users" class="active">用户管理</router-link>
      </nav>
      <div class="right">
        <span class="who">👤 {{ adminName }}</span>
        <button class="logout" @click="logout">退出登录</button>
      </div>
    </header>

    <main class="content">
      <section class="panel">
        <h2>👥 用户管理</h2>
        <p class="desc">
          查看并管理仙钓大陆所有已注册道友：调整游戏资源（贝壳 / 金石 / 根骨 / 境界）、修改角色权限、重置密码或删除账号。
        </p>

        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="search">
            <input v-model="keyword" @keyup.enter="onSearch" placeholder="搜索用户名 / 邮箱" />
            <button class="btn-search" @click="onSearch">🔍 搜索</button>
          </div>
          <select v-model="permissionFilter" @change="onFilterChange" class="role-select">
            <option value="">全部角色</option>
            <option value="0">管理员</option>
            <option value="1">普通玩家</option>
          </select>
          <button class="btn-create" @click="openCreate">➕ 新建用户</button>
          <button class="btn-refresh" @click="loadUsers">↻ 刷新</button>
        </div>

        <!-- 表格 -->
        <div class="table-wrap">
          <table class="utable">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>贝壳 🐚</th>
                <th>根骨 💪</th>
                <th>金石 🪙</th>
                <th>境界</th>
                <th>注册时间</th>
                <th class="op">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in list" :key="u.id">
                <td>{{ u.id }}</td>
                <td class="uname">{{ u.username }}</td>
                <td class="email">{{ u.email }}</td>
                <td>
                  <span class="role" :class="u.permission === 0 ? 'role-admin' : 'role-user'">
                    {{ roleLabel(u.permission) }}
                  </span>
                </td>
                <td>{{ u.shells }}</td>
                <td>{{ u.strength }}</td>
                <td>{{ u.goldStones }}</td>
                <td>{{ u.powerRealm }} 重天</td>
                <td class="time">{{ formatTime(u.createTime) }}</td>
                <td class="op">
                  <button class="link" @click="openEdit(u)">编辑</button>
                  <button class="link" @click="openReset(u)">重置密码</button>
                  <button class="link danger" @click="openDelete(u)">删除</button>
                </td>
              </tr>
              <tr v-if="!loading && list.length === 0">
                <td colspan="10" class="empty">仙门名录上还没有这样的道友 🌫️</td>
              </tr>
            </tbody>
          </table>
          <div v-if="loading" class="loading">加载中…</div>
        </div>

        <!-- 分页 -->
        <div class="pager" v-if="total > 0">
          <button :disabled="page <= 1" @click="changePage(-1)">上一页</button>
          <span>第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 人</span>
          <button :disabled="page >= totalPages" @click="changePage(1)">下一页</button>
        </div>
      </section>
    </main>

    <!-- 编辑弹窗 -->
    <div class="modal" v-if="showEdit" @click.self="showEdit = false">
      <div class="modal-card">
        <h3>✏️ 编辑用户 · {{ editForm.username }}</h3>
        <div class="form-grid">
          <label>邮箱</label>
          <input v-model="editForm.email" type="email" />
          <label>贝壳 🐚</label>
          <input v-model.number="editForm.shells" type="number" min="0" />
          <label>根骨 💪</label>
          <input v-model.number="editForm.strength" type="number" min="0" />
          <label>金石 🪙</label>
          <input v-model.number="editForm.goldStones" type="number" min="0" />
          <label>钓道境界</label>
          <input v-model.number="editForm.powerRealm" type="number" min="1" max="999" />
          <label>角色</label>
          <select v-model.number="editForm.permission">
            <option :value="1">普通玩家</option>
            <option :value="0">管理员</option>
          </select>
        </div>
        <p v-if="editMsg" class="modal-msg">{{ editMsg }}</p>
        <div class="modal-actions">
          <button class="save" @click="submitEdit">保存</button>
          <button class="cancel" @click="showEdit = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 重置密码弹窗 -->
    <div class="modal" v-if="showReset" @click.self="showReset = false">
      <div class="modal-card">
        <h3>🔑 重置密码 · {{ resetTarget && resetTarget.username }}</h3>
        <p class="desc">为该用户设置一个新密码（至少 6 位），重置后旧密码失效。</p>
        <input v-model="resetPwd" type="password" placeholder="请输入新密码（≥6 位）" />
        <p v-if="resetMsg" class="modal-msg">{{ resetMsg }}</p>
        <div class="modal-actions">
          <button class="save" @click="submitReset">确认重置</button>
          <button class="cancel" @click="showReset = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div class="modal" v-if="showDelete" @click.self="showDelete = false">
      <div class="modal-card">
        <h3>⚠️ 删除用户</h3>
        <p class="desc">
          确定要删除用户 <b>{{ deleteTarget && deleteTarget.username }}</b> 吗？该操作不可恢复，其背包数据不受影响但账号将无法登录。
        </p>
        <div class="modal-actions">
          <button class="danger-btn" @click="submitDelete">确认删除</button>
          <button class="cancel" @click="showDelete = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 新建用户弹窗 -->
    <div class="modal" v-if="showCreate" @click.self="showCreate = false">
      <div class="modal-card">
        <h3>➕ 新建用户</h3>
        <div class="form-grid">
          <label>用户名</label>
          <input v-model="createForm.username" placeholder="登录用户名" />
          <label>邮箱</label>
          <input v-model="createForm.email" type="email" placeholder="邮箱" />
          <label>初始密码</label>
          <input v-model="createForm.password" type="password" placeholder="至少 6 位" />
          <label>角色</label>
          <select v-model.number="createForm.permission">
            <option :value="1">普通玩家</option>
            <option :value="0">管理员</option>
          </select>
          <label>贝壳 🐚</label>
          <input v-model.number="createForm.shells" type="number" min="0" />
          <label>根骨 💪</label>
          <input v-model.number="createForm.strength" type="number" min="0" />
          <label>金石 🪙</label>
          <input v-model.number="createForm.goldStones" type="number" min="0" />
          <label>钓道境界</label>
          <input v-model.number="createForm.powerRealm" type="number" min="1" max="999" />
        </div>
        <p v-if="createMsg" class="modal-msg">{{ createMsg }}</p>
        <div class="modal-actions">
          <button class="save" @click="submitCreate">创建</button>
          <button class="cancel" @click="showCreate = false">取消</button>
        </div>
      </div>
    </div>

    <div class="toast" v-if="toastVisible">{{ toast }}</div>
  </div>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  background: linear-gradient(160deg, #04203c 0%, #072c4f 45%, #04131f 100%);
  color: #eaf6ff;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px;
  background: rgba(2, 30, 56, 0.9);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
}
.brand {
  font-weight: bold;
  font-size: 18px;
  color: #ffd54f;
  letter-spacing: 1px;
}
.nav {
  display: flex;
  gap: 6px;
}
.nav a {
  color: #cdeffd;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 14px;
  border-radius: 10px;
  transition: background 0.15s, color 0.15s;
}
.nav a:hover {
  background: rgba(41, 182, 246, 0.18);
}
.nav a.active {
  background: #ffd54f;
  color: #043a2a;
  font-weight: bold;
}
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.who {
  color: #cdeffd;
  font-size: 14px;
}
.logout {
  background: #ff6b6b;
  border: none;
  color: #fff;
  padding: 6px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
}
.logout:hover {
  background: #ff5252;
}
.content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 26px 18px 60px;
}
.panel {
  background: rgba(255, 255, 255, 0.97);
  color: #263238;
  border-radius: 18px;
  padding: 20px 22px;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35);
}
.panel h2 {
  font-size: 19px;
  margin: 0 0 6px;
  color: #0d3b66;
}
.desc {
  font-size: 13px;
  color: #607d8b;
  margin: 0 0 16px;
  line-height: 1.6;
}
.desc b {
  color: #ff8f00;
}

/* 工具栏 */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}
.search {
  display: flex;
  flex: 1;
  min-width: 240px;
}
.search input {
  flex: 1;
  padding: 9px 12px;
  border: 1.5px solid #cfd8dc;
  border-right: none;
  border-radius: 10px 0 0 10px;
  font-size: 14px;
  outline: none;
}
.btn-search {
  padding: 9px 14px;
  border: 1.5px solid #29b6f6;
  border-radius: 0 10px 10px 0;
  background: #29b6f6;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}
.role-select,
.btn-create,
.btn-refresh {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1.5px solid #cfd8dc;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
}
.btn-create {
  border: none;
  font-weight: bold;
  color: #4e2600;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
}
.btn-refresh {
  color: #37474f;
  background: #eceff1;
}
.btn-create:hover {
  filter: brightness(1.03);
}
.btn-refresh:hover {
  background: #e0e4e7;
}

/* 表格 */
.table-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid #e1edf5;
}
.utable {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 760px;
}
.utable thead th {
  background: #0d3b66;
  color: #fff;
  padding: 11px 10px;
  text-align: left;
  font-weight: bold;
  white-space: nowrap;
}
.utable tbody td {
  padding: 10px;
  border-bottom: 1px solid #eef3f7;
  white-space: nowrap;
}
.utable tbody tr:hover {
  background: #f3f8fc;
}
.uname {
  font-weight: bold;
  color: #0d3b66;
}
.email {
  color: #546e7a;
}
.time {
  color: #78909c;
  font-size: 12px;
}
.role {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
}
.role-admin {
  background: #e64a19;
}
.role-user {
  background: #546e7a;
}
.op {
  text-align: center;
}
.link {
  background: none;
  border: none;
  color: #1565c0;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  font-weight: bold;
}
.link:hover {
  text-decoration: underline;
}
.link.danger {
  color: #d32f2f;
}
.empty {
  text-align: center;
  padding: 28px;
  color: #90a4ae;
}
.loading {
  padding: 14px;
  text-align: center;
  color: #607d8b;
}

/* 分页 */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 16px;
  color: #37474f;
  font-size: 14px;
}
.pager button {
  padding: 8px 16px;
  border: 1.5px solid #cfd8dc;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-weight: bold;
}
.pager button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 弹窗 */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(2, 20, 40, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}
.modal-card {
  width: min(440px, 100%);
  background: #fff;
  border-radius: 18px;
  padding: 22px 24px;
  color: #263238;
  box-shadow: 0 26px 60px rgba(0, 0, 0, 0.5);
}
.modal-card h3 {
  margin: 0 0 12px;
  color: #0d3b66;
  font-size: 18px;
}
.modal-card input,
.modal-card select {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #cfd8dc;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 6px;
}
.modal-card input:focus,
.modal-card select:focus {
  border-color: #29b6f6;
}
.form-grid {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px 12px;
  align-items: center;
  margin-bottom: 8px;
}
.form-grid label {
  font-size: 13px;
  font-weight: bold;
  color: #37474f;
}
.form-grid input,
.form-grid select {
  margin-bottom: 0;
}
.modal-msg {
  font-size: 13px;
  font-weight: bold;
  color: #1565c0;
  margin: 10px 0 0;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}
.save {
  padding: 10px 22px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: bold;
  color: #4e2600;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
  cursor: pointer;
}
.cancel {
  padding: 10px 20px;
  border: 1.5px solid #cfd8dc;
  border-radius: 12px;
  font-size: 15px;
  font-weight: bold;
  color: #37474f;
  background: #eceff1;
  cursor: pointer;
}
.danger-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  background: #e53935;
  cursor: pointer;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%);
  background: rgba(2, 30, 56, 0.95);
  color: #fff;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: bold;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  z-index: 60;
}
</style>
