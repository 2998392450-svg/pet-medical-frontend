import axios from 'axios'
import { getMerchantToken, clearMerchantSession } from '../utils/merchantSession'

// 后端返回 snake_case，前端使用 camelCase。统一转换避免每个页面手动映射。
function toCamelCase(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(toCamelCase)
  const result = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      result[camelKey] = toCamelCase(obj[key])
    }
  }
  return result
}

// 生产环境必须由 Vercel 注入 VITE_API_URL；localhost 仅作为本地开发回退
const ENV_API_URL = import.meta.env.VITE_API_URL
const baseURL = ENV_API_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '')
if (!baseURL) {
  throw new Error('缺少 VITE_API_URL：生产构建必须在部署平台配置后端 API 地址（如 https://xxx.onrender.com/api）')
}

const instance = axios.create({
  baseURL,         // 所有请求自动拼上此前缀
  timeout: 5000    // 5秒超时
})

// ==================== 凭证区域 ====================
// 三种角色使用各自独立的 storage key：
// 用户 token / 商家 merchantToken / 管理员 adminToken
// 请求拦截器按「当前所在区域」取对应 token，避免管理员页刷新后只读到空的用户 token
function getCurrentArea() {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/merchant')) return 'merchant'
  return 'user'
}

// 读取区域内 token；把 "null" / "undefined" / 空白 这类脏值当作没有 token，
// 避免发出 "Bearer null" 这种必然 401 的请求（真实浏览器里见过旧脏值残留）
function readToken(key) {
  const raw = localStorage.getItem(key)
  if (!raw) return ''
  const v = String(raw).trim()
  if (!v || /^(null|undefined)$/i.test(v)) return ''
  return v
}

function getAreaToken(area) {
  if (area === 'admin') return readToken('adminToken')
  // 商家 token 取本标签页固定的会话，避免被同浏览器另一个窗口登录的其他医院覆盖
  if (area === 'merchant') return String(getMerchantToken() || '').trim()
  return readToken('token')
}

// 判断请求头是否为空/无效（如 'Bearer null'、'Bearer undefined'）
function isEmptyAuthHeader(header) {
  if (!header) return true
  return /^Bearer\s*(null|undefined)?$/i.test(String(header).trim())
}

// ==================== 提交前文本清洗 ====================
// 统一去掉字符串首尾空白（半角/全角空格、Tab、NBSP），和后端保持一致；
// 密码字段不做处理，FormData/文件等非 JSON 数据直接跳过
const LEAD_WS = /^[\s\u00A0\u3000]+/
const TRAIL_WS = /[\s\u00A0\u3000]+$/

function trimPayload(value, key) {
  if (typeof value === 'string') {
    return key && /password/i.test(key) ? value : value.replace(LEAD_WS, '').replace(TRAIL_WS, '')
  }
  if (Array.isArray(value)) return value.map(v => trimPayload(v))
  if (!value || typeof value !== 'object') return value
  if (value instanceof FormData || value instanceof Blob || value instanceof Date || value instanceof URLSearchParams) return value
  const out = {}
  for (const k in value) {
    if (Object.prototype.hasOwnProperty.call(value, k)) out[k] = trimPayload(value[k], k)
  }
  return out
}

// ==================== 请求拦截器 ====================
// 作用：每个请求发送前，按当前区域自动注入对应角色的 JWT token
// 显式传入的有效 Authorization 优先（如商家/管理页手动带的 token）
instance.interceptors.request.use(
  config => {
    // JSON 请求体先 trim，避免脏值写库
    if (config.data && typeof config.data === 'object' &&
      !(config.data instanceof FormData) && !(config.data instanceof Blob) && !(config.data instanceof URLSearchParams)) {
      config.data = trimPayload(config.data)
    }
    const currentAuth = config.headers && (config.headers.Authorization || config.headers.authorization)
    if (isEmptyAuthHeader(currentAuth)) {
      const token = getAreaToken(getCurrentArea())
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// ==================== 响应拦截器 ====================
// 作用：统一处理后端返回的 {code, message, data} 格式
// 功能1：将后端snake_case转前端camelCase
// 功能2：401时区分用户端/商家端，分别清token并跳转登录页
instance.interceptors.response.use(
  response => {
    const res = response.data
    if (res && typeof res === 'object' && res.data !== undefined && res.data !== null) {
      res.data = toCamelCase(res.data)  // snake_case → camelCase
    }
    return res
  },
  error => {
    // 离线模式：后端不可用时静默处理（走localStorage兜底）
    if (!error.response) {
      return Promise.reject(error)
    }
    // 401：token过期或无效，只清理「发起该请求的角色」的凭证，不影响其他角色
    if (error.response.status === 401) {
      const reqHeaders = error.config?.headers || {}
      // AxiosHeaders 实例要用 get() 读，普通对象直接取属性
      const authHeader = typeof reqHeaders.get === 'function'
        ? (reqHeaders.get('Authorization') || reqHeaders.get('authorization') || '')
        : (reqHeaders.Authorization || reqHeaders.authorization || '')
      // 离线 mock token 不是真实 JWT：不清除登录态、不跳登录，交给页面 localStorage 兜底
      if (String(authHeader).includes('mock-token-')) {
        return Promise.reject(error)
      }
      // 本次请求根本没带凭证：与当前登录态无关，不清任何角色的 token（否则会误踢登录）
      if (!authHeader) {
        return Promise.reject(error)
      }

      const adminToken = readToken('adminToken')
      const merchantToken = String(getMerchantToken() || '').trim()
      const userToken = readToken('token')
      const sentToken = String(authHeader).replace(/^Bearer\s+/i, '').trim()

      // 只有「请求头里的 token 与当前存储的 token 完全一致」才允许清理该角色凭证。
      // 多标签页切号时，飞行中的旧请求可能带着上一轮的 token 返回 401，
      // 若按区域兜底清理，会把刚登录的新凭证一并删掉，表现为“一动就掉登录”。
      let role = null
      if (adminToken && sentToken === adminToken) role = 'admin'
      else if (merchantToken && sentToken === merchantToken) role = 'merchant'
      else if (userToken && sentToken === userToken) role = 'user'

      // 带的是旧凭证/未知凭证：不清理、不跳转，直接抛出交给页面处理
      if (!role) {
        return Promise.reject(error)
      }

      const path = window.location.pathname
      if (role === 'admin') {
        // 管理员token过期：只清管理员凭证，且仅在管理员区域才跳登录
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        if (path.startsWith('/admin')) {
          window.location.href = '/login'
        }
      } else if (role === 'merchant') {
        // 商家token过期：只清本标签页的商家会话，且仅在商家区域才跳登录
        clearMerchantSession(sentToken)
        if (path.startsWith('/merchant') && !path.startsWith('/merchant/login')) {
          window.location.href = '/merchant/login'
        }
      } else {
        // 用户token过期：只清用户凭证，且仅在用户区域才跳登录
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (!path.startsWith('/merchant') && !path.startsWith('/admin')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default instance
