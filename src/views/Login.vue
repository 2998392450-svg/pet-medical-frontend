<template>
  <div class="login-container">
    <!-- ===== 左侧:可爱宠物封面 ===== -->
    <div class="cover-panel">
      <!-- 漂浮装饰元素 -->
      <div class="floating-deco">
        <span class="deco paw paw1">🐾</span>
        <span class="deco paw paw2">🐾</span>
        <span class="deco paw paw3">🐾</span>
        <span class="deco paw paw4">🐾</span>
        <span class="deco bone bone1">🦴</span>
        <span class="deco bone bone2">🦴</span>
        <span class="deco heart heart1">💙</span>
        <span class="deco heart heart2">💛</span>
        <span class="deco ball ball1">🧶</span>
        <span class="deco ball ball2">🎾</span>
      </div>

      <!-- 云朵 -->
      <div class="cloud cloud1"></div>
      <div class="cloud cloud2"></div>
      <div class="cloud cloud3"></div>

      <!-- 卡通宠物组合 -->
      <div class="pets-group">
        <!-- 猫咪 -->
        <div class="cat">
          <div class="cat-ear cat-ear-l"></div>
          <div class="cat-ear cat-ear-r"></div>
          <div class="cat-face">
            <div class="cat-eye cat-eye-l"></div>
            <div class="cat-eye cat-eye-r"></div>
            <div class="cat-nose"></div>
            <div class="cat-mouth"></div>
            <div class="cat-whisker cat-whisker-l1"></div>
            <div class="cat-whisker cat-whisker-l2"></div>
            <div class="cat-whisker cat-whisker-r1"></div>
            <div class="cat-whisker cat-whisker-r2"></div>
            <div class="cat-blush cat-blush-l"></div>
            <div class="cat-blush cat-blush-r"></div>
          </div>
        </div>

        <!-- 狗狗 -->
        <div class="dog">
          <div class="dog-ear dog-ear-l"></div>
          <div class="dog-ear dog-ear-r"></div>
          <div class="dog-face">
            <div class="dog-eye dog-eye-l"></div>
            <div class="dog-eye dog-eye-r"></div>
            <div class="dog-nose"></div>
            <div class="dog-mouth">
              <div class="dog-tongue"></div>
            </div>
            <div class="dog-blush dog-blush-l"></div>
            <div class="dog-blush dog-blush-r"></div>
          </div>
        </div>

        <!-- 小兔子 -->
        <div class="bunny">
          <div class="bunny-ear bunny-ear-l"></div>
          <div class="bunny-ear bunny-ear-r"></div>
          <div class="bunny-face">
            <div class="bunny-eye bunny-eye-l"></div>
            <div class="bunny-eye bunny-eye-r"></div>
            <div class="bunny-nose"></div>
            <div class="bunny-mouth"></div>
            <div class="bunny-blush bunny-blush-l"></div>
            <div class="bunny-blush bunny-blush-r"></div>
          </div>
        </div>
      </div>

      <!-- 草地 -->
      <div class="grass">
        <span class="grass-blade" v-for="n in 15" :key="n" :style="{ left: (n * 6.5) + '%' }"></span>
      </div>

      <!-- 标语 -->
      <div class="cover-text">
        <h1 class="cover-title">
          <span class="emoji">🐾</span>
          宠爱有加
        </h1>
        <p class="cover-subtitle">为毛孩子找到最贴心的医生</p>
        <div class="cover-tags">
          <span class="tag">🐱 猫咪专科</span>
          <span class="tag">🐶 犬科诊疗</span>
          <span class="tag">🐰 异宠关怀</span>
        </div>
      </div>
    </div>

    <!-- ===== 右侧:登录表单 ===== -->
    <div class="form-panel">
      <div class="login-card">
        <div class="card-header">
          <div class="logo-icon">🐾</div>
          <h1>宠物医疗预约系统</h1>
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

const router = useRouter()
const loginType = ref('password')
const showPwd = ref(false)
const loading = ref(false)
const countdown = ref(0)

const loginForm = reactive({
  username: '',
  password: '',
  phone: ''
})

