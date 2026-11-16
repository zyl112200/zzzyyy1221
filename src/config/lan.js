/**
 * 局域网地址统一配置（全项目唯一真源）
 * ---------------------------------------------------------------
 * 前端代理、前端接口地址、静态服务器、后端绑定、脚本提示都从这里取值，
 * 换 IP 只改这一个文件，其他地方不用再找。
 *
 * 改动后需要：1) 重启 vite dev / 重新 build  2) 重启后端  3) 静态服务器重启
 */
export const LAN_IP = '192.168.68.9'

/** 后端（Spring Boot）端口 */
export const BACKEND_PORT = 8080

/** 后端根地址：局域网内任何设备都用它访问后端 */
export const BACKEND_ORIGIN = `http://${LAN_IP}:${BACKEND_PORT}`

/** 开发服务器端口（npm run dev） */
export const DEV_PORT = 5173

/** 在线浏览静态站点端口（npm run online / serve-lan.mjs） */
export const WEB_PORT = 8081

/** 局域网访问入口（打印提示用） */
export const LAN_WEB_URL = `http://${LAN_IP}:${WEB_PORT}`
export const LAN_DEV_URL = `http://${LAN_IP}:${DEV_PORT}`
