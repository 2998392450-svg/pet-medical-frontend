<template>
  <div class="register-page">
    <!-- ===== 注册表单（居中） ===== -->
    <div class="form-section">
      <div class="register-card">
        <div class="card-header">
          <div class="logo-badge">
            <!-- 大爪子图案（与登录页保持一致） -->
            <svg class="paw-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="50" cy="62" rx="28" ry="22" fill="url(#pawGradReg)" />
              <ellipse cx="26" cy="40" rx="8" ry="11" fill="url(#pawGradReg)" transform="rotate(-20 26 40)" />
              <ellipse cx="40" cy="28" rx="8" ry="12" fill="url(#pawGradReg)" transform="rotate(-5 40 28)" />
              <ellipse cx="60" cy="28" rx="8" ry="12" fill="url(#pawGradReg)" transform="rotate(5 60 28)" />
              <ellipse cx="74" cy="40" rx="8" ry="11" fill="url(#pawGradReg)" transform="rotate(20 74 40)" />
              <defs>
                <radialGradient id="pawGradReg" cx="40%" cy="35%">
                  <stop offset="0%" stop-color="#ffc8d8" />
                  <stop offset="60%" stop-color="#ff9ec7" />
                  <stop offset="100%" stop-color="#d6709f" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <h2>欢迎注册</h2>
          <p class="subtitle">开启您的宠物健康管理之旅</p>
        </div>

        <form class="register-form" @submit.prevent="handleRegister">
          <!-- 用户名 -->
          <div class="input-group">
            <span class="input-icon">👤</span>
            <input
              v-model="registerForm.username"
              type="text"
              placeholder="请输入用户名"
              maxlength="50"
              autocomplete="username"
            />
          </div>

          <!-- 手机号 + 发送验证码 -->
          <div class="input-group phone-group">
            <span class="input-icon">📱</span>
            <input
              v-model="registerForm.phone"
              type="tel"
              placeholder="请输入11位手机号"
              maxlength="11"
              autocomplete="tel"
              @input="onPhoneInput"
            />
            <button
              type="button"
              class="sms-btn"
              :disabled="!canSendCode || countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>

          <!-- 验证码 -->
          <div class="input-group">
            <span class="input-icon">🔑</span>
            <input
              v-model="registerForm.code"
              type="text"
              placeholder="请输入6位验证码"
              maxlength="6"
              autocomplete="one-time-code"
            />
          </div>

          <!-- 密码 -->
          <div class="input-group">
            <span class="input-icon">🔒</span>
            <input
              v-model="registerForm.password"
              :type="showPwd ? 'text' : 'password'"
              placeholder="请输入密码（至少6位）"
              maxlength="50"
              autocomplete="new-password"
            />
            <span class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</span>
          </div>

          <!-- 确认密码 -->
          <div class="input-group">
            <span class="input-icon">🔒</span>
            <input
              v-model="registerForm.confirmPassword"
              :type="showConfirmPwd ? 'text' : 'password'"
              placeholder="请再次输入密码"
              maxlength="50"
              autocomplete="new-password"
            />
            <span class="pwd-toggle" @click="showConfirmPwd = !showConfirmPwd">{{ showConfirmPwd ? '🙈' : '👁️' }}</span>
          </div>

          <!-- 昵称(选填) -->
          <div class="input-group">
            <span class="input-icon">✨</span>
            <input
              v-model="registerForm.nickname"
              type="text"
              placeholder="昵称（选填）"
              maxlength="50"
            />
          </div>

          <button type="submit" class="register-btn" :disabled="loading">
            {{ loading ? '注册中...' : '注 册' }}
          </button>
        </form>

        <div class="card-footer">
          <div class="footer-row">
            已有账号？<span class="login-link" @click="$router.push('/login')">立即登录</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onUnmounted } from 'vue'
import axios from '../api/axios'
import { useRouter } from 'vue-router'

const router = useRouter()

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  code: '',
  nickname: ''
})

const loading = ref(false)
const showPwd = ref(false)
const showConfirmPwd = ref(false)
const countdown = ref(0)
let timer = null

// 11 位手机号校验
const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(registerForm.phone))
const canSendCode = computed(() => phoneValid.value && countdown.value === 0)

function onPhoneInput() {
  registerForm.phone = registerForm.phone.replace(/\D/g, '').slice(0, 11)
}

