<template>
  <div class="pm-page merchant-register-page">
    <div class="pm-content register-content">
      <div class="register-card">
        <div class="card-header">
          <div class="logo-badge">
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
          <h2>🏪 商家入驻申请</h2>
          <p class="subtitle">提交后将由管理员审核</p>
        </div>

      <!-- 步骤指示器 -->
      <div class="step-indicator">
        <div :class="['step', step >= 1 ? 'active' : '']">1. 医院信息</div>
        <div class="step-line"></div>
        <div :class="['step', step >= 2 ? 'active' : '']">2. 营业执照</div>
        <div class="step-line"></div>
        <div :class="['step', step >= 3 ? 'active' : '']">3. 账号设置</div>
      </div>

      <!-- 步骤1: 医院信息 -->
      <div v-if="step === 1" class="form-section">
        <div class="form-title">🏥 医院基本信息</div>

        <div class="input-group">
          <span class="input-icon">🏥</span>
          <input v-model="form.hospitalName" type="text" placeholder="医院名称（如：上海XX宠物医院）" />
          <button v-if="form.hospitalName" class="auth-btn" @click="autoAuth" :disabled="authLoading">
            {{ authLoading ? '认证中...' : '🔍 自动认证' }}
          </button>
        </div>

        <!-- 自动认证结果提示 -->
        <div v-if="authResult" class="auth-result" :class="authResult.matched ? 'matched' : 'unmatched'">
          <span v-if="authResult.matched">
            ✅ 匹配成功：{{ authResult.hospital.name }}
            <br /><span class="auth-address">地址：{{ authResult.hospital.address }}</span>
          </span>
          <span v-else>
            ⚠️ 未匹配到同名医院，将走人工审核流程
          </span>
        </div>

        <div class="input-group">
          <span class="input-icon">📍</span>
          <input v-model="form.address" type="text" placeholder="医院详细地址" />
        </div>

        <div class="input-group">
          <span class="input-icon">📞</span>
          <input v-model="form.phone" type="text" placeholder="医院电话" />
        </div>

        <div class="input-group">
          <span class="input-icon">👤</span>
          <input v-model="form.contactName" type="text" placeholder="联系人姓名" />
        </div>

        <div class="input-group">
          <span class="input-icon">📱</span>
          <input v-model="form.contactPhone" type="text" placeholder="联系人手机号" />
        </div>

        <div class="input-group textarea-group">
          <span class="input-icon">📝</span>
          <textarea v-model="form.description" placeholder="医院简介（选填）" rows="3"></textarea>
        </div>

        <button class="next-btn" @click="nextStep(1)" :disabled="!form.hospitalName || !form.address || !form.phone">
          下一步 →
        </button>
      </div>

      <!-- 步骤2: 营业执照 -->
      <div v-if="step === 2" class="form-section">
        <div class="form-title">📄 资质上传（选填，加速审核）</div>

        <div class="upload-area">
          <label class="upload-label">🏥 医院营业执照</label>
          <div class="upload-box" @click="triggerUpload('license')">
            <img v-if="form.licenseUrl" :src="form.licenseUrl" class="preview-img" />
            <div v-else class="upload-placeholder">
              <span class="upload-icon">📄</span>
              <p>点击上传营业执照</p>
              <p class="upload-tip">支持 jpg/png，小于 500KB</p>
            </div>
          </div>
          <button v-if="form.licenseUrl" class="clear-btn" @click="form.licenseUrl = ''">清除</button>
        </div>

        <div class="upload-area">
          <label class="upload-label">👨‍⚕️ 医生执照（选填）</label>
          <div class="upload-box" @click="triggerUpload('doctorLicense')">
            <img v-if="form.doctorLicenseUrl" :src="form.doctorLicenseUrl" class="preview-img" />
            <div v-else class="upload-placeholder">
              <span class="upload-icon">👨‍⚕️</span>
              <p>点击上传医生执照</p>
              <p class="upload-tip">执业兽医资格证</p>
            </div>
          </div>
          <button v-if="form.doctorLicenseUrl" class="clear-btn" @click="form.doctorLicenseUrl = ''">清除</button>
        </div>

        <div class="step-buttons">
          <button class="prev-btn" @click="step = 1">← 上一步</button>
          <button class="next-btn" @click="nextStep(2)">下一步 →</button>
        </div>
      </div>

      <!-- 步骤3: 账号设置 -->
      <div v-if="step === 3" class="form-section">
        <div class="form-title">🔐 商家登录账号设置</div>

        <div class="input-group">
          <span class="input-icon">👤</span>
          <input v-model="form.username" type="text" placeholder="登录账号（字母/数字）" @blur="checkUsername" />
          <span v-if="usernameCheck.available === true" class="check-icon ok">✓</span>
          <span v-if="usernameCheck.available === false" class="check-icon no">✗</span>
        </div>
        <p v-if="usernameCheck.available === false" class="check-tip error">用户名已被占用</p>
        <p v-if="usernameCheck.available === true" class="check-tip ok">用户名可用</p>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input v-model="form.password" :type="showPwd ? 'text' : 'password'" placeholder="登录密码" />
          <span class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</span>
        </div>

        <div class="input-group">
          <span class="input-icon">🔒</span>
          <input v-model="form.confirmPassword" :type="showPwd ? 'text' : 'password'" placeholder="确认密码" />
        </div>
        <p v-if="form.password && form.confirmPassword && form.password !== form.confirmPassword" class="check-tip error">两次密码不一致</p>

        <div class="agreement">
          <input type="checkbox" v-model="agreed" id="agree" />
          <label for="agree">我已阅读并同意</label>
          <span class="agreement-link" @click="showAgreement = true">《商家入驻协议》</span>
        </div>

        <div class="step-buttons">
          <button class="prev-btn" @click="step = 2">← 上一步</button>
          <button class="submit-btn" @click="submit" :disabled="submitting || !canSubmit">
            {{ submitting ? '提交中...' : '✓ 提交申请' }}
          </button>
        </div>
      </div>

      <!-- 提交成功页 -->
      <div v-if="step === 4" class="success-section">
        <div class="success-icon">🎉</div>
        <h2>申请提交成功！</h2>
        <p class="success-msg">{{ successMsg }}</p>
        <div class="review-notice">
          <p class="notice-title">📋 接下来：</p>
          <p>1. 管理员将审核您的入驻申请</p>
          <p>2. 审核通过后，系统会自动创建您的商家账号</p>
          <p>3. 届时您可以使用刚设置的账号密码登录</p>
          <p class="notice-tip">⚠️ 审核通过前，您的账号还无法登录</p>
        </div>
        <div class="success-actions">
          <button class="action-btn primary" @click="$router.push('/merchant/login')">去登录页等待</button>
          <button class="action-btn" @click="$router.push('/login')">返回首页</button>
        </div>
      </div>

      <div class="card-footer" v-if="step < 4">
        <span class="back-link" @click="$router.push('/merchant/login')">← 返回商家登录</span>
      </div>
      </div>
    </div>

    <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="handleFile" />

    <!-- 商家入驻协议弹窗 -->
    <div v-if="showAgreement" class="pm-modal-mask" @click.self="showAgreement = false">
      <div class="agreement-modal">
        <div class="agreement-header">
          <h3>商家入驻协议</h3>
          <button class="close-btn" @click="showAgreement = false">✕</button>
        </div>
        <div class="agreement-body">
          <p class="agreement-updated">更新日期：2026年6月25日</p>

          <h4>一、服务说明</h4>
          <p>本协议是您（"商家"或"乙方"）与宠物医疗预约系统（"平台"或"甲方"）之间就商家入驻、使用平台服务所订立的协议。通过提交入驻申请，即表示您已阅读、理解并接受本协议的全部条款。</p>

          <h4>二、商家入驻条件</h4>
          <p>1. 商家须为合法注册的宠物医疗机构，具备有效的《动物诊疗许可证》及《营业执照》。</p>
          <p>2. 商家须保证提交的机构信息、联系方式、资质证书等材料真实、准确、完整。</p>
          <p>3. 商家入驻需经平台管理员审核通过后方可正式上线。</p>
          <p>4. 平台有权对商家提交的资料进行核实，并保留拒绝入驻申请的权利。</p>

          <h4>三、商家权利与义务</h4>
          <p>1. 商家有权通过平台发布医院信息、医生排班、管理预约订单。</p>
          <p>2. 商家须保证所提供的宠物医疗服务符合相关法律法规及行业标准。</p>
          <p>3. 商家须及时处理用户预约，包括确认、改期、取消等操作，不得无故拒绝用户预约。</p>
          <p>4. 商家须对用户宠物信息、联系方式等隐私数据严格保密，不得泄露或用于平台服务以外的用途。</p>
          <p>5. 商家须按平台要求维护医院信息、医生排班的准确性，及时更新变更内容。</p>
          <p>6. 如发生医疗纠纷，商家应积极与用户协商解决，平台可提供必要的协助但不承担连带责任。</p>

          <h4>四、平台权利与义务</h4>
          <p>1. 平台为商家提供预约管理系统、医生管理、数据统计等功能服务。</p>
          <p>2. 平台有权对商家服务质量进行监督和评价，用户反馈将作为商家评级依据。</p>
          <p>3. 平台有权在以下情形下暂停或终止商家账号：</p>
          <p class="indent">（1）提交虚假资质材料；</p>
          <p class="indent">（2）多次被用户投诉且查证属实；</p>
          <p class="indent">（3）提供违法违规服务；</p>
          <p class="indent">（4）长期未登录或未处理预约订单。</p>
          <p>4. 平台不会在未通知商家的情况下擅自修改商家的医院信息或医生排班数据。</p>

          <h4>五、费用说明</h4>
          <p>1. 平台目前对商家入驻不收取注册费和年费。</p>
          <p>2. 平台保留在未来推出付费增值服务的权利，届时将提前通知商家。</p>
          <p>3. 如平台决定收取交易佣金或服务费，将提前30天公告并另行签订协议。</p>

          <h4>六、知识产权</h4>
          <p>1. 商家上传的医院Logo、营业执照、医生照片等素材，其知识产权归原权利人所有，商家须保证拥有合法使用权。</p>
          <p>2. 平台有权在平台内展示、使用商家提交的医院名称、地址、简介等信息用于推广和检索。</p>
          <p>3. 商家不得在平台发布侵犯第三方知识产权的内容。</p>

          <h4>七、数据与隐私</h4>
          <p>1. 平台收集的用户和商家数据仅用于提供本平台服务，不向第三方出售。</p>
          <p>2. 商家可通过平台后台查看与本院相关的用户预约信息，但仅限于服务目的。</p>
          <p>3. 商家账号密码由bcrypt加密存储，平台无法逆向获取明文密码。</p>

          <h4>八、免责声明</h4>
          <p>1. 因不可抗力（自然灾害、网络故障、系统维护等）导致服务中断，平台不承担责任。</p>
          <p>2. 因商家自身原因（医疗事故、服务质量等）导致的用户损失，由商家独立承担法律责任。</p>
          <p>3. 平台不对商家与用户之间的线下诊疗结果承担担保责任。</p>

          <h4>九、协议变更与终止</h4>
          <p>1. 平台有权根据业务发展需要修订本协议，修订后的协议自公布之日起生效。</p>
          <p>2. 商家可随时申请退出平台，退出后平台将下架相关医院信息。</p>
          <p>3. 商家如有严重违约行为，平台有权立即终止协议并下架相关内容。</p>

          <h4>十、争议解决</h4>
          <p>本协议的订立、效力、解释、履行及争议解决均适用中华人民共和国法律。如发生争议，双方应友好协商解决；协商不成的，任何一方可向平台所在地有管辖权的人民法院提起诉讼。</p>

          <p class="agreement-footer">如您对以上协议有任何疑问，请联系平台客服。提交入驻申请即视为您已完全接受本协议所有条款。</p>
        </div>
        <div class="agreement-footer-btn">
          <button class="modal-btn cancel" @click="showAgreement = false">关闭</button>
          <button class="modal-btn confirm" @click="agreed = true; showAgreement = false">同意并勾选</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'

