<template>
  <div class="pm-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-nav-title">我的</span>
      </div>
    </nav>

    <div class="pm-content profile-content">
      <!-- 用户信息卡片 -->
      <div class="profile-header">
        <div class="avatar-wrap">
          <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-img" />
          <div v-else class="avatar-default">{{ avatarEmoji }}</div>
          <label class="avatar-upload-btn" title="点击修改头像">
            <input type="file" accept="image/*" @change="handleAvatarUpload" />
            📷
          </label>
        </div>
        <div class="profile-name">{{ userInfo.nickname || userInfo.username || '用户' }}</div>
        <div class="profile-account">账号：{{ userInfo.username || '-' }}</div>
      </div>

      <!-- 编辑表单 -->
      <div class="pm-section">
        <h2 class="pm-section-title">个人信息</h2>

        <div class="pm-form-group">
          <label class="pm-form-label">昵称</label>
          <input v-model="editForm.nickname" type="text" placeholder="请输入昵称" class="pm-input" />
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">手机号</label>
          <input v-model="editForm.phone" type="tel" placeholder="请输入手机号" class="pm-input" maxlength="11" />
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">性别</label>
          <div class="gender-options">
            <label :class="['gender-option', { selected: editForm.gender === 'male' }]">
              <input type="radio" v-model="editForm.gender" value="male" />
              <span>男</span>
            </label>
            <label :class="['gender-option', { selected: editForm.gender === 'female' }]">
              <input type="radio" v-model="editForm.gender" value="female" />
              <span>女</span>
            </label>
            <label :class="['gender-option', { selected: editForm.gender === '' || editForm.gender === null }]">
              <input type="radio" v-model="editForm.gender" value="" />
              <span>保密</span>
            </label>
          </div>
        </div>

        <button class="pm-btn pm-btn-block save-btn" @click="saveProfile" :disabled="saving">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </div>

      <!-- 统计信息 -->
      <div class="pm-section stats-section">
        <h2 class="pm-section-title">我的数据</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-num">{{ stats.petCount }}</div>
            <div class="stat-label">宠物</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.appointmentCount }}</div>
            <div class="stat-label">预约</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.completedCount }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </div>

      <!-- 功能入口 -->
      <div class="pm-section menu-section">
        <div class="menu-item" @click="goToAppointments">
          <span class="menu-icon">📅</span>
          <span class="menu-text">我的预约</span>
          <span class="menu-arrow">›</span>
        </div>
        <div class="menu-item" @click="goToPets">
          <span class="menu-icon">🐕</span>
          <span class="menu-text">我的宠物</span>
          <span class="menu-arrow">›</span>
        </div>
        <div class="menu-item" @click="goToHospitals">
          <span class="menu-icon">🏥</span>
          <span class="menu-text">附近医院</span>
          <span class="menu-arrow">›</span>
        </div>
      </div>

      <!-- 退出登录 -->
      <div class="pm-section">
        <button class="pm-btn pm-btn-block pm-btn-outline logout-btn" @click="handleLogout">
          退出登录
        </button>
      </div>
    </div>

    <!-- 底部导航 -->
    <div class="pm-bottom-nav">
      <div class="pm-nav-item" @click="goToHome">
        <span class="pm-nav-icon">🏠</span>
        <span>首页</span>
      </div>
      <div class="pm-nav-item" @click="goToHospitals">
        <span class="pm-nav-icon">🏥</span>
        <span>医院</span>
      </div>
      <div class="pm-nav-item" @click="goToPets">
        <span class="pm-nav-icon">🐕</span>
        <span>宠物</span>
      </div>
      <div class="pm-nav-item" @click="goToAppointments">
        <span class="pm-nav-icon">📅</span>
        <span>预约</span>
      </div>
      <div class="pm-nav-item active">
        <span class="pm-nav-icon">👤</span>
        <span>我的</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../api/axios'

const router = useRouter()
const saving = ref(false)

const userInfo = reactive({
  id: null,
  username: '',
  nickname: '',
  phone: '',
  avatar: '',
  gender: '',
  role: ''
})

