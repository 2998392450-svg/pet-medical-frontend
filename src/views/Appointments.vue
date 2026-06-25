<template>
  <div class="appointments-page">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">我的预约</span>
      </div>
    </nav>

    <div class="content">
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

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="appointments.length === 0" class="empty">
        <div class="empty-icon">📅</div>
        <p>暂无预约记录</p>
        <button class="empty-btn" @click="goToHospitals">去预约</button>
      </div>

      <div v-else class="appointment-list">
        <div
          v-for="appointment in appointments"
          :key="appointment.id"
          class="appointment-card"
          @click="goToDetail(appointment.id)"
        >
          <div class="appointment-header">
            <span :class="['status-tag', appointment.status]">
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
              class="action-btn cancel"
              @click.stop="handleCancel(appointment)"
            >
              取消预约
            </button>
            <button
              v-if="appointment.status === 'completed' && !appointment.reviewed"
              class="action-btn review"
              @click.stop="handleReview(appointment)"
            >
              评价
            </button>
            <button
              v-if="appointment.status !== 'cancelled'"
              class="action-btn chat"
              @click.stop="openChat(appointment)"
            >
              💬 沟通
              <span v-if="getUnreadCount(appointment) > 0" class="unread-badge">{{ getUnreadCount(appointment) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-nav">
      <div class="nav-item" @click="goToHome">
        <span class="nav-icon">🏠</span>
        <span>首页</span>
      </div>
      <div class="nav-item" @click="goToHospitals">
        <span class="nav-icon">🏥</span>
        <span>医院</span>
      </div>
      <div class="nav-item" @click="goToPets">
        <span class="nav-icon">🐕</span>
        <span>宠物</span>
      </div>
      <div class="nav-item active">
        <span class="nav-icon">📅</span>
        <span>预约</span>
      </div>
    </div>

    <div v-if="showReviewModal" class="modal">
      <div class="modal-content">
        <h3>评价预约</h3>

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
            placeholder="请输入评价内容"
            rows="4"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button class="cancel-btn" @click="showReviewModal = false">取消</button>
          <button class="submit-btn" @click="submitReview">提交</button>
        </div>
      </div>
    </div>

    <!-- 与商家沟通弹窗 -->
    <div v-if="showChatModal" class="chat-modal-overlay" @click.self="showChatModal = false">
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
            placeholder="输入消息..."
            @keyup.enter="sendChatMessage"
          />
          <button class="chat-send-btn" @click="sendChatMessage" :disabled="!chatInput.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../api/axios'

const router = useRouter()

const loading = ref(false)
const appointments = ref([])
const currentStatus = ref('all')
const showReviewModal = ref(false)
const reviewingAppointment = ref(null)

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
  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) {
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
      // 归一化：后端返回 appointmentDate+timeSlot/hospitalFeedback，补齐前端模板依赖的 appointmentTime/reviewed
      appointments.value = res.data.map(a => ({
        ...a,
        appointmentTime: a.appointmentTime || (a.appointmentDate ? `${String(a.appointmentDate).slice(0, 10)} ${a.timeSlot || ''}`.trim() : ''),
        reviewed: a.reviewed !== undefined ? a.reviewed : !!a.hospitalFeedback
      }))
    }
  } catch (error) {
    console.error('[Appointments] 后端不可用，读取本地预约数据:', error)
    // 离线模式：从 localStorage 读取预约数据
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    let userAppointments = mockAppointments.filter(a => a.userId === user.id)

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

  try {
    await axios.put(`/appointments/${appointment.id}/status`, { status: 'cancel' })
    appointment.status = 'cancelled'
    alert('取消成功')
  } catch (error) {
    console.error('[Appointments] 取消预约失败，使用离线模式:', error)
    // 离线模式：更新 localStorage 中的预约状态
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const index = mockAppointments.findIndex(a => a.id === appointment.id)
    if (index !== -1) {
      mockAppointments[index].status = 'cancelled'
      localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    }
    appointment.status = 'cancelled'
    alert('取消成功')
  }
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
    const index = mockAppointments.findIndex(a => a.id === reviewingAppointment.value.id)
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
  }
}

// ===== 与商家沟通（与商家端共享 localStorage.merchantChats） =====

// 获取某个预约的未读消息数（商家发来的、用户未读的）
const getUnreadCount = (appointment) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  const key = String(user.id)
  const session = data[key]
  if (!session || !session.messages) return 0
  return session.messages.filter(m => m.from === 'merchant' && !m.read && m.appointmentId === appointment.id).length
}

