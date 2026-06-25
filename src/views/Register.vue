<template>
  <div class="register-container">
    <div class="register-box">
      <div class="logo-section">
        <div class="logo">🐾</div>
        <h1>欢迎注册</h1>
        <p>开启您的宠物健康管理之旅</p>
      </div>

      <form class="register-form" @submit.prevent="handleRegister">
        <!-- 用户名 -->
        <div class="form-item">
          <label>用户名 <span class="required">*</span></label>
          <input
            v-model="registerForm.username"
            type="text"
            placeholder="请输入用户名"
            class="form-input"
            maxlength="50"
            autocomplete="username"
          />
        </div>

        <!-- 手机号 + 发送验证码 -->
        <div class="form-item">
          <label>手机号 <span class="required">*</span></label>
          <div class="phone-row">
            <input
              v-model="registerForm.phone"
              type="tel"
              placeholder="请输入11位手机号"
              class="form-input"
              maxlength="11"
              autocomplete="tel"
              @input="onPhoneInput"
            />
            <button
              type="button"
              class="send-code-btn"
              :disabled="!canSendCode || countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
            </button>
          </div>
        </div>

        <!-- 验证码 -->
        <div class="form-item">
          <label>验证码 <span class="required">*</span></label>
          <input
            v-model="registerForm.code"
            type="text"
            placeholder="请输入收到的6位验证码"
            class="form-input"
            maxlength="6"
            autocomplete="one-time-code"
          />
        </div>

        <!-- 密码 -->
        <div class="form-item">
          <label>密码 <span class="required">*</span></label>
          <input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            class="form-input"
            maxlength="50"
            autocomplete="new-password"
          />
        </div>

        <!-- 确认密码 -->
        <div class="form-item">
          <label>确认密码 <span class="required">*</span></label>
          <input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            class="form-input"
            maxlength="50"
            autocomplete="new-password"
          />
        </div>

        <!-- 昵称(选填) -->
        <div class="form-item">
          <label>昵称</label>
          <input
            v-model="registerForm.nickname"
            type="text"
            placeholder="选填"
            class="form-input"
            maxlength="50"
          />
        </div>

        <button type="submit" class="register-btn" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <div class="login-link">
        已有账号？
        <router-link to="/login">立即登录</router-link>
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
const countdown = ref(0)
let timer = null

// 11 位手机号校验
const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(registerForm.phone))
const canSendCode = computed(() => phoneValid.value && countdown.value === 0)

function onPhoneInput() {
  // 只保留数字,最多 11 位
  registerForm.phone = registerForm.phone.replace(/\D/g, '').slice(0, 11)
}

async function sendCode() {
  if (!canSendCode.value) return
  if (!phoneValid.value) {
    alert('请输入正确的 11 位手机号')
    return
  }
  try {
    // 调用后端发送验证码(后端存到 H2 表 verification_code)
    const res = await axios.post('/sms/send', {
      phone: registerForm.phone,
      type: 'register'
    })
    // 拦截器已经把 response.data 解出来了,直接看 code
    if (res && (res.code === 200 || res.code === 0)) {
      alert('验证码已发送(开发环境: ' + (res.data?.code || '已生成') + ')')
      startCountdown()
    } else {
      alert(res?.message || '发送失败,请重试')
    }
  } catch (err) {
    console.error('[Register] 发送验证码失败，使用离线模式:', err)
    // 离线兜底：模拟验证码发送
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
  // 前端校验
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
    // 离线兜底：存到 localStorage.mockUsers
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
.register-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  padding: 20px;
}

.register-box {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 20px;
  padding: 40px 35px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.logo-section {
  text-align: center;
  margin-bottom: 25px;
}

.logo {
  font-size: 50px;
  margin-bottom: 8px;
}

.logo-section h1 {
  color: #333;
  margin-bottom: 6px;
  font-size: 22px;
}

.logo-section p {
  color: #999;
  font-size: 13px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.required {
  color: #ff4d4f;
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: #fafafa;
  color: #333;
  transition: all 0.2s;
  /* 关键:确保输入框可以点击、可以输入 */
  pointer-events: auto !important;
  user-select: auto !important;
  -webkit-user-select: auto !important;
}

.form-input:focus {
  border-color: #4facfe;
  background: white;
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
}

.form-input::placeholder {
  color: #bbb;
}

.phone-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.phone-row .form-input {
  flex: 1;
}

.send-code-btn {
  flex-shrink: 0;
  height: 42px;
  padding: 0 14px;
  border: 1.5px solid #4facfe;
  border-radius: 8px;
  background: white;
  color: #4facfe;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.send-code-btn:hover:not(:disabled) {
  background: #4facfe;
  color: white;
}

.send-code-btn:disabled {
  background: #f5f5f5;
  border-color: #ddd;
  color: #aaa;
  cursor: not-allowed;
}

.register-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity 0.2s;
}

.register-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.register-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-link {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin-top: 18px;
}

.login-link a {
  color: #4facfe;
  text-decoration: none;
  font-weight: 500;
}
</style>
