<template>
  <div class="merchant-container">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="logout">退出</span>
        <span class="title">商家工作台</span>
      </div>
      <div class="nav-right">
        <span class="hospital-name">{{ merchant?.hospitalName || '宠物医院' }}</span>
      </div>
    </nav>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <span
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span v-if="tab.key === 'appointments' && pendingCount > 0" class="badge">{{ pendingCount }}</span>
        <span v-if="tab.key === 'chat' && unreadCount > 0" class="badge">{{ unreadCount }}</span>
      </span>
    </div>

    <!-- 预约管理 -->
    <div v-if="activeTab === 'appointments'" class="tab-content">
      <!-- 状态筛选 -->
      <div class="status-filter">
        <span
          v-for="s in statusFilters"
          :key="s.value"
          :class="['status-chip', { active: appointmentStatus === s.value }]"
          @click="appointmentStatus = s.value"
        >
          {{ s.label }}
        </span>
      </div>

      <div v-if="filteredAppointments.length === 0" class="empty">
        <div class="empty-icon">📋</div>
        <p>暂无预约</p>
      </div>

      <div v-else class="appointment-list">
        <div
          v-for="appt in filteredAppointments"
          :key="appt.id"
          class="appointment-card"
        >
          <div class="appt-header">
            <span class="appt-no">#{{ appt.id }}</span>
            <span :class="['status-tag', appt.status]">{{ getStatusText(appt.status) }}</span>
          </div>
          <div class="appt-body">
            <div class="appt-info">
              <span class="info-label">宠物</span>
              <span class="info-value">{{ appt.petName }}</span>
            </div>
            <div class="appt-info">
              <span class="info-label">主人</span>
              <span class="info-value">{{ appt.userName || '匿名' }}</span>
            </div>
            <div class="appt-info">
              <span class="info-label">时间</span>
              <span class="info-value">{{ appt.appointmentTime }}</span>
            </div>
            <div class="appt-info">
              <span class="info-label">就诊类型</span>
              <span class="info-value">{{ appt.type || '常规检查' }}</span>
            </div>
            <div class="appt-info" v-if="appt.notes">
              <span class="info-label">备注</span>
              <span class="info-value">{{ appt.notes }}</span>
            </div>
          </div>
          <div class="appt-actions" v-if="appt.status === 'pending'">
            <button class="action-btn confirm" @click="confirmAppointment(appt)">确认预约</button>
            <button class="action-btn reject" @click="rejectAppointment(appt)">拒绝</button>
            <button class="action-btn chat" @click="openChat(appt)">沟通</button>
          </div>
          <div class="appt-actions" v-else-if="appt.status === 'confirmed'">
            <button class="action-btn complete" @click="completeAppointment(appt)">完成就诊</button>
            <button class="action-btn chat" @click="openChat(appt)">沟通</button>
          </div>
          <div class="appt-actions" v-else>
            <button class="action-btn chat" @click="openChat(appt)">沟通</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 医生管理 -->
    <div v-else-if="activeTab === 'doctors'" class="tab-content">
      <div class="doctors-header">
        <h3>👨‍⚕️ 本院医生团队 ({{ doctors.length }})</h3>
        <button class="add-doctor-btn" @click="openDoctorModal()">+ 添加医生</button>
      </div>

      <div v-if="doctors.length === 0" class="empty">
        <div class="empty-icon">👨‍⚕️</div>
        <p>暂无医生，点击右上角添加</p>
      </div>

      <div v-else class="doctor-list">
        <div v-for="doc in doctors" :key="doc.id" class="doctor-card">
          <div class="doc-avatar">👨‍⚕️</div>
          <div class="doc-info">
            <div class="doc-name-row">
              <span class="doc-name">{{ doc.name }}</span>
              <span class="doc-title">{{ doc.title }}</span>
            </div>
            <div class="doc-row"><span class="doc-label">专业：</span>{{ doc.specialty }}</div>
            <div class="doc-row"><span class="doc-label">接诊：</span>{{ doc.workHours }}</div>
            <div class="doc-row" v-if="doc.description"><span class="doc-label">简介：</span>{{ doc.description }}</div>
            <div class="doc-row"><span class="doc-label">评分：</span>⭐ {{ doc.rating }}</div>
          </div>
          <div class="doc-actions">
            <button class="action-btn edit" @click="openDoctorModal(doc)">编辑</button>
            <button class="action-btn reject" @click="deleteDoctor(doc)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 在线沟通 -->
    <div v-else-if="activeTab === 'chat'" class="tab-content chat-tab">
      <div class="chat-layout">
        <!-- 会话列表 -->
        <div class="session-list">
          <div v-if="sessions.length === 0" class="empty-session">
            <p>暂无会话</p>
            <p class="empty-tip">用户发起预约沟通后会显示在这里</p>
          </div>
          <div
            v-for="s in sessions"
            :key="s.userId"
            :class="['session-item', { active: currentSession?.userId === s.userId }]"
            @click="selectSession(s)"
          >
            <div class="session-avatar">{{ s.petName?.charAt(0) || '👤' }}</div>
            <div class="session-info">
              <div class="session-name">{{ s.userName || '用户' }}</div>
              <div class="session-preview">{{ s.lastMessage || '点击开始沟通' }}</div>
            </div>
            <span v-if="s.unread > 0" class="session-badge">{{ s.unread }}</span>
          </div>
        </div>

        <!-- 聊天窗口 -->
        <div class="chat-window">
          <div v-if="!currentSession" class="no-chat">
            <div class="no-chat-icon">💬</div>
            <p>选择左侧会话开始沟通</p>
          </div>
          <template v-else>
            <div class="chat-header">
              <span>{{ currentSession.userName || '用户' }}</span>
              <span class="chat-pet">宠物：{{ currentSession.petName || '未知' }}</span>
            </div>
            <div class="chat-messages" ref="chatBox">
              <div
                v-for="(msg, idx) in currentMessages"
                :key="idx"
                :class="['message', msg.from === 'merchant' ? 'sent' : 'received']"
              >
                <div class="msg-bubble">{{ msg.content }}</div>
                <div class="msg-time">{{ msg.time }}</div>
              </div>
            </div>
            <div class="chat-input-area">
              <input
                v-model="messageInput"
                type="text"
                placeholder="输入消息..."
                @keyup.enter="sendMessage"
              />
              <button class="send-btn" @click="sendMessage" :disabled="!messageInput.trim()">发送</button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 数据统计 -->
    <div v-else-if="activeTab === 'stats'" class="tab-content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-value">{{ allAppointments.length }}</div>
          <div class="stat-label">总预约</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">{{ pendingCount }}</div>
          <div class="stat-label">待处理</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ confirmedCount }}</div>
          <div class="stat-label">已确认</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏁</div>
          <div class="stat-value">{{ completedCount }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 医生添加/编辑弹窗 -->
    <div v-if="showDoctorModal" class="modal-overlay" @click.self="showDoctorModal = false">
      <div class="modal-card">
        <div class="modal-title">{{ doctorForm.id ? '编辑医生' : '添加医生' }}</div>
        <div class="modal-form">
          <div class="modal-field">
            <label>姓名 <span class="required">*</span></label>
            <input v-model="doctorForm.name" type="text" placeholder="医生姓名" />
          </div>
          <div class="modal-field">
            <label>职称</label>
            <select v-model="doctorForm.title">
              <option value="主任医师">主任医师</option>
              <option value="副主任医师">副主任医师</option>
              <option value="主治医师">主治医师</option>
            </select>
          </div>
          <div class="modal-field">
            <label>专业领域 <span class="required">*</span></label>
            <input v-model="doctorForm.specialty" type="text" placeholder="如：犬猫内科/外科" />
          </div>
          <div class="modal-field">
            <label>接诊时间</label>
            <input v-model="doctorForm.workHours" type="text" placeholder="如：09:00-17:00" />
          </div>
          <div class="modal-field">
            <label>接诊日</label>
            <select v-model="doctorForm.workDays">
              <option value="1,2,3,4,5">周一至周五</option>
              <option value="1,2,3,4,5,6">周一至周六</option>
              <option value="1,2,3,4,5,6,7">每天</option>
              <option value="2,3,4,5,6">周二至周六</option>
            </select>
          </div>
          <div class="modal-field">
            <label>简介</label>
            <textarea v-model="doctorForm.description" rows="2" placeholder="医生简介（选填）"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showDoctorModal = false">取消</button>
          <button class="modal-btn confirm" @click="saveDoctor" :disabled="saving || !doctorForm.name || !doctorForm.specialty">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'

const router = useRouter()
const merchant = ref(null)
const activeTab = ref('appointments')
const appointmentStatus = ref('all')
const sessions = ref([])
const currentSession = ref(null)
const messageInput = ref('')

// 医生管理
const doctors = ref([])
const showDoctorModal = ref(false)
const saving = ref(false)
const doctorForm = reactive({
  id: null,
  name: '',
  title: '主治医师',
  specialty: '',
  workHours: '09:00-17:00',
  workDays: '1,2,3,4,5',
  description: ''
})

const tabs = [
  { key: 'appointments', label: '预约管理', icon: '📋' },
  { key: 'doctors', label: '医生管理', icon: '👨‍⚕️' },
  { key: 'chat', label: '在线沟通', icon: '💬' },
  { key: 'stats', label: '数据统计', icon: '📊' }
]

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'confirmed', label: '已确认' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

// 加载所有预约（调用后端 API，失败时 localStorage 兜底）
const allAppointments = ref([])

const loadAppointments = async () => {
  const hospitalId = merchant.value?.hospitalId
  if (!hospitalId) {
    // 离线模式
    const data = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    allAppointments.value = data
    return
  }
  try {
    const token = localStorage.getItem('merchantToken')
    const res = await axios.get('/appointments/merchant', {
      params: { hospitalId },
      headers: { Authorization: 'Bearer ' + token }
    })
    if (res.code === 200) {
      allAppointments.value = res.data || []
    }
  } catch (error) {
    console.error('[MerchantHome] 加载预约失败，使用离线数据:', error)
    const data = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    allAppointments.value = data
  }
}

const filteredAppointments = computed(() => {
  if (appointmentStatus.value === 'all') return allAppointments.value
  return allAppointments.value.filter(a => a.status === appointmentStatus.value)
})

const pendingCount = computed(() => allAppointments.value.filter(a => a.status === 'pending').length)
const confirmedCount = computed(() => allAppointments.value.filter(a => a.status === 'confirmed').length)
const completedCount = computed(() => allAppointments.value.filter(a => a.status === 'completed').length)

const getStatusText = (status) => {
  const map = { pending: '待处理', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }
  return map[status] || status
}

const saveAppointments = () => {
  localStorage.setItem('mockAppointments', JSON.stringify(allAppointments.value))
}

// 确认预约
const confirmAppointment = async (appt) => {
  try {
    const token = localStorage.getItem('merchantToken')
    await axios.put(`/appointments/${appt.id}/status`, { status: 'confirm' }, { headers: { Authorization: 'Bearer ' + token } })
    appt.status = 'confirmed'
    addSystemMessage(appt, '您的预约已确认！请按时到院就诊。')
    alert('已确认预约')
  } catch (error) {
    console.error('[MerchantHome] 确认失败，使用离线模式:', error)
    const idx = allAppointments.value.findIndex(a => a.id === appt.id)
    if (idx !== -1) {
      allAppointments.value[idx].status = 'confirmed'
      saveAppointments()
      addSystemMessage(appt, '您的预约已确认！请按时到院就诊。')
      alert('已确认预约（离线模式）')
    }
  }
}

// 拒绝预约
const rejectAppointment = async (appt) => {
  if (!confirm('确定拒绝此预约吗？')) return
  try {
    const token = localStorage.getItem('merchantToken')
    await axios.put(`/appointments/${appt.id}/status`, { status: 'cancel' }, { headers: { Authorization: 'Bearer ' + token } })
    appt.status = 'cancelled'
    addSystemMessage(appt, '很抱歉，您的预约未能通过，详情请咨询。')
    alert('已拒绝预约')
  } catch (error) {
    console.error('[MerchantHome] 拒绝失败，使用离线模式:', error)
    const idx = allAppointments.value.findIndex(a => a.id === appt.id)
    if (idx !== -1) {
      allAppointments.value[idx].status = 'cancelled'
      saveAppointments()
      addSystemMessage(appt, '很抱歉，您的预约未能通过，详情请咨询。')
      alert('已拒绝预约（离线模式）')
    }
  }
}

// 完成就诊
const completeAppointment = async (appt) => {
  try {
    const token = localStorage.getItem('merchantToken')
    await axios.put(`/appointments/${appt.id}/status`, { status: 'complete' }, { headers: { Authorization: 'Bearer ' + token } })
    appt.status = 'completed'
    addSystemMessage(appt, '就诊已完成，祝您的宠物健康！期待您的评价。')
    alert('已标记完成')
  } catch (error) {
    console.error('[MerchantHome] 完成失败，使用离线模式:', error)
    const idx = allAppointments.value.findIndex(a => a.id === appt.id)
    if (idx !== -1) {
      allAppointments.value[idx].status = 'completed'
      saveAppointments()
      addSystemMessage(appt, '就诊已完成，祝您的宠物健康！期待您的评价。')
      alert('已标记完成（离线模式）')
    }
  }
}

// ===== 医生管理 =====
const loadDoctors = async () => {
  const token = localStorage.getItem('merchantToken')
  if (!token) return
  try {
    const res = await axios.get('/merchant/doctors', { headers: { Authorization: 'Bearer ' + token } })
    if (res.code === 200) {
      doctors.value = res.data || []
    }
  } catch (error) {
    console.error('[MerchantHome] 加载医生失败:', error)
    doctors.value = []
  }
}

const openDoctorModal = (doc = null) => {
  if (doc) {
    doctorForm.id = doc.id
    doctorForm.name = doc.name
    doctorForm.title = doc.title || '主治医师'
    doctorForm.specialty = doc.specialty || ''
    doctorForm.workHours = doc.workHours || '09:00-17:00'
    doctorForm.workDays = doc.workDays || '1,2,3,4,5'
    doctorForm.description = doc.description || ''
  } else {
    doctorForm.id = null
    doctorForm.name = ''
    doctorForm.title = '主治医师'
    doctorForm.specialty = ''
    doctorForm.workHours = '09:00-17:00'
    doctorForm.workDays = '1,2,3,4,5'
    doctorForm.description = ''
  }
  showDoctorModal.value = true
}

const saveDoctor = async () => {
  if (!doctorForm.name || !doctorForm.specialty) return
  saving.value = true
  const token = localStorage.getItem('merchantToken')
  try {
    if (doctorForm.id) {
      await axios.put(`/merchant/doctors/${doctorForm.id}`, doctorForm, { headers: { Authorization: 'Bearer ' + token } })
      alert('修改成功')
    } else {
      await axios.post('/merchant/doctors', doctorForm, { headers: { Authorization: 'Bearer ' + token } })
      alert('添加成功')
    }
    showDoctorModal.value = false
    await loadDoctors()
  } catch (error) {
    console.error('[MerchantHome] 保存医生失败:', error)
    const msg = error.response && error.response.data && error.response.data.message
    alert(msg || '保存失败')
  } finally {
    saving.value = false
  }
}

const deleteDoctor = async (doc) => {
  if (!confirm(`确定删除医生「${doc.name}」？`)) return
  const token = localStorage.getItem('merchantToken')
  try {
    await axios.delete(`/merchant/doctors/${doc.id}`, { headers: { Authorization: 'Bearer ' + token } })
    alert('删除成功')
    await loadDoctors()
  } catch (error) {
    console.error('[MerchantHome] 删除医生失败:', error)
    const msg = error.response && error.response.data && error.response.data.message
    alert(msg || '删除失败')
  }
}

// 在线沟通
const unreadCount = computed(() => sessions.value.reduce((sum, s) => sum + (s.unread || 0), 0))

const loadSessions = () => {
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  sessions.value = Object.values(data).map(s => ({
    ...s,
    unread: s.messages?.filter(m => m.from === 'user' && !m.read).length || 0,
    lastMessage: s.messages?.length > 0 ? s.messages[s.messages.length - 1].content : ''
  }))
}

const saveSessions = () => {
  const data = {}
  sessions.value.forEach(s => { data[s.userId] = s })
  localStorage.setItem('merchantChats', JSON.stringify(data))
}

const currentMessages = computed(() => currentSession.value?.messages || [])

const selectSession = (session) => {
  currentSession.value = session
  // 标记已读
  session.messages?.forEach(m => { if (m.from === 'user') m.read = true })
  session.unread = 0
  saveSessions()
}

const openChat = (appt) => {
  // 从预约创建会话
  let session = sessions.value.find(s => s.userId === appt.userId || s.appointmentId === appt.id)
  if (!session) {
    session = reactive({
      userId: appt.userId || ('user_' + appt.id),
      appointmentId: appt.id,
      userName: appt.userName || '用户',
      petName: appt.petName,
      messages: [],
      unread: 0
    })
    sessions.value.push(session)
    saveSessions()
  }
  activeTab.value = 'chat'
  selectSession(session)
}

const addSystemMessage = (appt, content) => {
  let session = sessions.value.find(s => s.userId === appt.userId || s.appointmentId === appt.id)
  if (!session) {
    session = reactive({
      userId: appt.userId || ('user_' + appt.id),
      appointmentId: appt.id,
      userName: appt.userName || '用户',
      petName: appt.petName,
      messages: [],
      unread: 0
    })
    sessions.value.push(session)
  }
  session.messages.push({
    from: 'merchant',
    content: content,
    time: new Date().toLocaleTimeString(),
    read: false,
    appointmentId: appt.id
  })
  saveSessions()
}

const sendMessage = () => {
  if (!messageInput.value.trim() || !currentSession.value) return
  currentSession.value.messages.push({
    from: 'merchant',
    content: messageInput.value.trim(),
    time: new Date().toLocaleTimeString(),
    read: false,
    appointmentId: currentSession.value.appointmentId
  })
  messageInput.value = ''
  saveSessions()
}

const logout = () => {
  localStorage.removeItem('merchantToken')
  localStorage.removeItem('merchant')
  router.push('/login')
}

onMounted(() => {
  const m = localStorage.getItem('merchant')
  if (!m) {
    router.push('/merchant/login')
    return
  }
  merchant.value = JSON.parse(m)
  loadAppointments()
  loadSessions()
  loadDoctors()
})
</script>

<style scoped>
.merchant-container {
  min-height: 100vh;
  background: #f0f2f5;
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
  font-size: 14px;
  cursor: pointer;
  padding: 6px 14px;
  background: #fff2f0;
  color: #ff4d4f;
  border-radius: 16px;
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.hospital-name {
  font-size: 13px;
  color: #666;
  background: #f0f9ff;
  padding: 6px 12px;
  border-radius: 16px;
}

.tab-bar {
  display: flex;
  background: white;
  padding: 0 10px;
  border-bottom: 1px solid #eee;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  position: relative;
  transition: color 0.3s;
}

.tab.active {
  color: #43e97b;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: #43e97b;
  border-radius: 2px;
}

.tab-icon {
  margin-right: 4px;
}

.badge {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  padding: 0 5px;
  background: #ff4d4f;
  color: white;
  border-radius: 9px;
  font-size: 11px;
  margin-left: 4px;
}

.tab-content {
  padding: 15px;
}

.status-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.status-chip {
  padding: 6px 14px;
  background: white;
  color: #666;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid #eee;
}

.status-chip.active {
  background: #43e97b;
  color: white;
  border-color: #43e97b;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 50px;
  margin-bottom: 10px;
}

.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.appointment-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.appt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.appt-no {
  font-size: 13px;
  color: #999;
  font-weight: 600;
}

.status-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
}

.status-tag.pending { background: #fff7e6; color: #fa8c16; }
.status-tag.confirmed { background: #e6fffb; color: #13c2c2; }
.status-tag.completed { background: #f6ffed; color: #52c41a; }
.status-tag.cancelled { background: #fff2f0; color: #ff4d4f; }

.appt-body {
  margin-bottom: 12px;
}

.appt-info {
  display: flex;
  gap: 10px;
  font-size: 13px;
  margin-bottom: 6px;
}

.info-label {
  color: #999;
  min-width: 60px;
}

.info-value {
  color: #333;
  flex: 1;
}

.appt-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.confirm { background: #52c41a; color: white; }
.action-btn.reject { background: #fff2f0; color: #ff4d4f; }
.action-btn.complete { background: #1890ff; color: white; }
.action-btn.chat { background: #f0f9ff; color: #1890ff; }

.action-btn:active { transform: scale(0.96); }

/* 聊天 */
.chat-tab {
  padding: 0;
}

.chat-layout {
  display: flex;
  height: calc(100vh - 110px);
}

.session-list {
  width: 35%;
  background: white;
  border-right: 1px solid #eee;
  overflow-y: auto;
}

.empty-session {
  padding: 40px 15px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.empty-tip {
  font-size: 11px;
  margin-top: 5px;
  color: #ccc;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
}

.session-item:hover { background: #f9f9f9; }
.session-item.active { background: #e6fffb; }

.session-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #43e97b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.session-preview {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-badge {
  background: #ff4d4f;
  color: white;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  height: 18px;
  line-height: 18px;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.no-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
}

.no-chat-icon {
  font-size: 60px;
  margin-bottom: 10px;
}

.chat-header {
  padding: 12px 15px;
  background: white;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
}

.chat-pet {
  font-weight: 400;
  font-size: 12px;
  color: #999;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

.message.sent {
  align-self: flex-end;
  align-items: flex-end;
}

.message.received {
  align-self: flex-start;
}

.msg-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.message.sent .msg-bubble {
  background: #43e97b;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.received .msg-bubble {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
}

.msg-time {
  font-size: 10px;
  color: #ccc;
  margin-top: 4px;
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 10px;
  background: white;
  border-top: 1px solid #eee;
}

.chat-input-area input {
  flex: 1;
  height: 40px;
  padding: 0 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.chat-input-area input:focus {
  border-color: #43e97b;
}

.send-btn {
  padding: 0 20px;
  background: #43e97b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.stat-card {
  background: white;
  border-radius: 15px;
  padding: 25px 15px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 5px;
}

/* 医生管理 */
.doctors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.doctors-header h3 {
  font-size: 16px;
  color: #333;
  margin: 0;
}

.add-doctor-btn {
  padding: 8px 18px;
  background: #43e97b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.add-doctor-btn:hover {
  background: #38d870;
}

.doctor-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doctor-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.doc-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #e6fffb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.doc-info {
  flex: 1;
}

.doc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.doc-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.doc-title {
  font-size: 11px;
  color: #13c2c2;
  background: #e6fffb;
  padding: 2px 8px;
  border-radius: 10px;
}

.doc-row {
  font-size: 13px;
  color: #555;
  margin-bottom: 4px;
}

.doc-label {
  color: #999;
  min-width: 60px;
  display: inline-block;
}

.doc-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn.edit {
  background: #e6f7ff;
  color: #1890ff;
}

/* 弹窗 */
.modal-overlay {
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

.modal-card {
  background: white;
  border-radius: 14px;
  padding: 24px;
  width: 460px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 18px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-field label {
  font-size: 13px;
  color: #666;
}

.required {
  color: #ff4d4f;
}

.modal-field input,
.modal-field select,
.modal-field textarea {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.modal-field input:focus,
.modal-field select:focus,
.modal-field textarea:focus {
  border-color: #43e97b;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
}

.modal-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.modal-btn.cancel {
  background: #f0f0f0;
  color: #666;
}

.modal-btn.confirm {
  background: #43e97b;
  color: white;
}

.modal-btn.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
