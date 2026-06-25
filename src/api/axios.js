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
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default instance
