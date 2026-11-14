import axios from './axios'

// 商家端请求必须显式携带 merchantToken，否则会被 axios 请求拦截器注入用户端 token
function merchantHeaders() {
  const token = localStorage.getItem('merchantToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 后端统一返回 { code, message, data }，HTTP 200 也可能是业务失败（如 404）
function unwrap(res) {
  if (res && res.code === 200) return res.data
  const err = new Error((res && res.message) || '请求失败')
  err.code = res && res.code
  throw err
}

// 把 axios 异常 / 业务异常统一成 { status, message }
export function normalizeError(error) {
  if (error && error.response) {
    const { status, data } = error.response
    return {
      status,
      message: (data && data.message) || `请求失败（HTTP ${status}）`
    }
  }
  if (error && error.code === 'ECONNABORTED') {
    return { status: 0, message: '请求超时，请确认后端服务已启动' }
  }
  return {
    status: 0,
    code: error && error.code,
    message: (error && error.message) || '网络异常，请确认后端服务已启动'
  }
}

// GET /api/medical-records/pets?keyword=
export async function searchPets(keyword) {
  try {
    const res = await axios.get('/medical-records/pets', {
      params: { keyword },
      headers: merchantHeaders()
    })
    return unwrap(res)
  } catch (error) {
    throw normalizeError(error)
  }
}

// POST /api/medical-records
// hospitalId 由后端根据商家账号推导，这里不传
export async function createMedicalRecord(payload) {
  try {
    const res = await axios.post('/medical-records', payload, {
      headers: merchantHeaders()
    })
    return unwrap(res)
  } catch (error) {
    throw normalizeError(error)
  }
}

// GET /api/medical-records/pet/:pet_uuid
// 商家访问本接口同样需要 merchantToken；用户访问走默认注入的用户 token
export async function fetchPetMedicalRecords(petUuid, isMerchant = false) {
  try {
    const res = await axios.get(`/medical-records/pet/${encodeURIComponent(petUuid)}`, {
      headers: isMerchant ? merchantHeaders() : {}
    })
    return unwrap(res)
  } catch (error) {
    throw normalizeError(error)
  }
}

// GET /api/medical-records/import-template（xlsx blob，需商家/管理员 token）
export async function downloadImportTemplate() {
  try {
    const res = await axios.get('/medical-records/import-template', {
      headers: merchantHeaders(),
      responseType: 'blob',
      timeout: 30000
    })
    return res
  } catch (error) {
    throw normalizeError(error)
  }
}

// POST /api/medical-records/import（JSON 数组，手动录入/粘贴复用同一写入逻辑）
export async function importMedicalRecordsJson(rows) {
  try {
    const res = await axios.post('/medical-records/import', rows, {
      headers: merchantHeaders(),
      timeout: 30000
    })
    return unwrap(res)
  } catch (error) {
    throw normalizeError(error)
  }
}

// POST /api/medical-records/import（multipart/form-data，字段名 file）
export async function importMedicalRecords(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await axios.post('/medical-records/import', formData, {
      headers: merchantHeaders(),
      timeout: 30000
    })
    return unwrap(res)
  } catch (error) {
    throw normalizeError(error)
  }
}
