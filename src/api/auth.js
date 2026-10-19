/**
 * 认证接口封装（通过 Vite 代理访问后端 http://localhost:8080）
 */

async function request(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    throw new Error('服务器开小差了，请稍后再试 🌊')
  }
  return res.json()
}

/** 注册：{ username, email, password } -> { code, message, data } */
export function registerApi(data) {
  return request('/api/auth/register', data)
}

/** 登录：{ username, password } -> { code, message, data } */
export function loginApi(data) {
  return request('/api/auth/login', data)
}