const editForm = reactive({
  nickname: '',
  phone: '',
  gender: '',
  avatar: ''
})

const stats = reactive({
  petCount: 0,
  appointmentCount: 0,
  completedCount: 0
})

const avatarEmoji = computed(() => {
  if (userInfo.gender === 'female') return '👩'
  if (userInfo.gender === 'male') return '👨'
  return '👤'
})

// 头像上传（base64 压缩到 200KB 以内）
const handleAvatarUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 200
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) { height = height * maxSize / width; width = maxSize }
      } else {
        if (height > maxSize) { width = width * maxSize / height; height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      editForm.avatar = dataUrl
      userInfo.avatar = dataUrl
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

const loadUserInfo = async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (!user.id) {
    router.push('/login')
    return
  }

  // 离线用户直接用 localStorage 数据
  const token = localStorage.getItem('token') || ''
  if (token.startsWith('mock-token-')) {
    Object.assign(userInfo, user)
    Object.assign(editForm, {
      nickname: user.nickname || '',
      phone: user.phone || '',
      gender: user.gender || '',
      avatar: user.avatar || ''
    })
    loadStatsOffline(user.id)
    return
  }

  try {
    const res = await axios.get(`/user/${user.id}`)
    if (res.code === 200) {
      Object.assign(userInfo, res.data)
      Object.assign(editForm, {
        nickname: res.data.nickname || '',
        phone: res.data.phone || '',
        gender: res.data.gender || '',
        avatar: res.data.avatar || ''
      })
      // 同步到 localStorage
      localStorage.setItem('user', JSON.stringify(res.data))
    }
  } catch (error) {
    console.error('[Profile] 加载用户信息失败:', error)
    Object.assign(userInfo, user)
    Object.assign(editForm, {
      nickname: user.nickname || '',
      phone: user.phone || '',
      gender: user.gender || '',
      avatar: user.avatar || ''
    })
  }

  loadStats(user.id)
}

// 统一统计：合并数据库 + localStorage 离线预约，避免"我的预约"页有但"我的"页统计不到
const loadStats = async (userId) => {
  try {
    const [petsRes, apptsRes] = await Promise.all([
      // 身份由后端从 token 解析，不再传 userId
      axios.get('/pets').catch(() => ({ code: 500, data: [] })),
      axios.get('/appointments').catch(() => ({ code: 500, data: [] }))
    ])
    // 宠物：合并数据库 + localStorage 新增的
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    const localPets = mockPets.filter(p => String(p.userId) === String(userId))
    const allPets = [...(petsRes.data || [])]
    localPets.forEach(lp => {
      if (!allPets.some(p => String(p.id) === String(lp.id))) allPets.push(lp)
    })
    stats.petCount = allPets.length

    // 预约：合并数据库 + localStorage 离线预约（nearby 医院/mock-token 创建的）
    const mockAppts = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const localAppts = mockAppts.filter(a => String(a.userId) === String(userId))
    const allAppts = [...(apptsRes.data || [])]
    localAppts.forEach(la => {
      if (!allAppts.some(a => String(a.id) === String(la.id))) allAppts.push(la)
    })
    stats.appointmentCount = allAppts.length
    stats.completedCount = allAppts.filter(a => a.status === 'completed').length
  } catch (e) {
    console.error('[Profile] 加载统计失败:', e)
    // 兜底：至少读 localStorage
    loadStatsOffline(userId)
  }
}

// 离线用户统计
const loadStatsOffline = (userId) => {
  const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
  const mockAppts = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
  stats.petCount = mockPets.filter(p => String(p.userId) === String(userId)).length
  const userAppts = mockAppts.filter(a => String(a.userId) === String(userId))
  stats.appointmentCount = userAppts.length
  stats.completedCount = userAppts.filter(a => a.status === 'completed').length
}

const saveProfile = async () => {
  if (saving.value) return
  // 手机号格式校验
  if (editForm.phone && !/^1\d{10}$/.test(editForm.phone)) {
    alert('请输入正确的手机号（11位数字）')
    return
  }
  saving.value = true

  const token = localStorage.getItem('token') || ''
  if (token.startsWith('mock-token-')) {
    // 离线用户：直接更新 localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const updated = { ...user, nickname: editForm.nickname, phone: editForm.phone, gender: editForm.gender, avatar: editForm.avatar }
    localStorage.setItem('user', JSON.stringify(updated))
    Object.assign(userInfo, updated)
    alert('保存成功（离线模式）')
    saving.value = false
    return
  }

  try {
    const res = await axios.put(`/user/${userInfo.id}`, {
      nickname: editForm.nickname,
      phone: editForm.phone,
      gender: editForm.gender,
      avatar: editForm.avatar
    })
    if (res.code === 200) {
      Object.assign(userInfo, res.data)
      localStorage.setItem('user', JSON.stringify(res.data))
      alert('保存成功')
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    console.error('[Profile] 保存失败:', error)
    alert('保存失败，请检查网络')
  } finally {
    saving.value = false
  }
}

const handleLogout = () => {
  if (!confirm('确定要退出登录吗？')) return
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

const goToHome = () => router.push('/')
const goToHospitals = () => router.push('/hospitals')
const goToPets = () => router.push('/pets')
const goToAppointments = () => router.push('/appointments')

onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.profile-content {
  padding-bottom: 80px;
}

/* 用户信息头部卡片 */
.profile-header {
  text-align: center;
  padding: 30px 16px 20px;
  background: linear-gradient(135deg, #fff0f5 0%, #ffd6e7 100%);
  border-radius: 0 0 20px 20px;
  margin-bottom: 12px;
}

.avatar-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.avatar-img,
.avatar-default {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  background: #fff;
  border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.2);
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: #d6709f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid #fff;
  font-size: 13px;
}

.avatar-upload-btn input {
  display: none;
}

.profile-name {
  font-size: 20px;
  font-weight: 600;
  color: #4a3a4a;
  margin-bottom: 4px;
}

.profile-account {
  font-size: 13px;
  color: #b094b8;
}

/* 表单区域 */
.pm-section {
  background: #fff;
  margin: 0 12px 12px;
  border-radius: 16px;
  padding: 18px 16px;
}

.pm-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #5a4a5a;
  margin-bottom: 14px;
}

.pm-form-group {
  margin-bottom: 14px;
}

.pm-form-label {
  display: block;
  font-size: 13px;
  color: #807088;
  margin-bottom: 6px;
}

.pm-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #ffe8f0;
  border-radius: 10px;
  font-size: 14px;
  background: #fffafc;
  box-sizing: border-box;
}

.pm-input:focus {
  outline: none;
  border-color: #d6709f;
}

/* 性别选项 */
.gender-options {
  display: flex;
  gap: 10px;
}

.gender-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px;
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
  border: 1.5px solid #ffe8f0;
  font-size: 14px;
  color: #5a4a5a;
}

.gender-option.selected {
  background: rgba(214, 112, 159, 0.1);
  border-color: #d6709f;
  color: #d6709f;
  font-weight: 500;
}

.gender-option input {
  display: none;
}

.save-btn {
  margin-top: 6px;
  background: #d6709f;
  color: #fff;
}

/* 统计 */
.stats-grid {
  display: flex;
  gap: 10px;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 14px 8px;
  background: #fffafc;
  border-radius: 12px;
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #d6709f;
}

.stat-label {
  font-size: 12px;
  color: #b094b8;
  margin-top: 4px;
}

/* 菜单 */
.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 4px;
  border-bottom: 1px solid #fff0f5;
  cursor: pointer;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 20px;
  margin-right: 12px;
}

.menu-text {
  flex: 1;
  font-size: 14px;
  color: #4a3a4a;
}

.menu-arrow {
  font-size: 20px;
  color: #d6b8c8;
}

/* 退出按钮 */
.logout-btn {
  color: #ff4d6d;
  border-color: #ffd6e0;
}
</style>
