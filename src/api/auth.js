/**
 * 认证接口封装（默认走离线本地引擎，可通过 ?api=server 切到真实后端）
 */
import { request } from './http'

/** 注册：{ username, password } -> { code, message, data }（邮箱已取消，可选） */
export function registerApi(data) {
  return request('/api/auth/register', data)
}

/** 登录：{ username, password } -> { code, message, data } */
export function loginApi(data) {
  return request('/api/auth/login', data)
}
