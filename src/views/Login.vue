<template>
  <div class="login-page">
    <!-- ===== 登录表单（居中） ===== -->
    <div class="form-section">
      <div class="login-card">
        <div class="card-header">
          <div class="logo-badge">
            <!-- 大爪子图案 -->
            <svg class="paw-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <!-- 大爪子主掌心 -->
              <ellipse cx="50" cy="62" rx="28" ry="22" fill="url(#pawGrad)" />
              <!-- 大爪子四趾（上半圈） -->
              <ellipse cx="26" cy="40" rx="8" ry="11" fill="url(#pawGrad)" transform="rotate(-20 26 40)" />
              <ellipse cx="40" cy="28" rx="8" ry="12" fill="url(#pawGrad)" transform="rotate(-5 40 28)" />
              <ellipse cx="60" cy="28" rx="8" ry="12" fill="url(#pawGrad)" transform="rotate(5 60 28)" />
              <ellipse cx="74" cy="40" rx="8" ry="11" fill="url(#pawGrad)" transform="rotate(20 74 40)" />

              <defs>
                <radialGradient id="pawGrad" cx="40%" cy="35%">
                  <stop offset="0%" stop-color="#ffc8d8" />
                  <stop offset="60%" stop-color="#ff9ec7" />
                  <stop offset="100%" stop-color="#d6709f" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <h2>宠物医疗预约系统</h2>
          <p class="subtitle">关爱宠物健康，从这里开始</p>
        </div>

        <div class="tab-group">
          <span :class="['tab', { active: loginType === 'password' }]" @click="loginType = 'password'">密码登录</span>
          <span :class="['tab', { active: loginType === 'sms' }]" @click="loginType = 'sms'">验证码登录</span>
        </div>

        <div class="login-form">
          <div class="input-group">
            <span class="input-icon">👤</span>
            <input v-model="loginForm.username" type="text" placeholder="请输入用户名或手机号" />
          </div>

          <div class="input-group" v-if="loginType === 'password'">
            <span class="input-icon">🔒</span>
            <input v-model="loginForm.password" :type="showPwd ? 'text' : 'password'" placeholder="请输入密码" />
            <span class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</span>
          </div>

          <div class="input-group" v-else>
            <span class="input-icon">📱</span>
            <input v-model="loginForm.phone" type="text" placeholder="请输入手机号" />
            <button class="sms-btn" @click="sendSms" :disabled="countdown > 0">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>

          <div class="input-group" v-if="loginType === 'sms'">
            <span class="input-icon">🔑</span>
            <input v-model="loginForm.code" type="text" placeholder="请输入验证码" maxlength="6" />
          </div>

          <button class="login-btn" @click="handleLogin" :disabled="loading">
            {{ loading ? '登录中...' : '登 录' }}
          </button>
        </div>

        <div class="card-footer">
          <div class="footer-row">
            还没有账号？<span class="register-link" @click="$router.push('/register')">立即注册</span>
          </div>
          <div class="footer-divider"><span>或</span></div>
          <div class="footer-row">
            <span class="merchant-link" @click="$router.push('/merchant/login')">🏥 商家入口</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../api/axios'
import { saveMerchantLogin } from '../utils/merchantSession'

const router = useRouter()
const loginType = ref('password')
const showPwd = ref(false)
const loading = ref(false)
const countdown = ref(0)

const loginForm = reactive({
  username: '',
  password: '',
  phone: '',
  code: ''
})