const handleLogin = async () => {
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
    let res
    if (loginType.value === 'password') {
      res = await axios.post('/login', {
        username: loginForm.username,
        password: loginForm.password
      })
    } else {
      res = await axios.post('/login/phone', {
        phone: loginForm.phone,
        code: loginForm.code || '123456'
      })
    }

    if (res && res.code === 200) {
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      const role = res.data.user.role
      if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'merchant') {
        localStorage.setItem('merchantToken', res.data.token)
        localStorage.setItem('merchant', JSON.stringify({
          id: res.data.user.id,
          username: res.data.user.username,
          hospitalName: res.data.user.nickname,
          hospitalId: res.data.user.hospitalId,
          role: 'merchant'
        }))
        router.push('/merchant')
      } else {
        router.push('/')
      }
    } else {
      alert(res?.message || '登录失败')
    }
  } catch (error) {
    console.error('[登录] 后端不可用，尝试离线登录:', error)
    const users = JSON.parse(localStorage.getItem('mockUsers') || '[]')

    if (loginType.value === 'password') {
      const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password)
      if (user) {
        localStorage.setItem('token', 'mock-token-' + user.id)
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          nickname: user.nickname || user.username,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar
        }))
        router.push('/')
      } else {
        alert('账号或密码错误（离线模式）')
      }
    } else {
      const user = users.find(u => u.phone === loginForm.phone)
      if (user) {
        localStorage.setItem('token', 'mock-token-' + user.id)
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          nickname: user.nickname || user.username,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar
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
/* ===== 整体容器 ===== */
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  background: #fff5f8;
  font-family: 'Segoe UI', 'PingFang SC', 'Comic Sans MS', sans-serif;
  overflow: hidden;
}

/* ===== 左侧宠物封面 ===== */
.cover-panel {
  flex: 1;
  position: relative;
  background: linear-gradient(135deg, #ffd6e8 0%, #e8d6ff 50%, #d6e8ff 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* 漂浮装饰 */
.floating-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.deco {
  position: absolute;
  font-size: 28px;
  opacity: 0.85;
  animation: floatUp 8s ease-in-out infinite;
}

.paw1 { top: 15%; left: 8%; animation-delay: 0s; }
.paw2 { top: 25%; right: 12%; animation-delay: -2s; font-size: 22px; }
.paw3 { top: 50%; left: 5%; animation-delay: -4s; font-size: 24px; }
.paw4 { top: 60%; right: 8%; animation-delay: -6s; }
.bone1 { top: 35%; left: 15%; animation-delay: -1s; font-size: 24px; }
.bone2 { top: 70%; right: 15%; animation-delay: -3s; font-size: 22px; }
.heart1 { top: 20%; left: 25%; animation-delay: -5s; }
.heart2 { top: 45%; right: 25%; animation-delay: -7s; font-size: 22px; }
.ball1 { top: 10%; right: 20%; animation-delay: -2.5s; font-size: 32px; }
.ball2 { top: 55%; left: 20%; animation-delay: -4.5s; font-size: 26px; }

@keyframes floatUp {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(15deg); }
}

/* 云朵 */
.cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50px;
  filter: blur(2px);
  z-index: 1;
}

.cloud1 {
  width: 100px; height: 30px;
  top: 12%; left: 15%;
  animation: drift 20s linear infinite;
}

.cloud2 {
  width: 80px; height: 24px;
  top: 22%; right: 18%;
  animation: drift 25s linear infinite reverse;
}

.cloud3 {
  width: 120px; height: 36px;
  top: 8%; left: 50%;
  animation: drift 30s linear infinite;
}

@keyframes drift {
  0% { transform: translateX(-20px); }
  100% { transform: translateX(40px); }
}

/* 宠物组合 */
.pets-group {
  position: absolute;
  top: 32%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 30px;
  z-index: 3;
}

/* ===== 猫咪 ===== */
.cat {
  position: relative;
  width: 120px;
  height: 120px;
  animation: bob 3s ease-in-out infinite;
}

.cat-ear {
  position: absolute;
  top: -8px;
  width: 0;
  height: 0;
  border-left: 22px solid transparent;
  border-right: 22px solid transparent;
  border-bottom: 38px solid #ffaa66;
}

.cat-ear-l { left: 12px; transform: rotate(-15deg); }
.cat-ear-r { right: 12px; transform: rotate(15deg); }

.cat-face {
  position: absolute;
  top: 20px;
  left: 10px;
  width: 100px;
  height: 90px;
  background: #ffcc99;
  border-radius: 50%;
  border: 3px solid #ff9966;
  z-index: 2;
}

.cat-eye {
  position: absolute;
  top: 32px;
  width: 14px;
  height: 18px;
  background: #4a3520;
  border-radius: 50%;
  z-index: 3;
}

.cat-eye-l { left: 26px; }
.cat-eye-r { right: 26px; }

.cat-eye::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 2px;
  width: 5px;
  height: 5px;
  background: #fff;
  border-radius: 50%;
}