// 打开聊天弹窗
const openChat = (appointment) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  const key = String(user.id)
  let session = data[key]
  if (!session) {
    session = {
      userId: user.id,
      appointmentId: appointment.id,
      userName: user.nickname || user.username || '用户',
      petName: appointment.petName,
      hospitalName: appointment.hospitalName,
      messages: []
    }
    data[key] = session
    localStorage.setItem('merchantChats', JSON.stringify(data))
  } else {
    // 更新预约信息（切到不同预约时）
    session.appointmentId = appointment.id
    session.petName = appointment.petName
    session.hospitalName = appointment.hospitalName
    // 标记该预约的商家消息为已读
    session.messages.forEach(m => {
      if (m.from === 'merchant' && m.appointmentId === appointment.id) m.read = true
    })
    data[key] = session
    localStorage.setItem('merchantChats', JSON.stringify(data))
  }
  currentChat.value = reactive(session)
  showChatModal.value = true
  nextTick(() => scrollToBottom())
}

// 发送消息
const sendChatMessage = () => {
  if (!chatInput.value.trim() || !currentChat.value) return
  currentChat.value.messages.push({
    from: 'user',
    content: chatInput.value.trim(),
    time: new Date().toLocaleTimeString(),
    read: true,
    appointmentId: currentChat.value.appointmentId
  })
  chatInput.value = ''
  // 保存到共享 localStorage
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  data[String(currentChat.value.userId)] = currentChat.value
  localStorage.setItem('merchantChats', JSON.stringify(data))
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

onMounted(() => {
  loadAppointments()
  // 每 3 秒轮询一次聊天数据，让未读消息数实时更新
  setInterval(() => {
    // 触发响应式更新：appointments 的 v-if 重新计算 getUnreadCount
    appointments.value = [...appointments.value]
    // 若聊天弹窗打开，同步最新消息
    if (showChatModal.value && currentChat.value) {
      const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
      const session = data[String(currentChat.value.userId)]
      if (session && session.messages) {
        currentChat.value.messages = session.messages
        nextTick(() => scrollToBottom())
      }
    }
  }, 3000)
})
</script>

<style scoped>
.appointments-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.content {
  padding: 15px;
}

.status-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.tab-btn {
  padding: 10px 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border-color: transparent;
}

.loading, .empty {
  text-align: center;
  padding: 50px 20px;
  color: #999;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 15px;
}

.empty p {
  margin-bottom: 15px;
}

.empty-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.appointment-card {
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s;
}

.appointment-card:active {
  transform: scale(0.98);
}

.appointment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.status-tag {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 15px;
}

.status-tag.pending { background: #fff3e0; color: #ff9800; }
.status-tag.confirmed { background: #e3f2fd; color: #2196f3; }
.status-tag.completed { background: #e8f5e9; color: #4caf50; }
.status-tag.cancelled { background: #ffebee; color: #f44336; }

.appointment-id {
  font-size: 12px;
  color: #999;
}

.appointment-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  font-size: 14px;
}

.label {
  width: 60px;
  color: #999;
}

.value {
  flex: 1;
  color: #333;
}

.appointment-footer {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.action-btn.cancel {
  background: #ffebee;
  color: #f44336;
}

.action-btn.review {
  background: #e8f5e9;
  color: #4caf50;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  padding: 10px 0;
}

.nav-item {
  flex: 1;
  text-align: center;
  cursor: pointer;
  padding: 8px;
  color: #999;
  transition: color 0.3s;
}

.nav-item.active {
  color: #667eea;
}

.nav-icon {
  font-size: 22px;
  display: block;
  margin-bottom: 4px;
}

.nav-item span:last-child {
  font-size: 12px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 15px;
  padding: 25px;
}

.modal-content h3 {
  font-size: 18px;
  color: #333;
  margin: 0 0 20px 0;
  text-align: center;
}

.rating-section {
  margin-bottom: 20px;
}

.rating-section p {
  font-size: 14px;
  color: #666;
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
  color: #666;
  margin-bottom: 5px;
}

.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  resize: none;
  box-sizing: border-box;
}

.form-group textarea:focus {
  border-color: #4facfe;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn, .submit-btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.submit-btn {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

/* 沟通按钮 */
.action-btn.chat {
  background: #f0f5ff;
  color: #4facfe;
  position: relative;
}

.action-btn.chat:hover {
  background: #d6e4ff;
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

/* 聊天弹窗 */
.chat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-modal {
  width: 420px;
  max-width: 95vw;
  height: 600px;
  max-height: 90vh;
  background: #fff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
  background: #f5f5f5;
}

.chat-empty {
  text-align: center;
  color: #999;
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
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-msg.theirs .msg-bubble {
  background: #fff;
  color: #333;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.msg-time {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
  padding: 0 4px;
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #eee;
  background: #fff;
}

.chat-input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.chat-input-area input:focus {
  border-color: #4facfe;
}

.chat-send-btn {
  padding: 8px 18px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