const router = useRouter()
const step = ref(1)
const showPwd = ref(false)
const authLoading = ref(false)
const submitting = ref(false)
const agreed = ref(false)
const currentUploadType = ref('')
const fileInput = ref(null)
const showAgreement = ref(false)

const form = reactive({
  hospitalName: '',
  address: '',
  phone: '',
  contactName: '',
  contactPhone: '',
  description: '',
  licenseUrl: '',
  doctorLicenseUrl: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const authResult = ref(null)
const usernameCheck = reactive({ available: null, checking: false })

const canSubmit = computed(() => {
  return form.username && form.password && form.password === form.confirmPassword && agreed.value
})

// 自动认证
const autoAuth = async () => {
  if (!form.hospitalName) return
  authLoading.value = true
  try {
    const res = await axios.post('/merchant/auto-auth', { hospitalName: form.hospitalName })
    authResult.value = res.data
    if (res.data.matched) {
      // 自动填充地址和电话
      form.address = res.data.hospital.address
      form.phone = res.data.hospital.phone
    }
  } catch (error) {
    // 后端不可用时静默处理，不影响用户继续填写（走人工审核）
    console.warn('[商家注册] 自动认证服务暂不可用，可继续填写并提交人工审核')
    authResult.value = null
  } finally {
    authLoading.value = false
  }
}

// 下一步校验
const nextStep = (current) => {
  if (current === 1) {
    if (!form.hospitalName || !form.address || !form.phone) {
      alert('请填写医院名称、地址、电话')
      return
    }
    step.value = 2
  } else if (current === 2) {
    step.value = 3
  }
}

// 用户名校验
const checkUsername = async () => {
  if (!form.username) {
    usernameCheck.available = null
    return
  }
  usernameCheck.checking = true
  try {
    const res = await axios.post('/merchant/check-name', { username: form.username })
    usernameCheck.available = res.data.available
  } catch (error) {
    console.error('check-name error:', error)
    usernameCheck.available = null
  } finally {
    usernameCheck.checking = false
  }
}

// 文件上传
const triggerUpload = (type) => {
  currentUploadType.value = type
  fileInput.value.click()
}

const handleFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件')
    return
  }
  if (file.size > 500 * 1024) {
    // 压缩
    compressImage(file, (base64) => {
      if (currentUploadType.value === 'license') {
        form.licenseUrl = base64
      } else {
        form.doctorLicenseUrl = base64
      }
    })
  } else {
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (currentUploadType.value === 'license') {
        form.licenseUrl = ev.target.result
      } else {
        form.doctorLicenseUrl = ev.target.result
      }
    }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

// 压缩图片到 500KB 以内
const compressImage = (file, callback) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const maxSize = 1024
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height * maxSize) / width
          width = maxSize
        } else {
          width = (width * maxSize) / height
          height = maxSize
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      let quality = 0.7
      let result = canvas.toDataURL('image/jpeg', quality)
      // 仍然过大则继续降
      while (result.length > 500 * 1024 * 1.37 && quality > 0.3) {
        quality -= 0.1
        result = canvas.toDataURL('image/jpeg', quality)
      }
      callback(result)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// 提交申请
const successMsg = ref('')

const submit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  const payload = {
    hospitalName: form.hospitalName,
    address: form.address,
    phone: form.phone,
    description: form.description,
    licenseUrl: form.licenseUrl,
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    username: form.username.trim(),
    password: form.password,
    hospitalId: authResult.value && authResult.value.matched ? authResult.value.hospital.id : null,
    autoMatched: authResult.value && authResult.value.matched
  }
  try {
    const res = await axios.post('/merchant/register', payload)
    successMsg.value = res.message || '入驻申请已提交，请等待管理员审核'
    step.value = 4
  } catch (error) {
    console.error('submit error:', error)
    const msg = error.response && error.response.data && error.response.data.message
    if (error.response) {
      // 后端返回的业务错误（如用户名已存在）
      alert(msg || '提交失败，请稍后重试')
    } else {
      // 网络错误：离线兜底，存入 localStorage
      const apps = JSON.parse(localStorage.getItem('mockMerchantApplications') || '[]')
      apps.push({ ...payload, status: 'pending', createdAt: new Date().toISOString() })
      localStorage.setItem('mockMerchantApplications', JSON.stringify(apps))
      successMsg.value = '入驻申请已提交（离线模式）。后端服务恢复后，请重新提交一次以便管理员审核。'
      step.value = 4
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ===== 商家注册页：粉色爪子主题，保留步骤条/上传区特殊布局 ===== */
.merchant-register-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px 0 40px;
}

.register-content {
  width: 100%;
  display: flex;
  justify-content: center;
}

.register-card {
  position: relative;
  z-index: 1;
  width: 520px;
  max-width: 95vw;
  padding: 36px 32px 24px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 60px rgba(214, 112, 159, 0.15), 0 2px 10px rgba(0, 0, 0, 0.03);
  margin: 20px 0;
}

.card-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-badge {
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulseReg 2.5s ease-in-out infinite;
}

.paw-logo {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 12px rgba(214, 112, 159, 0.3));
}

@keyframes pulseReg {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.card-header h2 {
  color: #d6709f;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px 0;
  letter-spacing: 1px;
}

.subtitle {
  color: #b094b8;
  font-size: 13px;
  margin: 0;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  font-size: 12px;
  color: #c8b0c0;
}

.step {
  padding: 4px 8px;
  transition: color 0.3s;
}

.step.active {
  color: #d6709f;
  font-weight: 600;
}

.step-line {
  width: 24px;
  height: 1px;
  background: #ffd6e3;
  margin: 0 4px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-title {
  color: #5a4a5a;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ffe8f0;
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

.input-group input,
.input-group textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #5a4a5a;
  font-size: 14px;
  pointer-events: auto;
  min-width: 0;
  padding: 14px 0;
  font-family: inherit;
}

.input-group input::placeholder,
.input-group textarea::placeholder {
  color: #c8b0c0;
}

.textarea-group {
  align-items: flex-start;
}

.textarea-group .input-icon {
  margin-top: 14px;
}

.textarea-group textarea {
  resize: vertical;
  min-height: 60px;
}

.pwd-toggle,
.check-icon {
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.check-icon.ok { color: #4caf50; }
.check-icon.no { color: #ff6b6b; }

.auth-btn {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 6px 12px;
  background: rgba(214, 112, 159, 0.1);
  border: 1px solid rgba(214, 112, 159, 0.3);
  border-radius: 8px;
  color: #d6709f;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.auth-btn:hover:not(:disabled) {
  background: rgba(214, 112, 159, 0.2);
}

.auth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-result {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.auth-result.matched {
  background: rgba(76, 175, 80, 0.08);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.auth-result.unmatched {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  color: #ff9800;
}

.auth-address {
  font-size: 12px;
  opacity: 0.8;
}

.check-tip {
  font-size: 12px;
  margin: -8px 4px 4px;
}

.check-tip.ok { color: #4caf50; }
.check-tip.error { color: #ff6b6b; }

/* 上传区 */
.upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-label {
  color: #5a4a5a;
  font-size: 13px;
  font-weight: 500;
}

.upload-box {
  width: 100%;
  height: 140px;
  background: rgba(214, 112, 159, 0.03);
  border: 1.5px dashed #ffb3c8;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.upload-box:hover {
  border-color: #d6709f;
  background: rgba(214, 112, 159, 0.08);
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.upload-placeholder {
  text-align: center;
  color: #b094b8;
}

.upload-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 6px;
}

.upload-placeholder p {
  margin: 2px 0;
  font-size: 13px;
}

.upload-tip {
  font-size: 11px !important;
  opacity: 0.7;
}

.clear-btn {
  align-self: flex-start;
  padding: 4px 10px;
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 6px;
  color: #ff6b6b;
  font-size: 12px;
  cursor: pointer;
}

.agreement {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5a4a5a;
  font-size: 13px;
  padding: 4px 0;
}

.agreement input {
  cursor: pointer;
  accent-color: #d6709f;
}

.step-buttons {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.prev-btn {
  flex: 0 0 auto;
  padding: 12px 20px;
  background: rgba(214, 112, 159, 0.08);
  border: 1px solid rgba(214, 112, 159, 0.25);
  border-radius: 12px;
  color: #d6709f;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.prev-btn:hover {
  background: rgba(214, 112, 159, 0.15);
}

.next-btn,
.submit-btn {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(214, 112, 159, 0.3);
  transition: all 0.3s;
}

.next-btn:disabled,
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.next-btn:not(:disabled):hover,
.submit-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(214, 112, 159, 0.4);
}

/* 成功页 */
.success-section {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 12px;
}

.success-section h2 {
  color: #d6709f;
  font-size: 22px;
  margin: 0 0 8px;
}

.success-msg {
  color: #5a4a5a;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.6;
}

.success-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  padding: 10px 22px;
  border-radius: 10px;
  border: 1px solid rgba(214, 112, 159, 0.25);
  background: rgba(214, 112, 159, 0.08);
  color: #d6709f;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(214, 112, 159, 0.15);
}

.action-btn.primary {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  border: none;
  color: #fff;
  box-shadow: 0 6px 18px rgba(214, 112, 159, 0.35);
}

.card-footer {
  text-align: center;
  margin-top: 18px;
}

.back-link {
  color: #b094b8;
  cursor: pointer;
  font-size: 13px;
}

.back-link:hover {
  color: #d6709f;
}

/* 协议链接 */
.agreement-link {
  color: #d6709f;
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
}

.agreement-link:hover {
  color: #ff5599;
}

/* 协议弹窗（使用 pm-modal-mask） */
.agreement-modal {
  background: #fff;
  border-radius: 20px;
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(214, 112, 159, 0.2);
}

.agreement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ffe8f0;
}

.agreement-header h3 {
  font-size: 18px;
  color: #d6709f;
  margin: 0;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: rgba(214, 112, 159, 0.08);
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  color: #d6709f;
}

.close-btn:hover {
  background: rgba(214, 112, 159, 0.15);
}

.agreement-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  color: #5a4a5a;
  font-size: 14px;
  line-height: 1.7;
}

.agreement-updated {
  color: #b094b8;
  font-size: 12px;
  margin-bottom: 12px;
}

.agreement-body h4 {
  color: #d6709f;
  font-size: 15px;
  margin: 16px 0 6px;
}

.agreement-body p {
  margin: 4px 0;
}

.agreement-body p.indent {
  padding-left: 20px;
}

.agreement-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ffe8f0;
  color: #b094b8;
  font-size: 13px;
}

.agreement-footer-btn {
  padding: 14px 20px;
  border-top: 1px solid #ffe8f0;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 8px 22px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.modal-btn.cancel {
  background: rgba(214, 112, 159, 0.08);
  color: #b094b8;
}

.modal-btn.cancel:hover {
  background: rgba(214, 112, 159, 0.15);
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
  box-shadow: 0 4px 14px rgba(214, 112, 159, 0.3);
}

.modal-btn.confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(214, 112, 159, 0.4);
}

/* 成功页审核提示 */
.review-notice {
  background: rgba(214, 112, 159, 0.06);
  border: 1px solid rgba(214, 112, 159, 0.2);
  border-radius: 12px;
  padding: 14px 18px;
  margin: 16px 0 20px;
  text-align: left;
}

.review-notice p {
  color: #5a4a5a;
  font-size: 13px;
  margin: 4px 0;
}

.notice-title {
  color: #d6709f !important;
  font-weight: 600;
  margin-bottom: 8px !important;
}

.notice-tip {
  color: #ff9800 !important;
  margin-top: 8px !important;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .register-card {
    width: 100%;
    padding: 24px 18px 18px;
  }
}
</style>