.cat-nose {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 7px;
  background: #ff8899;
  border-radius: 50%;
  z-index: 3;
}

.cat-mouth {
  position: absolute;
  top: 58px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 12px;
  border-bottom: 2.5px solid #aa6644;
  border-radius: 0 0 24px 24px;
  z-index: 3;
}

.cat-whisker {
  position: absolute;
  width: 18px;
  height: 1.5px;
  background: #aa6644;
  z-index: 3;
}

.cat-whisker-l1 { top: 52px; left: 0; transform: rotate(-10deg); }
.cat-whisker-l2 { top: 58px; left: 0; transform: rotate(8deg); }
.cat-whisker-r1 { top: 52px; right: 0; transform: rotate(10deg); }
.cat-whisker-r2 { top: 58px; right: 0; transform: rotate(-8deg); }

.cat-blush {
  position: absolute;
  top: 48px;
  width: 14px;
  height: 8px;
  background: rgba(255, 150, 170, 0.6);
  border-radius: 50%;
  z-index: 3;
}

.cat-blush-l { left: 10px; }
.cat-blush-r { right: 10px; }

/* ===== 狗狗 ===== */
.dog {
  position: relative;
  width: 130px;
  height: 130px;
  animation: bob 3s ease-in-out infinite;
  animation-delay: -1s;
}

.dog-ear {
  position: absolute;
  top: 18px;
  width: 30px;
  height: 55px;
  background: #b8865d;
  border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
  z-index: 1;
}

.dog-ear-l { left: 0; transform: rotate(-20deg); }
.dog-ear-r { right: 0; transform: rotate(20deg); }

.dog-face {
  position: absolute;
  top: 10px;
  left: 15px;
  width: 100px;
  height: 100px;
  background: #f4d4a8;
  border-radius: 50%;
  border: 3px solid #c89878;
  z-index: 2;
}

.dog-eye {
  position: absolute;
  top: 35px;
  width: 14px;
  height: 14px;
  background: #3a2a1a;
  border-radius: 50%;
  z-index: 3;
}

.dog-eye-l { left: 28px; }
.dog-eye-r { right: 28px; }

.dog-eye::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 4px;
  height: 4px;
  background: #fff;
  border-radius: 50%;
}

.dog-nose {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 13px;
  background: #3a2a1a;
  border-radius: 50%;
  z-index: 3;
}

.dog-mouth {
  position: absolute;
  top: 62px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 18px;
  background: #3a2a1a;
  border-radius: 0 0 30px 30px;
  z-index: 3;
  overflow: hidden;
}

.dog-tongue {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 14px;
  background: #ff8899;
  border-radius: 0 0 8px 8px;
}

.dog-blush {
  position: absolute;
  top: 50px;
  width: 14px;
  height: 8px;
  background: rgba(255, 150, 170, 0.6);
  border-radius: 50%;
  z-index: 3;
}

.dog-blush-l { left: 8px; }
.dog-blush-r { right: 8px; }

/* ===== 小兔子 ===== */
.bunny {
  position: relative;
  width: 100px;
  height: 120px;
  animation: bob 3s ease-in-out infinite;
  animation-delay: -2s;
}

.bunny-ear {
  position: absolute;
  top: -20px;
  width: 18px;
  height: 60px;
  background: #ffe0e9;
  border-radius: 50% 50% 30% 30%;
  border: 2.5px solid #ffb3c8;
  z-index: 1;
}

.bunny-ear-l { left: 28px; transform: rotate(-8deg); }
.bunny-ear-r { right: 28px; transform: rotate(8deg); }

.bunny-face {
  position: absolute;
  top: 25px;
  left: 15px;
  width: 70px;
  height: 70px;
  background: #fff;
  border-radius: 50%;
  border: 3px solid #ffb3c8;
  z-index: 2;
}

.bunny-eye {
  position: absolute;
  top: 28px;
  width: 10px;
  height: 12px;
  background: #d6608a;
  border-radius: 50%;
  z-index: 3;
}

.bunny-eye-l { left: 18px; }
.bunny-eye-r { right: 18px; }

.bunny-nose {
  position: absolute;
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 5px;
  background: #ff8899;
  border-radius: 50%;
  z-index: 3;
}

.bunny-mouth {
  position: absolute;
  top: 49px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 8px;
  border-bottom: 2px solid #d6608a;
  border-radius: 0 0 16px 16px;
  z-index: 3;
}

