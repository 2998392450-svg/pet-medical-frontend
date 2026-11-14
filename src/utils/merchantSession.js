// ==================== 商家会话：按标签页隔离 ====================
// localStorage 在同一浏览器的所有窗口/标签页之间共享。两个窗口分别登录不同医院时，
// 后登录的 merchantToken / merchant 会把先登录窗口的身份顶掉（表现为“切回豆悠悠却显示长宁店”）。
// 因此商家会话以 sessionStorage（标签页私有）为准；localStorage 只保留“最近一次登录”作为新标签页的默认回退。
const TAB_SESSION_KEY = 'merchantSession'
const LEGACY_TOKEN_KEY = 'merchantToken'
const LEGACY_MERCHANT_KEY = 'merchant'

// 解析 JWT payload（只解析不验签，服务端范围校验仍由后端负责）
export function parseTokenPayload(token) {
  const part = String(token || '').split('.')[1]
  if (!part) return null
  try {
    let base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) base64 += '='
    return JSON.parse(atob(base64))
  } catch (e) {
    return null
  }
}

function readTabSession() {
  try {
    const raw = sessionStorage.getItem(TAB_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (session && session.token && session.merchant) return session
  } catch (e) {
    // 数据损坏按无会话处理
  }
  return null
}

function writeTabSession(token, merchant) {
  sessionStorage.setItem(TAB_SESSION_KEY, JSON.stringify({ token, merchant }))
}

function readLegacyMerchant() {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_MERCHANT_KEY) || 'null')
  } catch (e) {
    return null
  }
}

// 登录成功：写入本标签页私有会话，同时更新“最近一次登录”旧键（供新标签页回退）
export function saveMerchantLogin(token, merchant) {
  writeTabSession(token, merchant)
  localStorage.setItem(LEGACY_TOKEN_KEY, token)
  localStorage.setItem(LEGACY_MERCHANT_KEY, JSON.stringify(merchant))
}

// 读取当前标签页的商家会话；没有私有会话时回退到最近一次登录，并立刻固化到本标签页，
// 此后其他窗口再登录也不会影响本窗口
export function getMerchantSession() {
  const tab = readTabSession()
  if (tab) return tab

  const token = localStorage.getItem(LEGACY_TOKEN_KEY) || ''
  if (!token) return null
  let merchant = readLegacyMerchant()
  if (!merchant) {
    const payload = parseTokenPayload(token)
    if (!payload || payload.role !== 'merchant') return null
    merchant = {
      id: payload.id,
      username: payload.username,
      hospitalId: payload.hospitalId || null,
      hospitalName: '',
      role: 'merchant'
    }
  }
  writeTabSession(token, merchant)
  return { token, merchant }
}

export function getMerchantToken() {
  const session = getMerchantSession()
  return session ? session.token : ''
}

// 更新本标签页的商家资料（如校正医院名）。
// 只有本标签页的 token 仍是“最近一次登录”时才同步旧键，避免把本窗口身份写到另一个窗口的凭证上
export function updateMerchantProfile(merchant) {
  const session = readTabSession()
  if (!session) return
  writeTabSession(session.token, merchant)
  if ((localStorage.getItem(LEGACY_TOKEN_KEY) || '') === session.token) {
    localStorage.setItem(LEGACY_MERCHANT_KEY, JSON.stringify(merchant))
  }
}

// 退出/凭证失效：只清理本标签页的会话；旧键仅在与本次 token 一致时清理
export function clearMerchantSession(token) {
  const session = readTabSession()
  if (session && (!token || session.token === token)) {
    sessionStorage.removeItem(TAB_SESSION_KEY)
  }
  if (token && (localStorage.getItem(LEGACY_TOKEN_KEY) || '') === token) {
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    localStorage.removeItem(LEGACY_MERCHANT_KEY)
  }
}
