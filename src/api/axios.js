import axios from 'axios'

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

// 生产环境用 Vercel 注入的 VITE_API_URL，本地开发用本地后端
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const instance = axios.create({
  baseURL,
  timeout: 5000
})

instance.interceptors.request.use(
  config => {
    // 仅在请求未显式设置 Authorization 时注入默认 token
    // 商家端请求会自带 merchantToken，不能被用户 token 覆盖
    const hasAuthHeader = config.headers && (config.headers.Authorization || config.headers.authorization)
    if (!hasAuthHeader) {
      const token = localStorage.getItem('token')
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

instance.interceptors.response.use(
  response => {
    // 后端统一返回 {code, message, data}，将 data 的 snake_case 转为 camelCase
    const res = response.data
    if (res && typeof res === 'object' && res.data !== undefined && res.data !== null) {
      res.data = toCamelCase(res.data)
    }
    return res
  },
  error => {
    // 离线模式：后端不可用时静默处理，不打红色错误日志
    if (!error.response) {
      // Network Error / ERR_CONNECTION_REFUSED / timeout
      // 静默 reject，由各页面的 catch 块走 localStorage 兜底
      return Promise.reject(error)
    }
    if (error.response.status === 401) {
      // 区分商家端和用户端 401：根据请求 header 用的哪个 token 判断
      const reqHeaders = error.config?.headers || {}
      const authHeader = reqHeaders.Authorization || reqHeaders.authorization || ''
      const isMerchantRequest = authHeader.includes('Bearer') && localStorage.getItem('merchantToken') && authHeader.includes(localStorage.getItem('merchantToken'))
      if (isMerchantRequest) {
        // 商家请求 401：只清除商家 token，不影响用户端
        localStorage.removeItem('merchantToken')
        localStorage.removeItem('merchant')
        // 只在当前是商家页面时才跳转，避免用户页面被踢
        if (window.location.pathname.startsWith('/merchant')) {
          window.location.href = '/merchant/login'
        }
      } else {
        // 用户请求 401：清除用户 token
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // 只在当前是用户页面时才跳转，避免商家页面被踢
        if (!window.location.pathname.startsWith('/merchant')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default instance