// ==================== 登录处理 ====================
// 支持两种方式：密码登录、验证码登录（演示模式验证码123456）
// 登录成功后根据role跳转：merchant→商家端，admin→管理员后台，user→首页
const handleLogin = async () => {
  // 1. 表单校验
  if (loginType.value === 'password') {
    if (!loginForm.username || !loginForm.password) {
      alert('请输入用户名和密码')
      return
    }
  } else {
    if (!loginForm.phone) {
      alert('请输入手机号')
      return
    }
  }

  loading.value = true
  try {
    // 2. 调用后端登录接口
    let res
    if (loginType.value === 'password') {
      res = await axios.post('/login', {
        username: loginForm.username,
        password: loginForm.password
      })
    } else {
      res = await axios.post('/login/phone', {
        phone: loginForm.phone,
        code: loginForm.code || '123456'  // 演示模式固定验证码
      })
    }

    // 3. 登录成功，按角色分发token并跳转
    if (res && res.code === 200) {
      const role = res.data.user.role
      if (role === 'merchant') {
        // 商家登录：只写商家自己的会话，不覆盖用户端的 token/user
        // 会话按标签页隔离（sessionStorage），避免同浏览器另一个窗口登录其他医院时互相顶掉
        const authUser = res.data.user
        // 医院范围以 token 为准：响应体缺失 hospitalId 时从 token payload 兜底解析，
        // 避免商家工作台因拿不到医院 ID 把有效登录态误判为失效而踢回登录页
        let tokenHospitalId = null
        try {
          const seg = String(res.data.token || '').split('.')[1]
          if (seg) {
            let b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
            while (b64.length % 4) b64 += '='
            tokenHospitalId = JSON.parse(atob(b64)).hospitalId || null
          }
        } catch (e) {
          tokenHospitalId = null
        }
        saveMerchantLogin(res.data.token, {
          id: authUser.id,
          username: authUser.username,
          hospitalName: authUser.hospitalName || authUser.hospital_name || authUser.nickname || '宠物医院',
          hospitalId: authUser.hospitalId || authUser.hospital_id || tokenHospitalId || null,
          role: 'merchant'
        })
        // 同步商家信息到 mockUsers，便于商家端补全离线预约的主人信息
        const onlineUser = res.data.user
        const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]')
        const idx = mockUsers.findIndex(u => String(u.id) === String(onlineUser.id))
        const userRecord = { id: onlineUser.id, username: onlineUser.username, nickname: onlineUser.nickname || onlineUser.username, phone: onlineUser.phone || '' }
        if (idx === -1) mockUsers.push(userRecord)
        else mockUsers[idx] = { ...mockUsers[idx], ...userRecord }
        localStorage.setItem('mockUsers', JSON.stringify(mockUsers))
        router.push('/merchant')
      } else {
        // 同步在线用户信息到 mockUsers，便于商家端补全离线预约的主人信息
        const onlineUser = res.data.user
        const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]')
        const idx = mockUsers.findIndex(u => String(u.id) === String(onlineUser.id))
        const userRecord = { id: onlineUser.id, username: onlineUser.username, nickname: onlineUser.nickname || onlineUser.username, phone: onlineUser.phone || '' }
        if (idx === -1) mockUsers.push(userRecord)
        else mockUsers[idx] = { ...mockUsers[idx], ...userRecord }
        localStorage.setItem('mockUsers', JSON.stringify(mockUsers))
        if (role === 'admin') {
          // 管理员使用独立凭证；不再删除用户端 token/user，
          // 否则同一浏览器里用户端下次刷新会被路由守卫判定未登录（管理员登录踢掉用户端）
          localStorage.setItem('adminToken', res.data.token)
          localStorage.setItem('adminUser', JSON.stringify(res.data.user))
          router.push('/admin')
        } else {
          // 普通用户登录：只写用户凭证，不清管理员/商家的独立凭证
          localStorage.setItem('token', res.data.token)
          localStorage.setItem('user', JSON.stringify(res.data.user))
          router.push('/')
        }
      }
    } else {
      alert(res?.message || '登录失败')
    }
  } catch (error) {
    // ==================== 离线模式兜底 ====================
    // 后端不可用时，从localStorage的mockUsers查找账号，保证页面不白屏
    console.error('[登录] 后端不可用，尝试离线登录:', error)
    const users = JSON.parse(localStorage.getItem('mockUsers') || '[]')

    if (loginType.value === 'password') {
      const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password)
      if (user) {
        // 离线模式：商家账号应走商家登录入口，这里拒绝商家账号登录用户端
        if (user.role === 'merchant') {
          alert('该账号为商家账号，请点击下方"商家入口"登录')
          return
        }
        if (user.role === 'admin') {
          // 离线管理员同样使用独立凭证
          localStorage.setItem('adminToken', 'mock-token-' + user.id)
          localStorage.setItem('adminUser', JSON.stringify({
            id: user.id,
            username: user.username,
            nickname: user.nickname || user.username,
            phone: user.phone,
            email: user.email,
            avatar: user.avatar,
            role: 'admin'
          }))
          router.push('/admin')
          return
        }
        localStorage.setItem('token', 'mock-token-' + user.id)
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          nickname: user.nickname || user.username,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar,
          role: user.role || 'user'
        }))
        router.push('/')
      } else {
        alert('账号或密码错误（离线模式）')
      }
    } else {
      const user = users.find(u => u.phone === loginForm.phone)
      if (user) {
        if (user.role === 'merchant') {
          alert('该账号为商家账号，请点击下方"商家入口"登录')
          return
        }
        if (user.role === 'admin') {
          // 离线管理员同样使用独立凭证
          localStorage.setItem('adminToken', 'mock-token-' + user.id)
          localStorage.setItem('adminUser', JSON.stringify({
            id: user.id,
            username: user.username,
            nickname: user.nickname || user.username,
            phone: user.phone,
            email: user.email,
            avatar: user.avatar,
            role: 'admin'
          }))
          router.push('/admin')
          return
        }
        localStorage.setItem('token', 'mock-token-' + user.id)
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          nickname: user.nickname || user.username,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar,
          role: user.role || 'user'
        }))
        router.push('/')
      } else {
        alert('该手机号未注册（离线模式）')
      }
    }
  } finally {
    loading.value = false
  }
}