async function sendCode() {
  if (!canSendCode.value) return
  if (!phoneValid.value) {
    alert('请输入正确的 11 位手机号')
    return
  }
  try {
    const res = await axios.post('/sms/send', {
      phone: registerForm.phone,
      type: 'register'
    })
    if (res && (res.code === 200 || res.code === 0)) {
      alert('验证码已发送(开发环境: ' + (res.data?.code || '已生成') + ')')
      startCountdown()
    } else {
      alert(res?.message || '发送失败,请重试')
    }
  } catch (err) {
    console.error('[Register] 发送验证码失败，使用离线模式:', err)
    alert('验证码已发送（离线模式：123456）')
    startCountdown()
  }
}

function startCountdown() {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleRegister() {
  if (!registerForm.username.trim()) return alert('请输入用户名')
  if (!phoneValid.value) return alert('请输入正确的 11 位手机号')
  if (!/^\d{6}$/.test(registerForm.code)) return alert('请输入 6 位验证码')
  if (registerForm.password.length < 6) return alert('密码至少 6 位')
  if (registerForm.password !== registerForm.confirmPassword) return alert('两次密码不一致')

  loading.value = true
  try {
    const res = await axios.post('/register/phone', {
      username: registerForm.username,
      password: registerForm.password,
      phone: registerForm.phone,
      code: registerForm.code,
      nickname: registerForm.nickname || null
    })
    if (res && (res.code === 200 || res.code === 0)) {
      alert('注册成功，请登录')
      router.push('/login')
    } else {
      alert(res?.message || '注册失败')
    }
  } catch (err) {
    console.error('[Register] 后端不可用，使用离线注册:', err)
    const users = JSON.parse(localStorage.getItem('mockUsers') || '[]')
    if (users.some(u => u.username === registerForm.username)) {
      alert('用户名已存在')
      loading.value = false
      return
    }
    if (users.some(u => u.phone === registerForm.phone)) {
      alert('手机号已注册')
      loading.value = false
      return
    }
    const newUser = {
      id: Date.now(),
      username: registerForm.username,
      password: registerForm.password,
      phone: registerForm.phone,
      email: registerForm.phone + '@placeholder.com',
      nickname: registerForm.nickname || registerForm.username,
      avatar: null,
      createdAt: new Date().toISOString()
    }
    users.push(newUser)
    localStorage.setItem('mockUsers', JSON.stringify(users))
    alert('注册成功（离线模式），请登录')
    router.push('/login')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
/* ===== 整体页面：居中布局（与登录页保持一致） ===== */
.register-page {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff5f7 0%, #fef9f4 50%, #f5f0ff 100%);
  font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  overflow-y: auto;
  position: relative;
  padding: 20px 0;
}

/* 背景装饰光晕 */
.register-page::before {
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

.register-page::after {
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
  padding: 20px 20px;
  position: relative;
  z-index: 1;
  width: 100%;
}

.register-card {
  width: 400px;
  max-width: 100%;
  padding: 32px 32px 24px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 60px rgba(214, 112, 159, 0.12), 0 2px 10px rgba(0, 0, 0, 0.03);
}

/* 卡片头部 */
.card-header {
  text-align: center;
  margin-bottom: 22px;
}

.logo-badge {
  width: 80px;
  height: 80px;
  margin: 0 auto 10px;
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

/* 表单 */
.register-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  /* 关键:确保输入框可点击可输入 */
  pointer-events: auto !important;
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
  height: 44px;
  background: transparent;
  border: none;
  outline: none;
  color: #5a4a5a;
  font-size: 14px;
  min-width: 0;
  user-select: auto !important;
  -webkit-user-select: auto !important;
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

.sms-btn:hover:not(:disabled) { background: rgba(214, 112, 159, 0.2); }
.sms-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 注册按钮 */
.register-btn {
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

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(214, 112, 159, 0.4);
}

.register-btn:active { transform: translateY(0); }
.register-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

/* 底部 */
.card-footer {
  text-align: center;
  margin-top: 18px;
  color: #9a7caa;
  font-size: 13px;
}

.footer-row { margin-bottom: 6px; }

.login-link {
  color: #d6709f;
  cursor: pointer;
  font-weight: 600;
  margin-left: 4px;
}

.login-link:hover { color: #ff5599; }

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .form-section { padding: 16px 16px 28px; }
  .register-card {
    width: 100%;
    padding: 26px 22px 22px;
  }
}

@media (max-width: 480px) {
  .register-card { padding: 22px 18px 20px; }
  .card-header h2 { font-size: 20px; }
}
</style>
