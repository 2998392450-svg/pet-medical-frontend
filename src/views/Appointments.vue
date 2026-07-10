<template>
  <div class="pm-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-back-btn" @click="goBack">←</span>
        <span class="pm-nav-title">我的预约</span>
      </div>
    </nav>

    <div class="pm-content appointments-content">
      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['tab-btn', { active: currentStatus === tab.value }]"
          @click="changeStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="loading" class="pm-loading">加载中...</div>

      <div v-else-if="appointments.length === 0" class="pm-empty">
        <div class="pm-empty-icon">📅</div>
        <p class="pm-empty-text">暂无预约记录</p>
        <button class="pm-btn pm-btn-sm" @click="goToHospitals">去预约</button>
      </div>

      <div v-else class="appointment-list">
        <div
          v-for="appointment in appointments"
          :key="appointment.id"
          class="pm-list-card appointment-card"
          @click="goToDetail(appointment.id)"
        >
          <div class="appointment-header">
            <span :class="['pm-status-tag', 'pm-status-' + appointment.status]">
              {{ getStatusText(appointment.status) }}
            </span>
            <span class="appointment-id">#{{ appointment.id }}</span>
          </div>

          <div class="appointment-body">
            <div class="info-row">
              <span class="label">医院</span>
              <span class="value">{{ appointment.hospitalName }}</span>
            </div>
            <div class="info-row">
              <span class="label">医生</span>
              <span class="value">{{ appointment.doctorName || '未选择' }}</span>
            </div>
            <div class="info-row">
              <span class="label">宠物</span>
              <span class="value">{{ appointment.petName }}</span>
            </div>
            <div class="info-row">
              <span class="label">时间</span>
              <span class="value">{{ appointment.appointmentTime }}</span>
            </div>
          </div>

          <div class="appointment-footer">
            <button
              v-if="appointment.status === 'pending'"
              class="pm-btn pm-btn-sm pm-btn-outline"
              @click.stop="handleCancel(appointment)"
            >
              取消预约
            </button>
            <button
              v-if="appointment.status === 'completed' && !appointment.reviewed"
              class="pm-btn pm-btn-sm"
              @click.stop="handleReview(appointment)"
            >
              评价
            </button>
            <button
              v-if="appointment.status !== 'cancelled'"
              class="pm-btn pm-btn-sm pm-btn-outline chat-btn"
              @click.stop="openChat(appointment)"
            >
              💬 沟通
              <span v-if="unreadCountOf(appointment) > 0" class="unread-badge">{{ unreadCountOf(appointment) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

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
      <div class="pm-nav-item active">
        <span class="pm-nav-icon">📅</span>
        <span>预约</span>
      </div>
      <div class="pm-nav-item" @click="goToProfile">
        <span class="pm-nav-icon">👤</span>
        <span>我的</span>
      </div>
    </div>

    <div v-if="showReviewModal" class="pm-modal-mask">
      <div class="pm-modal">
        <h3 class="pm-modal-title">评价预约</h3>

        <div class="rating-section">
          <p>评分</p>
          <div class="rating-stars">
            <span
              v-for="star in 5"
              :key="star"
              :class="['star', { active: star <= reviewForm.rating }]"
              @click="reviewForm.rating = star"
            >
              ⭐
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>评价内容</label>
          <textarea
            v-model="reviewForm.content"
            class="pm-textarea"
            placeholder="请输入评价内容"
            rows="4"
          ></textarea>
        </div>

        <div class="pm-modal-actions">
          <button class="pm-btn pm-btn-outline" @click="showReviewModal = false">取消</button>
          <button class="pm-btn" @click="submitReview" :disabled="submittingReview">
            {{ submittingReview ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 与商家沟通弹窗 -->
    <div v-if="showChatModal" class="pm-modal-mask chat-modal-overlay" @click.self="showChatModal = false">
      <div class="chat-modal">
        <div class="chat-header">
          <div class="chat-title-info">
            <span class="chat-hospital">{{ currentChat?.hospitalName || '医院' }}</span>
            <span class="chat-pet-info">宠物：{{ currentChat?.petName || '未知' }}</span>
          </div>
          <button class="chat-close" @click="showChatModal = false">✕</button>
        </div>

        <div class="chat-body" ref="chatBodyRef">
          <div v-if="!currentChat || currentChat.messages.length === 0" class="chat-empty">
            <span class="chat-empty-icon">💬</span>
            <p>暂无消息，向商家发送消息吧</p>
          </div>
          <div
            v-else
            v-for="(msg, idx) in currentChat.messages"
            :key="idx"
            :class="['chat-msg', msg.from === 'user' ? 'mine' : 'theirs']"
          >
            <div class="msg-bubble">{{ msg.content }}</div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>

        <div class="chat-input-area">
          <input
            v-model="chatInput"
            type="text"
            class="pm-input chat-input"
            placeholder="输入消息..."
            @keyup.enter="sendChatMessage"
          />
          <button class="pm-btn pm-btn-sm chat-send-btn" @click="sendChatMessage" :disabled="!chatInput.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../api/axios'

const router = useRouter()

const loading = ref(false)
const appointments = ref([])
const currentStatus = ref('all')
const showReviewModal = ref(false)
const reviewingAppointment = ref(null)
const submittingReview = ref(false)

const reviewForm = ref({
  rating: 5,
  content: ''
})

// 聊天相关
const showChatModal = ref(false)
const currentChat = ref(null)
const chatInput = ref('')
const chatBodyRef = ref(null)

const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' }
]

const getStatusText = (status) => {
  const texts = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

const loadAppointments = async () => {
  loading.value = true
  let user
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null')
  } catch (e) {
    console.error('[Appointments] user 数据损坏:', e)
    localStorage.removeItem('user')
    user = null
  }
  if (!user) {
    loading.value = false
    router.push('/login')
    return
  }

  // 离线用户（mock-token）直接读 localStorage
  const token = localStorage.getItem('token') || ''
  if (token.startsWith('mock-token-')) {
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    let userAppointments = mockAppointments.filter(a => String(a.userId) === String(user.id))
    if (currentStatus.value !== 'all') {
      userAppointments = userAppointments.filter(a => a.status === currentStatus.value)
    }
    userAppointments.sort((a, b) => {
      const timeA = new Date(a.appointmentTime || a.createdAt).getTime()
      const timeB = new Date(b.appointmentTime || b.createdAt).getTime()
      return timeB - timeA
    })
    appointments.value = userAppointments
    loading.value = false
    return
  }

  try {
    const params = { userId: user.id }
    if (currentStatus.value !== 'all') {
      params.status = currentStatus.value
    }
    const res = await axios.get('/appointments', { params })
    if (res.code === 200) {
      // 归一化后端数据
      const backendAppointments = res.data.map(a => ({
        ...a,
        appointmentTime: a.appointmentTime || (a.appointmentDate ? `${String(a.appointmentDate).slice(0, 10)} ${a.timeSlot || ''}`.trim() : ''),
        reviewed: a.reviewed !== undefined ? a.reviewed : !!a.hospitalFeedback
      }))
      // 合并 localStorage 中的离线预约（提交失败时可能存到了本地）
      const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
      const localAppointments = mockAppointments.filter(a => String(a.userId) === String(user.id))
      const merged = [...backendAppointments]
      localAppointments.forEach(la => {
        if (!merged.some(a => String(a.id) === String(la.id))) merged.push(la)
      })
      // 按状态筛选
      let filtered = merged
      if (currentStatus.value !== 'all') {
        filtered = merged.filter(a => a.status === currentStatus.value)
      }
      // 按时间倒序
      filtered.sort((a, b) => {
        const timeA = new Date(a.appointmentTime || a.createdAt).getTime()
        const timeB = new Date(b.appointmentTime || b.createdAt).getTime()
        return timeB - timeA
      })
      appointments.value = filtered
    }
  } catch (error) {
    console.error('[Appointments] 后端不可用，读取本地预约数据:', error)
    // 离线模式：从 localStorage 读取预约数据
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    let userAppointments = mockAppointments.filter(a => String(a.userId) === String(user.id))

    // 按状态筛选
    if (currentStatus.value !== 'all') {
      userAppointments = userAppointments.filter(a => a.status === currentStatus.value)
    }

    // 按时间倒序排列
    userAppointments.sort((a, b) => {
      const timeA = new Date(a.appointmentTime || a.createdAt).getTime()
      const timeB = new Date(b.appointmentTime || b.createdAt).getTime()
      return timeB - timeA
    })

    appointments.value = userAppointments
  } finally {
    loading.value = false
  }
}

const changeStatus = (status) => {
  currentStatus.value = status
  loadAppointments()
}

const handleCancel = async (appointment) => {
  if (!confirm('确定要取消此预约吗？')) return

  // 离线预约（Date.now() ID 或 nearby_ 前缀）直接走 localStorage，不走后端
  const isOfflineAppt = String(appointment.id).length > 10 || String(appointment.id).startsWith('nearby_')
  
  if (isOfflineAppt) {
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const index = mockAppointments.findIndex(a => String(a.id) === String(appointment.id))
    if (index !== -1) {
      mockAppointments[index].status = 'cancelled'
      localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    }
    appointment.status = 'cancelled'
    // 同步给商家端：写入聊天系统消息
    notifyMerchantCancel(appointment)
    alert('取消成功')
    return
  }

  try {
    await axios.put(`/appointments/${appointment.id}/status`, { status: 'cancel' })
    appointment.status = 'cancelled'
    // 同时更新 localStorage（商家端可能从 localStorage 读取）
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const index = mockAppointments.findIndex(a => String(a.id) === String(appointment.id))
    if (index !== -1) {
      mockAppointments[index].status = 'cancelled'
      localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    }
    // 同步给商家端：写入聊天系统消息
    notifyMerchantCancel(appointment)
    alert('取消成功')
  } catch (error) {
    console.error('[Appointments] 取消预约失败，使用离线模式:', error)
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const index = mockAppointments.findIndex(a => String(a.id) === String(appointment.id))
    if (index !== -1) {
      mockAppointments[index].status = 'cancelled'
      localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    }
    appointment.status = 'cancelled'
    notifyMerchantCancel(appointment)
    alert('取消成功')
  }
}

// 通知商家端预约已取消（通过聊天系统消息）
const notifyMerchantCancel = (appointment) => {
  const hospitalId = String(appointment.hospitalId || appointment.hospital_id || '')
  const userId = String(JSON.parse(localStorage.getItem('user') || '{}').id || '')
  const hospitalName = appointment.hospitalName || ''
  if (!hospitalId || !userId) return
  let session = readSession(hospitalId, userId, hospitalName)
  if (!session) {
    session = {
      userId: userId,
      appointmentId: appointment.id,
      userName: JSON.parse(localStorage.getItem('user') || '{}').nickname || '用户',
      petName: appointment.petName,
      hospitalName: appointment.hospitalName,
      hospitalId: hospitalId,
      messages: []
    }
  }
  if (!session.messages) session.messages = []
  session.messages.push({
    from: 'user',
    content: `【系统通知】用户已取消预约（${appointment.petName || ''}，时间：${appointment.appointmentTime || appointment.appointmentDate || ''}）`,
    time: new Date().toLocaleTimeString('en-GB'),
    merchantRead: false,
    appointmentId: appointment.id,
    isSystem: true
  })
  session.hospitalName = appointment.hospitalName
  session.hospitalId = hospitalId
  writeSession(hospitalId, userId, session)
}

const handleReview = (appointment) => {
  reviewingAppointment.value = appointment
  reviewForm.value = { rating: 5, content: '' }
  showReviewModal.value = true
}

const submitReview = async () => {
  if (!reviewForm.value.content) {
    alert('请输入评价内容')
    return
  }
  if (submittingReview.value) return
  submittingReview.value = true

  try {
    await axios.post(`/appointments/${reviewingAppointment.value.id}/review`, {
      rating: reviewForm.value.rating,
      content: reviewForm.value.content
    })
    reviewingAppointment.value.reviewed = true
    showReviewModal.value = false
    alert('评价成功')
  } catch (error) {
    console.error('[Appointments] 评价失败，使用离线模式:', error)
    // 离线模式：保存评价到 localStorage
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const index = mockAppointments.findIndex(a => String(a.id) === String(reviewingAppointment.value.id))
    if (index !== -1) {
      mockAppointments[index].reviewed = true
      mockAppointments[index].review = {
        rating: reviewForm.value.rating,
        content: reviewForm.value.content,
        time: new Date().toLocaleString()
      }
      localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    }
    reviewingAppointment.value.reviewed = true
    showReviewModal.value = false
    alert('评价成功')
  } finally {
    submittingReview.value = false
  }
}

// ===== 与商家沟通（与商家端共享 localStorage.merchantChats，跨 hospitalId key 匹配） =====
// 数据结构：merchantChats[hospitalIdKey][userId] = { userId, appointmentId, userName, petName, hospitalName, hospitalId, messages: [...] }
// messages: [{ from: 'user'|'merchant', content, time, read, appointmentId }]

// 医院名标准化（与商家端一致）
const normalizeChatName = (name) => {
  if (!name) return ''
  let s = String(name)
    .replace(/\s+/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/·.*$/, '')
    .toLowerCase()
  return s
}

// 跨所有 key 读取会话（处理 nearby_ 医院和真实医院 key 不一致的情况）
// hospitalName 参数：传入预约的医院名，用于精确匹配，避免取到其他医院的会话
const readSession = (hospitalId, userId, hospitalName) => {
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  const hid = String(hospitalId)
  const uid = String(userId)

  // 1. 优先精确匹配
  if (data[hid]?.[uid]) {
    return JSON.parse(JSON.stringify(data[hid][uid]))
  }

  // 2. 跨 key 匹配：必须用调用方传入的 hospitalName 匹配，避免取到其他医院的会话
  if (!hospitalName) return null
  const targetNorm = normalizeChatName(hospitalName)
  if (!targetNorm) return null
  for (const key of Object.keys(data)) {
    if (key === hid) continue
    const s = data[key]?.[uid]
    if (s && s.hospitalName && normalizeChatName(s.hospitalName) === targetNorm) {
      return JSON.parse(JSON.stringify(s))
    }
  }
  return null
}

// 写入会话（写到指定 key，同时也写一份到匹配名称的其他 key 下，确保商家能看到）
const writeSession = (hospitalId, userId, session) => {
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  const hid = String(hospitalId)
  const uid = String(userId)
  const cleanSession = JSON.parse(JSON.stringify(session))
  const sName = normalizeChatName(session.hospitalName)
  
  // 要写入的 key 集合
  const targetKeys = new Set([hid])
  
  // 同时写入名称匹配的其他 key（方便商家端无论用哪个 key 都能读到）
  if (sName) {
    for (const key of Object.keys(data)) {
      if (key === hid) continue
      const otherSession = data[key]?.[uid]
      if (otherSession && normalizeChatName(otherSession.hospitalName) === sName) {
        targetKeys.add(key)
      }
    }
  }
  
  for (const key of targetKeys) {
    if (!data[key]) data[key] = {}
    data[key][uid] = JSON.parse(JSON.stringify(cleanSession))
  }
  
  localStorage.setItem('merchantChats', JSON.stringify(data))
}

// 获取某个预约的未读消息数（商家发来的、用户未读的）
const getUnreadCount = (appointment) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const hospitalId = appointment.hospitalId || appointment.hospital_id || ''
  const hospitalName = appointment.hospitalName || ''
  const session = readSession(hospitalId, user.id, hospitalName)
  if (!session || !session.messages) return 0
  return session.messages.filter(m => m.from === 'merchant' && !m.userRead && String(m.appointmentId) === String(appointment.id)).length
}

// 模板使用的未读数包装：同一预约在一次渲染中只调用一次 getUnreadCount，避免重复解析 localStorage
const unreadCache = new Map()
const unreadCountOf = (appointment) => {
  const key = String(appointment.id)
  if (unreadCache.has(key)) return unreadCache.get(key)
  const n = getUnreadCount(appointment)
  unreadCache.set(key, n)
  return n
}
// 轮询触发渲染前清空缓存，让下一次渲染重新计算
const clearUnreadCache = () => unreadCache.clear()

// 打开聊天弹窗
const openChat = (appointment) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const hospitalId = String(appointment.hospitalId || appointment.hospital_id || '')
  const hospitalName = appointment.hospitalName || ''
  let session = readSession(hospitalId, user.id, hospitalName)
  if (!session) {
    session = {
      userId: user.id,
      appointmentId: appointment.id,
      userName: user.nickname || user.username || '用户',
      petName: appointment.petName,
      hospitalName: appointment.hospitalName,
      hospitalId: hospitalId,
      messages: []
    }
  } else {
    session.appointmentId = appointment.id
    session.petName = appointment.petName
    session.hospitalName = appointment.hospitalName
    session.hospitalId = hospitalId
    // 同步最新的用户名（用户可能后来修改了昵称）
    session.userName = user.nickname || user.username || session.userName || '用户'
    // 标记该预约的商家消息为已读
    session.messages.forEach(m => {
      if (m.from === 'merchant' && String(m.appointmentId) === String(appointment.id)) m.userRead = true
    })
  }
  writeSession(hospitalId, user.id, session)
  currentChat.value = JSON.parse(JSON.stringify(session))
  showChatModal.value = true
  nextTick(() => scrollToBottom())
}

// 发送消息
const sendChatMessage = () => {
  if (!chatInput.value.trim() || !currentChat.value) return
  const hospitalId = String(currentChat.value.hospitalId || '')
  const userId = String(currentChat.value.userId)
  const hospitalName = currentChat.value.hospitalName || ''
  let session = readSession(hospitalId, userId, hospitalName) || JSON.parse(JSON.stringify(currentChat.value))
  if (!session.messages) session.messages = []
  session.messages.push({
    from: 'user',
    content: chatInput.value.trim(),
    time: new Date().toLocaleTimeString('en-GB'),
    merchantRead: false,
    appointmentId: currentChat.value.appointmentId
  })
  session.hospitalName = currentChat.value.hospitalName
  session.hospitalId = hospitalId
  writeSession(hospitalId, userId, session)
  currentChat.value = JSON.parse(JSON.stringify(session))
  chatInput.value = ''
  nextTick(() => scrollToBottom())
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

const goBack = () => router.back()
const goToDetail = (id) => router.push(`/appointments/${id}`)
const goToHome = () => router.push('/')
const goToHospitals = () => router.push('/hospitals')
const goToPets = () => router.push('/pets')
const goToProfile = () => router.push('/profile')

let pollTimer = null
onMounted(() => {
  loadAppointments()
  // 每 2 秒轮询一次聊天数据，让未读消息数实时更新
  pollTimer = setInterval(() => {
    // 清空未读数缓存，让下一次渲染重新计算
    clearUnreadCache()
    // 触发响应式更新：重新赋值 appointments 让 v-if 重新计算 getUnreadCount
    appointments.value = [...appointments.value]
    // 若聊天弹窗打开，同步最新消息（商家端可能发了新消息）
    if (showChatModal.value && currentChat.value) {
      const hospitalId = String(currentChat.value.hospitalId || '')
      const userId = String(currentChat.value.userId)
      const hospitalName = currentChat.value.hospitalName || ''
      const session = readSession(hospitalId, userId, hospitalName)
      if (session && session.messages) {
        // 打开弹窗时标记商家消息为已读
        session.messages.forEach(m => {
          if (m.from === 'merchant') m.userRead = true
        })
        writeSession(hospitalId, userId, session)
        currentChat.value = JSON.parse(JSON.stringify(session))
        nextTick(() => scrollToBottom())
      }
    }
  }, 2000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style scoped>
/* 内容区 padding（pm-content 只提供层级，这里补 padding） */
.appointments-content {
  padding: 15px;
}

/* ===== 状态标签栏（保留横向滚动布局，选中态用粉色渐变） ===== */
.status-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.tab-btn {
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(214, 112, 159, 0.2);
  border-radius: 20px;
  font-size: 13px;
  color: #5a4a5a;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.25);
}

/* ===== 预约列表与卡片布局 ===== */
.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 列表内卡片去掉自身 margin-bottom，用 gap 控制间距 */
.appointment-list .appointment-card {
  margin-bottom: 0;
}

.appointment-card:active {
  transform: scale(0.98);
}

.appointment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.appointment-id {
  font-size: 12px;
  color: #b094b8;
}

.appointment-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  font-size: 14px;
}

.label {
  width: 60px;
  color: #b094b8;
}

.value {
  flex: 1;
  color: #5a4a5a;
}

.appointment-footer {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 232, 240, 0.8);
}

/* 沟通按钮需要相对定位以放置未读徽章 */
.chat-btn {
  position: relative;
}

.unread-badge {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  padding: 0 5px;
  background: #ff4d4f;
  color: #fff;
  border-radius: 9px;
  font-size: 11px;
  margin-left: 4px;
}

/* ===== 评价模态框：评分区 ===== */
.rating-section {
  margin-bottom: 18px;
}

.rating-section p {
  font-size: 14px;
  color: #b094b8;
  margin-bottom: 10px;
}

.rating-stars {
  display: flex;
  gap: 10px;
}

.star {
  font-size: 30px;
  opacity: 0.3;
  cursor: pointer;
  transition: opacity 0.2s;
}

.star.active {
  opacity: 1;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #b094b8;
  margin-bottom: 6px;
}

/* ===== 聊天弹窗（保留特殊布局，配色改为粉色主题） ===== */
.chat-modal-overlay {
  z-index: 9999;
}

.chat-modal {
  width: 420px;
  max-width: 95vw;
  height: 600px;
  max-height: 90vh;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 60px rgba(214, 112, 159, 0.2);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
}

.chat-title-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-hospital {
  font-size: 16px;
  font-weight: 600;
}

.chat-pet-info {
  font-size: 12px;
  opacity: 0.85;
}

.chat-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
}

.chat-close:hover {
  background: rgba(255, 255, 255, 0.35);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: linear-gradient(135deg, #fff5f7 0%, #fef9f4 50%, #f5f0ff 100%);
}

.chat-empty {
  text-align: center;
  color: #b094b8;
  padding: 40px 0;
}

.chat-empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}

.chat-msg {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

.chat-msg.mine {
  align-items: flex-end;
}

.chat-msg.theirs {
  align-items: flex-start;
}

.msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.chat-msg.mine .msg-bubble {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-msg.theirs .msg-bubble {
  background: #fff;
  color: #5a4a5a;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(214, 112, 159, 0.1);
}

.msg-time {
  font-size: 10px;
  color: #b094b8;
  margin-top: 4px;
  padding: 0 4px;
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(255, 232, 240, 0.8);
  background: #fff;
}

/* 聊天输入框：在 pm-input 基础上调整尺寸与圆角 */
.chat-input {
  flex: 1;
  height: 40px;
  border-radius: 20px;
}

.chat-send-btn {
  border-radius: 20px;
}
</style>
