<template>
  <div class="pm-page merchant-login-page">
    <div class="pm-content form-section">
      <div class="login-card">
        <div class="card-header">
          <div class="logo-badge">
            <svg class="paw-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="50" cy="62" rx="28" ry="22" fill="url(#pawGradLogin)" />
              <ellipse cx="26" cy="40" rx="8" ry="11" fill="url(#pawGradLogin)" transform="rotate(-20 26 40)" />
              <ellipse cx="40" cy="28" rx="8" ry="12" fill="url(#pawGradLogin)" transform="rotate(-5 40 28)" />
              <ellipse cx="60" cy="28" rx="8" ry="12" fill="url(#pawGradLogin)" transform="rotate(5 60 28)" />
              <ellipse cx="74" cy="40" rx="8" ry="11" fill="url(#pawGradLogin)" transform="rotate(20 74 40)" />
              <defs>
                <radialGradient id="pawGradLogin" cx="40%" cy="35%">
                  <stop offset="0%" stop-color="#ffc8d8" />
                  <stop offset="60%" stop-color="#ff9ec7" />
                  <stop offset="100%" stop-color="#d6709f" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <h2>🏥 商家管理中心</h2>
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
          <div class="footer-row">
            <span class="back-link" @click="$router.push('/login')">
              ← 返回用户登录
            </span>
            <span class="register-link" @click="goRegister">
              商家入驻 →
            </span>
          </div>
        </div>

        <div class="demo-tip">
          <p>演示商家账号：merchant_cys / 123456</p>
          <p>管理员账号：admin / 123456</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'
import { saveMerchantLogin } from '@/utils/merchantSession'

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
      username: loginForm.username.trim(),
      password: loginForm.password
    })
    if (res.code === 200) {
      const { token, user, hospital_id, hospital_name } = res.data
      // hospitalId 可能来自 user.hospitalId（camelCase 转换后）或顶层 hospital_id
      const hospitalId = user.hospitalId || user.hospital_id || hospital_id || null
      // hospitalName 优先用后端返回的真实医院名，而非 user.nickname
      const hospitalName = user.hospitalName || user.hospital_name || hospital_name || user.nickname || '宠物医院'
      const merchant = {
        id: user.id,
        username: user.username,
        hospitalName: hospitalName,
        hospitalId: hospitalId,
        role: user.role
      }
      if (!hospitalId) {
        console.warn('[MerchantLogin] 警告：未获取到 hospitalId，商家端将无法查询本医院预约')
      }
      // 写入本标签页私有会话（同时更新旧键）；同浏览器其他窗口登录别的医院时不会覆盖本窗口身份
      saveMerchantLogin(token, merchant)
      console.log('[MerchantLogin] 登录成功，保存的 merchant 对象:', merchant)
      if (!hospitalId) {
        alert('警告：未获取到 hospitalId，预约和消息功能将无法使用')
      }
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
/* ===== 商家登录页：与用户登录页一致 ===== */
.merchant-login-page {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding-bottom: 40px;
}

.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
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
  font-size: 13px;
}

.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.back-link,
.register-link {
  color: #d6709f;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s;
}

.back-link:hover,
.register-link:hover {
  color: #ff5599;
}

/* 演示提示 */
.demo-tip {
  margin-top: 16px;
  padding: 10px 12px;
  background: rgba(214, 112, 159, 0.06);
  border-radius: 12px;
  text-align: center;
}

.demo-tip p {
  margin: 2px 0;
  color: #b094b8;
  font-size: 12px;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .form-section { padding: 24px 16px 32px; }
  .login-card {
    width: 100%;
    padding: 28px 22px 24px;
  }
  .footer-row {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