const sendSms = () => {
  if (!loginForm.phone) {
    alert('请输入手机号')
    return
  }
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
  alert('验证码已发送（演示模式：123456）')
}
</script>

<style scoped>
/* ===== 整体页面：居中布局 ===== */
.login-page {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff5f7 0%, #fef9f4 50%, #f5f0ff 100%);
  font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  overflow-y: auto;
  position: relative;
}

/* 背景装饰光晕 */
.login-page::before {
  content: '';
  position: absolute;
  top: -150px;
  right: -150px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 200, 220, 0.4), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.login-page::after {
  content: '';
  position: absolute;
  bottom: -150px;
  left: -150px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(200, 180, 255, 0.35), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

/* ===== 表单区 ===== */
.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  z-index: 1;
  width: 100%;
}

.login-card {
  width: 400px;
  max-width: 100%;
  padding: 36px 32px 28px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 60px rgba(214, 112, 159, 0.12), 0 2px 10px rgba(0, 0, 0, 0.03);
}

/* 卡片头部 */
.card-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-badge {
  width: 96px;
  height: 96px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2.5s ease-in-out infinite;
}

.paw-logo {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 12px rgba(214, 112, 159, 0.3));
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.card-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #d6709f;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 13px;
  color: #b094b8;
  margin: 0;
  letter-spacing: 1px;
}

/* Tab 切换 */
.tab-group {
  display: flex;
  background: rgba(214, 112, 159, 0.06);
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 20px;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  color: #b094b8;
  font-size: 14px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.tab.active {
  background: #fff;
  color: #d6709f;
  box-shadow: 0 2px 8px rgba(214, 112, 159, 0.12);
}

.tab:hover:not(.active) {
  color: #d6709f;
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 14px;
  border: 2px solid #ffe8f0;
  transition: all 0.3s ease;
  padding: 0 14px;
}

.input-group:focus-within {
  border-color: #ffb3c8;
  box-shadow: 0 0 0 4px rgba(255, 179, 200, 0.12);
}

.input-icon {
  font-size: 16px;
  opacity: 0.6;
  margin-right: 10px;
  flex-shrink: 0;
}

.input-group input {
  flex: 1;
  height: 46px;
  background: transparent;
  border: none;
  outline: none;
  color: #5a4a5a;
  font-size: 14px;
  min-width: 0;
}

.input-group input::placeholder {
  color: #c8b0c0;
}

.pwd-toggle {
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
  flex-shrink: 0;
}

.pwd-toggle:hover { opacity: 1; }

.sms-btn {
  flex-shrink: 0;
  background: rgba(214, 112, 159, 0.1);
  border: none;
  color: #d6709f;
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.sms-btn:hover { background: rgba(214, 112, 159, 0.2); }
.sms-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 50px;
  margin-top: 6px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(214, 112, 159, 0.3);
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(214, 112, 159, 0.4);
}

.login-btn:active { transform: translateY(0); }
.login-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

/* 底部 */
.card-footer {
  text-align: center;
  margin-top: 20px;
  color: #9a7caa;
  font-size: 13px;
}

.footer-row { margin-bottom: 6px; }

.footer-divider {
  display: flex;
  align-items: center;
  margin: 12px 0;
  color: #c8b0c0;
  font-size: 12px;
}

.footer-divider::before,
.footer-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #ffe0ea;
}

.footer-divider span { padding: 0 12px; }

.register-link {
  color: #d6709f;
  cursor: pointer;
  font-weight: 600;
  margin-left: 4px;
}

.register-link:hover { color: #ff5599; }

.merchant-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: rgba(214, 112, 159, 0.08);
  border: 1px solid rgba(214, 112, 159, 0.2);
  border-radius: 18px;
  color: #d6709f;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.merchant-link:hover {
  background: rgba(214, 112, 159, 0.15);
  transform: translateY(-1px);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .form-section { padding: 24px 16px 32px; }
  .login-card {
    width: 100%;
    padding: 28px 22px 24px;
  }
}

@media (max-width: 480px) {
  .login-card { padding: 24px 18px 20px; }
  .card-header h2 { font-size: 20px; }
}
</style>
