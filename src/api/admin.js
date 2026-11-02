/**
 * 后台用户管理接口封装
 * ---------------------------------------------------------------
 * 默认走离线本地引擎（localEngine.js），可通过 ?api=server 切到真实后端。
 * 本地引擎与后端接口契约完全一致（见 localEngine.js / AdminUserController）。
 */
import { request, get } from './http'

/** 用户列表（关键词 / 角色 / 分页）：GET /api/admin/users */
export function listUsers(params = {}) {
  const qs = new URLSearchParams()
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.permission !== '' && params.permission != null) qs.set('permission', params.permission)
  if (params.page) qs.set('page', params.page)
  if (params.pageSize) qs.set('pageSize', params.pageSize)
  const q = qs.toString()
  return get('/api/admin/users' + (q ? '?' + q : ''))
}

/** 用户详情：GET /api/admin/users/detail?id= */
export function getUserDetail(id) {
  return get('/api/admin/users/detail?id=' + id)
}

/** 新建用户：POST /api/admin/users */
export function createUser(data) {
  return request('/api/admin/users', data)
}

/** 编辑用户：POST /api/admin/users/update */
export function updateUser(data) {
  return request('/api/admin/users/update', data)
}

/** 删除用户：POST /api/admin/users/delete */
export function deleteUser(id) {
  return request('/api/admin/users/delete', { id })
}

/** 重置密码：POST /api/admin/users/reset-password */
export function resetUserPassword(id, newPassword) {
  return request('/api/admin/users/reset-password', { id, newPassword })
}
