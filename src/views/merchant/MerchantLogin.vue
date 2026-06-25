<template>
  <div class="merchant-login-container">
    <div class="bg-layer">
      <div class="gradient-orb orb1"></div>
      <div class="gradient-orb orb2"></div>
    </div>

    <div class="login-card">
      <div class="card-header">
        <div class="logo-icon">🏥</div>
        <h1>商家管理中心</h1>
        <p class="subtitle">宠物医院商家工作台</p>
      </div>

      <div class="login-form">
        <div class="input-group">
          <span class="input-icon">👤</span>
          <input
            v-model="loginForm.username"
            type="text"
            placeholder="商家账号"
          />
        </div>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input
            v-model="loginForm.password"
            :type="showPwd ? 'text' : 'password'"
            placeholder="密码"
          />
          <span class="pwd-toggle" @click="showPwd = !showPwd">
            {{ showPwd ? '🙈' : '👁️' }}
          </span>
        </div>

        <button class="login-btn" @click="handleLogin" :disabled="loading">
          {{ loading ? '登录中...' : '商家登录' }}
        </button>
      </div>

      <div class="card-footer">
        <span class="back-link" @click="$router.push('/login')">
          ← 返回用户登录
        </span>
        <span class="register-link" @click="goRegister">
          商家入驻 →
        </span>
      </div>

      <div class="demo-tip">
        <p>演示商家账号：merchant_cys / 123456</p>
        <p>管理员账号：admin / 123456</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'

const router = useRouter()
const showPwd = ref(false)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    alert('请输入账号和密码')
    return
  }

  loading.value = true
  try {
    const res = await axios.post('/merchant/login', {
      username: loginForm.username,
      password: loginForm.password
    })
    if (res.code === 200) {
      const { token, user } = res.data
      const merchant = {
        id: user.id,
        username: user.username,
        hospitalName: user.nickname || '宠物医院',
        hospitalId: user.hospitalId,
        role: user.role
      }
      localStorage.setItem('merchantToken', token)
      localStorage.setItem('merchant', JSON.stringify(merchant))
      alert('商家登录成功')
      router.push('/merchant')
    } else {
      alert(res.message || '登录失败')
    }
  } catch (error) {
    console.error('[MerchantLogin] 登录失败:', error)
    const msg = error.response && error.response.data && error.response.data.message
    alert(msg || '登录失败，请检查后端是否启动')
  } finally {
    loading.value = false
  }
}

const goRegister = () => {
  router.push('/merchant/register')
}
</script>

<style scoped>
.merchant-login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0f0c29;
  position: relative;
  overflow: hidden;
  font-family: 'Segoe UI', 'PingFang SC', Roboto, sans-serif;
}

.bg-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 0;
  pointer-events: none;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.5;
  animation: float 12s ease-in-out infinite alternate;
}

.orb1 {
  width: 500px;
  height: 500px;
  top: -150px;
  right: -100px;
  background: radial-gradient(circle, #43e97b, #38f9d7);
}

.orb2 {
  width: 450px;
  height: 450px;
  bottom: -150px;
  left: -100px;
  background: radial-gradient(circle, #4facfe, #00f2fe);
  animation-delay: -4s;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(60px, -40px) scale(1.2); }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 440px;
  max-width: 90vw;
  padding: 48px 40px 30px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
}

.card-header h1 {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  border: 1.5px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
  padding: 0 16px;
}

.input-group:focus-within {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.09);
}

.input-icon {
  font-size: 18px;
  opacity: 0.5;
  margin-right: 12px;
  flex-shrink: 0;
}

.input-group input {
  flex: 1;
  height: 52px;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 15px;
  pointer-events: auto;
  min-width: 0;
}

.input-group input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.pwd-toggle {
  font-size: 18px;
  cursor: pointer;
  opacity: 0.5;
  flex-shrink: 0;
}

.login-btn {
  width: 100%;
  height: 54px;
  margin-top: 6px;
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  border: none;
  border-radius: 16px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 30px rgba(67, 233, 123, 0.35);
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(67, 233, 123, 0.5);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.card-footer {
  text-align: center;
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-link,
.register-link {
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 13px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #fff;
}

.register-link:hover {
  color: #43e97b;
}

.demo-tip {
  margin-top: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  text-align: center;
}

.demo-tip p {
  margin: 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}
</style>
