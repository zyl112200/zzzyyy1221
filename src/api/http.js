/**
 * 通用请求封装（通过 Vite 代理访问后端 http://localhost:8080）
 */

export async function request(url, body) {
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

export async function get(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('服务器开小差了，请稍后再试 🌊')
  }
  return res.json()
}