.bunny-blush {
  position: absolute;
  top: 42px;
  width: 10px;
  height: 6px;
  background: rgba(255, 150, 170, 0.6);
  border-radius: 50%;
  z-index: 3;
}

.bunny-blush-l { left: 5px; }
.bunny-blush-r { right: 5px; }

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

/* 草地 */
.grass {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(180deg, transparent 0%, #b3e6a8 40%, #8fd47e 100%);
  z-index: 1;
}

.grass-blade {
  position: absolute;
  bottom: 50px;
  width: 4px;
  height: 20px;
  background: #8fd47e;
  border-radius: 50% 50% 0 0;
  transform-origin: bottom;
  animation: sway 3s ease-in-out infinite;
}

@keyframes sway {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

/* 标语 */
.cover-text {
  position: relative;
  z-index: 4;
  text-align: center;
  padding: 0 40px 60px;
  color: #7a5c8a;
}

.cover-title {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 8px;
  color: #d6709f;
  text-shadow: 0 2px 8px rgba(255, 255, 255, 0.5);
}

.cover-title .emoji {
  display: inline-block;
  animation: wag 1.5s ease-in-out infinite;
}

@keyframes wag {
  0%, 100% { transform: rotate(-10deg); }
  50% { transform: rotate(10deg); }
}

.cover-subtitle {
  font-size: 16px;
  margin: 0 0 20px;
  color: #9a7caa;
  letter-spacing: 1px;
}

.cover-tags {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.cover-tags .tag {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  font-size: 13px;
  color: #7a5c8a;
  backdrop-filter: blur(4px);
}

/* ===== 右侧登录表单 ===== */
.form-panel {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff 0%, #fff5f8 100%);
  position: relative;
  overflow: hidden;
}

.form-panel::before {
  content: '';
  position: absolute;
  top: -100px;
  right: -100px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 182, 193, 0.3), transparent 70%);
  border-radius: 50%;
}

.form-panel::after {
  content: '';
  position: absolute;
  bottom: -100px;
  left: -100px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(200, 180, 255, 0.3), transparent 70%);
  border-radius: 50%;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 380px;
  max-width: 90%;
  padding: 40px 32px 32px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 20px 60px rgba(214, 112, 159, 0.15);
}

.card-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  font-size: 44px;
  display: block;
  margin-bottom: 6px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.card-header h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #d6709f;
}

.subtitle {
  font-size: 13px;
  color: #b094b8;
  margin: 0;
  letter-spacing: 1px;
}

/* Tab */
.tab-group {
  display: flex;
  gap: 0;
  background: rgba(214, 112, 159, 0.06);
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 22px;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 9px 0;
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
  box-shadow: 0 2px 8px rgba(214, 112, 159, 0.15);
}

.tab:hover:not(.active) {
  color: #d6709f;
}

/* 输入框 */
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
  border: 2px solid #ffe0ea;
  transition: all 0.3s ease;
  padding: 0 14px;
}

.input-group:focus-within {
  border-color: #ffb3c8;
  box-shadow: 0 0 0 4px rgba(255, 179, 200, 0.15);
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
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.sms-btn:hover { background: rgba(214, 112, 159, 0.2); }
.sms-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 50px;
  margin-top: 4px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(214, 112, 159, 0.35);
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(214, 112, 159, 0.45);
}

.login-btn:active { transform: translateY(0); }
.login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

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
  margin: 10px 0;
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
  padding: 7px 18px;
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

/* ===== 响应式：移动端隐藏封面 ===== */
@media (max-width: 900px) {
  .login-container { flex-direction: column; }
  .cover-panel {
    height: 220px;
    flex: none;
  }
  .pets-group {
    top: 20%;
    gap: 16px;
    transform: translateX(-50%) scale(0.7);
  }
  .cover-text { padding: 0 20px 20px; }
  .cover-title { font-size: 22px; margin-bottom: 4px; }
  .cover-subtitle { font-size: 13px; margin-bottom: 10px; }
  .cover-tags .tag { font-size: 11px; padding: 4px 10px; }
  .form-panel {
    width: 100%;
    flex: 1;
    padding: 20px;
  }
  .login-card {
    width: 100%;
    padding: 28px 24px 24px;
  }
}

@media (max-width: 480px) {
  .cover-panel { height: 180px; }
  .pets-group { transform: translateX(-50%) scale(0.55); top: 12%; }
  .grass { height: 50px; }
  .grass-blade { bottom: 30px; height: 14px; }
}
</style>
