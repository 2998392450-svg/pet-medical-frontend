<template>
  <div class="pm-page merchant-home-page">
    <div class="pm-content">
      <nav class="pm-nav-bar nav-bar">
        <div class="pm-nav-left nav-left">
          <span class="pm-back-btn back-btn" @click="logout">退出</span>
          <span class="pm-nav-title title">商家工作台</span>
        </div>
        <div class="nav-right">
          <span class="hospital-name">{{ merchant?.hospitalName || '宠物医院' }}</span>
        </div>
      </nav>

      <!-- 数据隔离提示：后端拒绝跨院请求时明确提示，不再静默展示本地缓存 -->
      <div v-if="accessNotice" class="isolation-notice">{{ accessNotice }}</div>

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

        <div v-if="filteredAppointments.length === 0" class="pm-empty">
          <div class="pm-empty-icon">📋</div>
          <p class="pm-empty-text">暂无预约</p>
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
                <span class="info-label">宠物码</span>
                <span class="info-value pet-code">{{ appt.petUuid || '暂无宠物码' }}</span>
              </div>
              <div class="appt-info">
                <span class="info-label">主人</span>
                <span class="info-value">{{ appt.userNickname || appt.userName || '匿名' }}</span>
              </div>
              <div class="appt-info" v-if="appt.userPhone || appt.contactPhone">
                <span class="info-label">电话</span>
                <span class="info-value">{{ appt.userPhone || appt.contactPhone }}</span>
              </div>
              <div class="appt-info">
                <span class="info-label">时间</span>
                <span class="info-value">{{ appt.appointmentTime }}</span>
              </div>
              <div class="appt-info">
                <span class="info-label">就诊类型</span>
                <span class="info-value">{{ getTypeText(appt.type || appt.reason) }}</span>
              </div>
              <div class="appt-info" v-if="appt.notes">
                <span class="info-label">备注</span>
                <span class="info-value">{{ appt.notes }}</span>
              </div>
            </div>
            <div class="appt-actions" v-if="appt.status === 'pending'">
              <button class="action-btn records" @click="openPetRecords(appt)">查看病历</button>
              <button class="action-btn confirm" @click="confirmAppointment(appt)">确认预约</button>
              <button class="action-btn reject" @click="rejectAppointment(appt)">拒绝</button>
              <button class="action-btn chat" @click="openChat(appt)">沟通</button>
            </div>
            <div class="appt-actions" v-else-if="appt.status === 'confirmed'">
              <button class="action-btn records" @click="openPetRecords(appt)">查看病历</button>
              <button class="action-btn complete" @click="openCompleteDialog(appt)">完成就诊</button>
              <button class="action-btn chat" @click="openChat(appt)">沟通</button>
            </div>
            <div class="appt-actions" v-else>
              <button class="action-btn records" @click="openPetRecords(appt)">查看病历</button>
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

        <div v-if="doctors.length === 0" class="pm-empty">
          <div class="pm-empty-icon">👨‍⚕️</div>
          <p class="pm-empty-text">暂无医生，点击右上角添加</p>
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

      <!-- 病历管理 -->
      <div v-else-if="activeTab === 'records'" class="tab-content records-tab">
        <div class="records-actions">
          <button class="pm-btn" @click="showRecordDialog = true">+ 开具病历</button>
          <span class="records-hint">提交后自动关联本医院，无需填写医院编号</span>
        </div>
        <MerchantCrossHospitalRecords />
        <MedicalRecordImport class="records-import" />
      </div>

      <!-- 医生添加/编辑弹窗 -->
      <div v-if="showDoctorModal" class="pm-modal-mask" @click.self="showDoctorModal = false">
        <div class="pm-modal doctor-modal">
          <div class="pm-modal-title">{{ doctorForm.id ? '编辑医生' : '添加医生' }}</div>
          <div class="modal-form">
            <div class="modal-field">
              <label class="modal-field-label">姓名 <span class="required">*</span></label>
              <input v-model="doctorForm.name" type="text" class="pm-input" placeholder="医生姓名" />
            </div>
            <div class="modal-field">
              <label class="modal-field-label">职称</label>
              <select v-model="doctorForm.title" class="pm-select">
                <option value="主任医师">主任医师</option>
                <option value="副主任医师">副主任医师</option>
                <option value="主治医师">主治医师</option>
              </select>
            </div>
            <div class="modal-field">
              <label class="modal-field-label">专业领域 <span class="required">*</span></label>
              <input v-model="doctorForm.specialty" type="text" class="pm-input" placeholder="如：犬猫内科/外科" />
            </div>
            <div class="modal-field">
              <label class="modal-field-label">接诊时间</label>
              <input v-model="doctorForm.workHours" type="text" class="pm-input" placeholder="如：09:00-17:00" />
            </div>
            <div class="modal-field">
              <label class="modal-field-label">接诊日</label>
              <select v-model="doctorForm.workDays" class="pm-select">
                <option value="1,2,3,4,5">周一至周五</option>
                <option value="1,2,3,4,5,6">周一至周六</option>
                <option value="1,2,3,4,5,6,7">每天</option>
                <option value="2,3,4,5,6">周二至周六</option>
              </select>
            </div>
            <div class="modal-field">
              <label class="modal-field-label">简介</label>
              <textarea v-model="doctorForm.description" rows="2" class="pm-textarea" placeholder="医生简介（选填）"></textarea>
            </div>
          </div>
          <div class="pm-modal-actions">
            <button class="pm-btn pm-btn-outline" @click="showDoctorModal = false">取消</button>
            <button class="pm-btn" @click="saveDoctor" :disabled="saving || !doctorForm.name || !doctorForm.specialty">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 完成就诊弹窗：可选填写诊断/治疗方案，不填走后端默认描述 -->
      <div v-if="showCompleteModal" class="pm-modal-mask" @click.self="closeCompleteDialog">
        <div class="pm-modal complete-modal">
          <div class="pm-modal-title">完成就诊</div>
          <p class="complete-hint">为「{{ completeTarget?.petName || '该宠物' }}」记录本次就诊</p>
          <p class="complete-pet-code">宠物码：{{ completeTarget?.petUuid || '暂无宠物码' }}</p>
          <div class="modal-form">
            <div class="modal-field">
              <label class="modal-field-label">诊断结果</label>
              <textarea
                v-model="completeForm.diagnosis"
                rows="3"
                class="pm-textarea"
                placeholder="如：急性肠胃炎（选填）"
                :disabled="completing"
              ></textarea>
            </div>
            <div class="modal-field">
              <label class="modal-field-label">治疗方案</label>
              <textarea
                v-model="completeForm.treatment"
                rows="3"
                class="pm-textarea"
                placeholder="如：止吐补液，3 天后复诊（选填）"
                :disabled="completing"
              ></textarea>
            </div>
            <p class="complete-tip">不填将记录为常规门诊描述</p>
          </div>
          <div class="pm-modal-actions">
            <button class="pm-btn pm-btn-outline" :disabled="completing" @click="closeCompleteDialog">取消</button>
            <button class="pm-btn" :disabled="completing" @click="confirmComplete">
              {{ completing ? '提交中...' : '确认完成' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 开具病历弹窗 -->
      <MedicalRecordDialog v-model="showRecordDialog" @success="handleRecordCreated" />
      <PetMedicalRecordDrawer v-model="showPetRecords" :pet="recordPet" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'
import { formatDateOnly } from '@/utils/date'
import {
  getMerchantSession,
  getMerchantToken,
  updateMerchantProfile,
  clearMerchantSession,
  parseTokenPayload
} from '@/utils/merchantSession'
import MedicalRecordDialog from '@/components/merchant/MedicalRecordDialog.vue'
import PetMedicalRecordDrawer from '@/components/merchant/PetMedicalRecordDrawer.vue'
import MerchantCrossHospitalRecords from '@/components/merchant/MerchantCrossHospitalRecords.vue'
import MedicalRecordImport from '@/components/merchant/MedicalRecordImport.vue'

const router = useRouter()
const merchant = ref(null)
const activeTab = ref('appointments')
const showRecordDialog = ref(false)
// 预约卡片「查看病历」只读抽屉
const showPetRecords = ref(false)
const recordPet = ref({})
const appointmentStatus = ref('all')
const sessions = ref([])
const currentSession = ref(null)
const messageInput = ref('')

// 完成就诊弹窗：可选填写诊断/治疗方案，提交时一并带给完成接口
const showCompleteModal = ref(false)
const completeTarget = ref(null)
const completing = ref(false)
const completeForm = reactive({ diagnosis: '', treatment: '' })

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
  { key: 'records', label: '病历管理', icon: '🗂️' },
  { key: 'chat', label: '在线沟通', icon: '💬' },
  { key: 'stats', label: '数据统计', icon: '📊' }
]

const handleRecordCreated = (data) => {
  alert(data && data.duplicated ? '同一份病历已存在，未重复写入' : '病历提交成功')
}

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'confirmed', label: '已确认' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

// ==================== 加载本医院所有预约 ====================
// GET /api/appointments/merchant?hospitalId=
// 流程：1.读本地离线预约 → 2.调后端接口（带 merchantToken）→ 3.合并去重 → 4.补全主人信息
// 离线模式：无 hospitalId 或无 token 时只显示本地数据
const allAppointments = ref([])
// 隔离异常提示（后端 403 等），避免把别的医院缓存当成正常数据渲染
const accessNotice = ref('')

// 商家身份只从本标签页会话中的 token 推导（只解析不验签，服务端范围校验仍由后端完成）
function currentHospitalId() {
  return String(merchant.value?.hospitalId || '')
}

// 兜底隔离：渲染前再拦一次，非本院记录一律丢弃（防守层，不替代服务端 token 限定）
function sanitizeAppointments(list) {
  const hid = currentHospitalId()
  const hname = merchant.value?.hospitalName || ''
  const kept = []
  let dropped = 0
  list.forEach(a => {
    const aHid = String(a.hospitalId || a.hospital_id || '')
    if (aHid) {
      if (hid && aHid === hid) kept.push(a)
      else dropped += 1
      return
    }
    // 老数据没有 hospitalId：必须医院名完全一致才保留
    if (hname && a.hospitalName === hname) kept.push(a)
    else dropped += 1
  })
  if (dropped > 0) console.warn('[MerchantHome] 已拦截', dropped, '条非本院预约数据')
  return kept
}

const loadAppointments = async () => {
  const hospitalId = merchant.value?.hospitalId
  const merchantHospitalName = merchant.value?.hospitalName || ''
  console.log('[MerchantHome] loadAppointments 开始, hospitalId=', hospitalId, 'hospitalName=', merchantHospitalName)
  accessNotice.value = ''

  // 1. 先从 localStorage 读取本院离线预约：只认 hospitalId，不再按医院名模糊匹配
  const localAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
  // 读取本地用户表，用于补全离线预约的主人名字和电话
  const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]')
  const myLocalAppointments = localAppointments.filter(a => {
    const aHid = String(a.hospitalId || a.hospital_id || '')
    if (aHid) return !!hospitalId && aHid === String(hospitalId)
    // 无 hospitalId 的老数据：要求医院名完全一致（不做包含/核心名匹配）
    return !!merchantHospitalName && a.hospitalName === merchantHospitalName
  }).map(a => {
    // 补全主人名字和电话：优先用 mockUsers 里的最新数据
    const localUser = mockUsers.find(u => String(u.id) === String(a.userId))
    // 统一时间字段：后端用 appointmentDate + timeSlot，离线用 appointmentTime
    const dateStr = formatDateOnly(a.appointmentDate)
    const timeStr = a.timeSlot || ''
    const appointmentTime = a.appointmentTime || (dateStr && timeStr ? `${dateStr} ${timeStr}`.trim() : dateStr || timeStr)
    // 统一就诊类型字段：后端用 reason，离线用 type
    const type = a.type || a.reason || null
    return {
      ...a,
      userNickname: a.userNickname || localUser?.nickname || a.userName || null,
      userName: a.userName || localUser?.nickname || localUser?.username || null,
      userPhone: a.userPhone || localUser?.phone || a.contactPhone || null,
      contactPhone: a.contactPhone || localUser?.phone || null,
      appointmentTime,
      type
    }
  })

  if (!hospitalId) {
    // 纯离线模式：无 hospitalId，仅保留医院名完全一致的本地数据
    allAppointments.value = sanitizeAppointments(myLocalAppointments)
    console.log('[MerchantHome] 无 hospitalId，仅显示离线预约=', allAppointments.value.length)
    await supplementUserInfo()
    return
  }
  try {
    const token = getMerchantToken()
    if (!token) {
      console.warn('[MerchantHome] merchantToken 不存在，使用离线数据')
      allAppointments.value = sanitizeAppointments(myLocalAppointments)
      return
    }
    // 医院范围只由服务端 token 推导，前端不再携带 hospitalId
    console.log('[MerchantHome] 调用后端 /appointments/merchant（范围由 token 决定）')
    const res = await axios.get('/appointments/merchant', {
      headers: { Authorization: 'Bearer ' + token }
    })
    console.log('[MerchantHome] 后端返回 code=', res.code, '预约数=', res.data?.length || 0)
    if (res.code === 200) {
      // 后端预约统一字段：生成 appointmentTime 和 type
      const backendAppointments = (res.data || []).map(a => {
        const dateStr = formatDateOnly(a.appointmentDate)
        const timeStr = a.timeSlot || ''
        const appointmentTime = a.appointmentTime || (dateStr && timeStr ? `${dateStr} ${timeStr}`.trim() : dateStr || timeStr)
        const type = a.type || a.reason || null
        return { ...a, appointmentTime, type }
      })
      // 合并后端预约与本地离线预约（后端优先，离线作补充），最后统一过隔离兜底
      const backendIds = new Set(backendAppointments.map(a => String(a.id)))
      const extraLocal = myLocalAppointments.filter(a => !backendIds.has(String(a.id)))
      allAppointments.value = sanitizeAppointments([...backendAppointments, ...extraLocal])
      console.log('[MerchantHome] 合并后总预约数=', allAppointments.value.length)
      // 对仍缺少主人信息的离线预约，从后端 /user/:id 补全
      await supplementUserInfo()
    } else {
      allAppointments.value = sanitizeAppointments(myLocalAppointments)
    }
  } catch (error) {
    const status = error?.response?.status
    if (status === 403) {
      // 凭证与商家身份不一致：不再把本地缓存当成本院数据渲染
      console.warn('[MerchantHome] 后端拒绝访问本院预约（403），清空列表')
      allAppointments.value = []
      accessNotice.value = '当前登录凭证与商家所属医院不一致，已停止展示预约数据，请重新登录后再试'
      return
    }
    console.error('[MerchantHome] 加载预约失败，使用离线数据:', error)
    allAppointments.value = sanitizeAppointments(myLocalAppointments)
  }
}

// ==================== 补全离线预约的主人信息 ====================
// 本地 mockUsers 找不到时尝试后端 GET /api/user/:id 补全主人姓名/电话
// 商家端必须显式带 merchantToken，避免被 axios 拦截器注入用户端 token
const supplementUserInfo = async () => {
  const needSupplement = allAppointments.value.filter(a => {
    const hasName = a.userNickname || a.userName
    const hasPhone = a.userPhone || a.contactPhone
    return (!hasName || !hasPhone) && a.userId
  })
  if (needSupplement.length === 0) return
  console.log('[MerchantHome] 需要补全用户信息的预约数=', needSupplement.length)
  // 只对数据库用户（小整数 ID）调后端
  const dbUserIds = [...new Set(needSupplement
    .map(a => Number(a.userId))
    .filter(id => !isNaN(id) && id > 0 && id < 100000)
  )]
  // 商家端请求必须显式带 merchantToken，避免被 axios 拦截器注入用户端 token
  const token = getMerchantToken()
  if (!token) return
  for (const uid of dbUserIds) {
    try {
      const ures = await axios.get(`/user/${uid}`, {
        headers: { Authorization: 'Bearer ' + token }
      })
      if (ures.code === 200 && ures.data) {
        const u = ures.data
        allAppointments.value.forEach(a => {
          if (String(a.userId) === String(uid)) {
            if (!a.userNickname) a.userNickname = u.nickname || u.username
            if (!a.userName) a.userName = u.nickname || u.username
            if (!a.userPhone) a.userPhone = u.phone
            if (!a.contactPhone) a.contactPhone = u.phone
          }
        })
      }
    } catch (e) {
      // 静默失败，不影响其他用户
    }
  }
}

const filteredAppointments = computed(() => {
  // 状态筛选
  const list = appointmentStatus.value === 'all'
    ? allAppointments.value
    : allAppointments.value.filter(a => a.status === appointmentStatus.value)
  // 排序：未处理(pending)排最上面，其次按预约时间倒序（最近/将来的排前面）
  const statusOrder = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 }
  return [...list].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 9
    const sb = statusOrder[b.status] ?? 9
    if (sa !== sb) return sa - sb
    // 同状态按预约时间倒序（时间字符串格式：YYYY-MM-DD HH:mm）
    const ta = a.appointmentTime || a.appointmentDate || a.createdAt || ''
    const tb = b.appointmentTime || b.appointmentDate || b.createdAt || ''
    return tb.localeCompare(ta)
  })
})

const pendingCount = computed(() => allAppointments.value.filter(a => a.status === 'pending').length)
const confirmedCount = computed(() => allAppointments.value.filter(a => a.status === 'confirmed').length)
const completedCount = computed(() => allAppointments.value.filter(a => a.status === 'completed').length)

const getStatusText = (status) => {
  const map = { pending: '待处理', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }
  return map[status] || status
}

// 就诊类型英文 key 转中文
const getTypeText = (type) => {
  if (!type) return '常规检查'
  const map = {
    checkup: '常规检查',
    vaccination: '疫苗接种',
    treatment: '疾病治疗',
    surgery: '手术',
    grooming: '美容护理',
    other: '其他'
  }
  // 如果传入的已经是中文（不在 map 里），直接返回
  return map[type] || type
}

// 判断是否为离线预约（id 为 Date.now 时间戳或 nearby_ 前缀，不在数据库中）
const isOfflineAppointment = (appt) => {
  const id = String(appt.id || '')
  // nearby_ 前缀或非纯数字 id（如 1782881234567 时间戳也走离线，因为不在数据库）
  // 真实数据库 id 通常是小的自增整数（< 100000）
  if (id.startsWith('nearby_')) return true
  const numId = Number(id)
  if (!isNaN(numId) && numId > 100000) return true  // 时间戳 id
  // 也可以通过 isNearby 标记判断
  if (appt.isNearby) return true
  return false
}

// 更新离线预约状态（直接操作 localStorage.mockAppointments）
const updateOfflineAppointmentStatus = (appt, newStatus) => {
  const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
  const idx = mockAppointments.findIndex(a => String(a.id) === String(appt.id))
  if (idx !== -1) {
    mockAppointments[idx].status = newStatus
    localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    return true
  }
  return false
}

// ==================== 确认预约 ====================
// PUT /api/appointments/:id/status  status=confirm
// 流程：1.离线预约直接改 localStorage → 2.在线预约调后端 → 3.失败降级到 localStorage
// 确认后通过聊天系统消息通知宠主
const confirmAppointment = async (appt) => {
  // 离线预约（nearby_/时间戳 id）直接走 localStorage，不调后端
  if (isOfflineAppointment(appt)) {
    const ok = updateOfflineAppointmentStatus(appt, 'confirmed')
    if (ok) {
      addSystemMessage(appt, '您的预约已确认！请按时到院就诊。')
      alert('已确认预约（离线预约）')
      await loadAppointments()
    } else {
      alert('确认失败：未找到该预约')
    }
    return
  }
  try {
    const token = getMerchantToken()
    await axios.put(`/appointments/${appt.id}/status`, { status: 'confirm' }, { headers: { Authorization: 'Bearer ' + token } })
    addSystemMessage(appt, '您的预约已确认！请按时到院就诊。')
    alert('已确认预约')
    await loadAppointments()
  } catch (error) {
    console.error('[MerchantHome] 确认失败，使用离线模式:', error)
    const ok = updateOfflineAppointmentStatus(appt, 'confirmed')
    if (ok) {
      addSystemMessage(appt, '您的预约已确认！请按时到院就诊。')
      alert('已确认预约（离线模式）')
      await loadAppointments()
    }
  }
}

// ==================== 拒绝预约 ====================
// PUT /api/appointments/:id/status  status=cancel
// 离线预约直接改 localStorage，在线预约调后端，失败降级
const rejectAppointment = async (appt) => {
  if (!confirm('确定拒绝此预约吗？')) return
  // 离线预约直接走 localStorage
  if (isOfflineAppointment(appt)) {
    const ok = updateOfflineAppointmentStatus(appt, 'cancelled')
    if (ok) {
      addSystemMessage(appt, '很抱歉，您的预约未能通过，详情请咨询。')
      alert('已拒绝预约（离线预约）')
      await loadAppointments()
    }
    return
  }
  try {
    const token = getMerchantToken()
    await axios.put(`/appointments/${appt.id}/status`, { status: 'cancel' }, { headers: { Authorization: 'Bearer ' + token } })
    addSystemMessage(appt, '很抱歉，您的预约未能通过，详情请咨询。')
    alert('已拒绝预约')
    await loadAppointments()
  } catch (error) {
    console.error('[MerchantHome] 拒绝失败，使用离线模式:', error)
    const ok = updateOfflineAppointmentStatus(appt, 'cancelled')
    if (ok) {
      addSystemMessage(appt, '很抱歉，您的预约未能通过，详情请咨询。')
      alert('已拒绝预约（离线模式）')
      await loadAppointments()
    }
  }
}

// ==================== 查看病历档案 ====================
// 无 pet_uuid 时不发请求，直接提示
const openPetRecords = (appt) => {
  if (!appt.petUuid) {
    alert('该宠物暂无宠物码，无法调阅病历档案')
    return
  }
  recordPet.value = { name: appt.petName, petUuid: appt.petUuid }
  showPetRecords.value = true
}

// ==================== 完成就诊 ====================
// PUT /api/appointments/:id/status  status=complete
// 弹窗可选填写诊断/治疗方案，一并提交；不填则由后端写入常规门诊默认描述

// 打开弹窗：每次重置填写内容
const openCompleteDialog = (appt) => {
  completeTarget.value = appt
  completeForm.diagnosis = ''
  completeForm.treatment = ''
  showCompleteModal.value = true
}

// 取消弹窗：不做任何提交，预约状态保持不变
const closeCompleteDialog = () => {
  if (completing.value) return
  showCompleteModal.value = false
  completeTarget.value = null
}

const confirmComplete = async () => {
  // 防连点：提交中直接忽略再次点击
  if (completing.value || !completeTarget.value) return
  const appt = completeTarget.value
  completing.value = true

  const payload = { status: 'complete' }
  if (completeForm.diagnosis.trim()) payload.diagnosis = completeForm.diagnosis.trim()
  if (completeForm.treatment.trim()) payload.treatment = completeForm.treatment.trim()

  try {
    // 离线预约直接走 localStorage
    if (isOfflineAppointment(appt)) {
      const ok = updateOfflineAppointmentStatus(appt, 'completed')
      if (!ok) {
        alert('完成失败：未找到该预约')
        return
      }
      addSystemMessage(appt, '就诊已完成，祝您的宠物健康！期待您的评价。')
      showCompleteModal.value = false
      completeTarget.value = null
      alert('已标记完成（离线预约）')
      await loadAppointments()
      return
    }

    try {
      const token = getMerchantToken()
      await axios.put(`/appointments/${appt.id}/status`, payload, { headers: { Authorization: 'Bearer ' + token } })
      addSystemMessage(appt, '就诊已完成，祝您的宠物健康！期待您的评价。')
      showCompleteModal.value = false
      completeTarget.value = null
      alert('已标记完成')
      await loadAppointments()
    } catch (error) {
      console.error('[MerchantHome] 完成失败，使用离线模式:', error)
      const ok = updateOfflineAppointmentStatus(appt, 'completed')
      if (ok) {
        addSystemMessage(appt, '就诊已完成，祝您的宠物健康！期待您的评价。')
        showCompleteModal.value = false
        completeTarget.value = null
        alert('已标记完成（离线模式）')
        await loadAppointments()
      }
    }
  } finally {
    completing.value = false
  }
}

// ==================== 医生管理 ====================
// GET /api/merchant/doctors  获取本院医生列表
// POST /api/merchant/doctors  新增医生
// PUT /api/merchant/doctors/:id  修改医生
// DELETE /api/merchant/doctors/:id  删除医生
// 所有接口都需在 Header 带 merchantToken 鉴权
const loadDoctors = async () => {
  const token = getMerchantToken()
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
  const token = getMerchantToken()
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
  const token = getMerchantToken()
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

// 在线沟通（严格按 hospitalId 隔离：仅当前医院 key 下的本院会话可见）
// 数据结构：merchantChats[hospitalIdKey][userId] = { userId, appointmentId, userName, petName, hospitalName, hospitalId, messages: [...] }

const unreadCount = computed(() => sessions.value.reduce((sum, s) => sum + (s.unread || 0), 0))

// 判断一个 session 是否属于当前商家：只认 hospitalId；旧数据没有 hospitalId 时才允许医院名完全一致
const isSessionForThisMerchant = (session, hid, merchantName) => {
  const sHid = String(session.hospitalId || '')
  if (sHid) return !!hid && sHid === hid
  if (!session.hospitalName || !merchantName) return false
  return session.hospitalName === merchantName
}

// 跨所有 key 查找某个 userId 的会话（合并所有来源 key 的消息）
const readSession = (userId) => {
  const hid = String(merchant.value?.hospitalId || '')
  const merchantName = merchant.value?.hospitalName || ''
  const uid = String(userId)
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  
  let merged = null
  const sourceKeys = []
  
  for (const key of Object.keys(data)) {
    const s = data[key]?.[uid]
    if (s && isSessionForThisMerchant(s, hid, merchantName)) {
      if (!merged) {
        merged = JSON.parse(JSON.stringify(s))
        merged._sourceKeys = [key]
      } else {
        // 合并消息（去重，按 content+time 判断）
        const existingKeys = new Set(merged.messages.map(m => m.from + '|' + m.content + '|' + m.time))
        for (const m of (s.messages || [])) {
          const mk = m.from + '|' + m.content + '|' + m.time
          if (!existingKeys.has(mk)) {
            merged.messages.push(m)
            existingKeys.add(mk)
          }
        }
        merged._sourceKeys.push(key)
      }
    }
  }
  
  if (merged && merged.messages) {
    merged.messages.sort((a, b) => {
      const ta = new Date('1970/01/01 ' + (a.time || '00:00:00')).getTime()
      const tb = new Date('1970/01/01 ' + (b.time || '00:00:00')).getTime()
      return ta - tb
    })
  }
  return merged
}

// 写入会话：只写当前商家所属医院的 key，避免把消息落到别的医院空间
const writeSession = (userId, session) => {
  const hid = String(merchant.value?.hospitalId || '')
  if (!hid) return
  // 会话本身属于别的医院时不落盘（正常流程不会出现，出现说明数据已串，直接丢弃）
  const sHid = String(session.hospitalId || '')
  if (sHid && sHid !== hid) {
    console.warn('[MerchantHome] 丢弃非本院会话写入, session.hospitalId=', sHid)
    return
  }
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  const cleanSession = JSON.parse(JSON.stringify(session))
  delete cleanSession._sourceKeys
  cleanSession.hospitalId = hid
  if (!data[hid]) data[hid] = {}
  data[hid][String(userId)] = cleanSession
  localStorage.setItem('merchantChats', JSON.stringify(data))
}

// ==================== 加载聊天会话列表 ====================
// 从 localStorage.merchantChats 读取所有属于本院的会话
// 跨 hospitalId key 合并（处理 nearby_ 医院 ID 不一致的情况）
// 商家端会话未读数 = 该会话中宠主发来且商家未读的消息数
const loadSessions = () => {
  const hid = String(merchant.value?.hospitalId || '')
  const merchantName = merchant.value?.hospitalName || ''
  const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
  
  // 按 userId 合并所有匹配当前商家的会话（跨所有 key）
  const mergedMap = {}
  
  for (const key of Object.keys(data)) {
    const hospitalChats = data[key] || {}
    for (const uid of Object.keys(hospitalChats)) {
      const s = hospitalChats[uid]
      if (!s) continue
      if (!isSessionForThisMerchant(s, hid, merchantName)) continue
      
      if (!mergedMap[uid]) {
        mergedMap[uid] = JSON.parse(JSON.stringify(s))
        mergedMap[uid]._sourceKeys = [key]
      } else {
        // 合并消息
        const existing = mergedMap[uid]
        const existingKeys = new Set((existing.messages || []).map(m => m.from + '|' + m.content + '|' + m.time))
        for (const m of (s.messages || [])) {
          const mk = m.from + '|' + m.content + '|' + m.time
          if (!existingKeys.has(mk)) {
            existing.messages.push(m)
            existingKeys.add(mk)
          }
        }
        if (!existing._sourceKeys.includes(key)) existing._sourceKeys.push(key)
        // 更新用户/宠物信息为最新
        if (s.userName) existing.userName = s.userName
        if (s.petName) existing.petName = s.petName
        if (s.appointmentId) existing.appointmentId = s.appointmentId
      }
    }
  }
  
  // 排序消息、计算未读和最后消息
  const result = Object.values(mergedMap).map(s => {
    if (s.messages) {
      s.messages.sort((a, b) => {
        const ta = new Date('1970/01/01 ' + (a.time || '00:00:00')).getTime()
        const tb = new Date('1970/01/01 ' + (b.time || '00:00:00')).getTime()
        return ta - tb
      })
    }
    return {
      ...s,
      unread: s.messages?.filter(m => m.from === 'user' && !m.merchantRead).length || 0,
      lastMessage: s.messages?.length > 0 ? s.messages[s.messages.length - 1].content : ''
    }
  })
  
  // 按最后消息时间排序
  result.sort((a, b) => {
    const ta = a.messages?.length > 0 ? new Date('1970/01/01 ' + (a.messages[a.messages.length - 1].time || '00:00:00')).getTime() : 0
    const tb = b.messages?.length > 0 ? new Date('1970/01/01 ' + (b.messages[b.messages.length - 1].time || '00:00:00')).getTime() : 0
    return tb - ta
  })

  // 从 mockUsers 同步最新用户名（离线用户）
  const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]')
  result.forEach(s => {
    const uid = String(s.userId || '')
    // 跳过 user_ 前缀的临时 ID
    if (uid.startsWith('user_')) return
    const localUser = mockUsers.find(u => String(u.id) === uid)
    if (localUser) {
      const latestName = localUser.nickname || localUser.username
      if (latestName && s.userName !== latestName) {
        s.userName = latestName
        // 同步写回 localStorage（只写本院 key，不触碰其他医院空间）
        const data = JSON.parse(localStorage.getItem('merchantChats') || '{}')
        if (data[hid] && data[hid][uid]) {
          data[hid][uid].userName = latestName
          localStorage.setItem('merchantChats', JSON.stringify(data))
        }
      }
    }
  })

  // 对数据库用户 ID 异步从后端补全最新昵称
  syncSessionUserNamesFromBackend(result)

  sessions.value = result

  // 如果当前打开了某个会话，同步最新消息
  if (currentSession.value) {
    const fresh = sessions.value.find(s => String(s.userId) === String(currentSession.value.userId))
    if (fresh) {
      currentSession.value = JSON.parse(JSON.stringify(fresh))
    }
  }
}

// 异步从后端 /user/:id 补全会话用户名（数据库用户）
const syncSessionUserNamesFromBackend = async (sessionList) => {
  const dbUserIds = [...new Set(
    sessionList
      .map(s => Number(s.userId))
      .filter(id => !isNaN(id) && id > 0 && id < 100000)
  )]
  if (dbUserIds.length === 0) return
  // 商家端请求必须显式带 merchantToken，避免被 axios 拦截器注入用户端 token
  const token = getMerchantToken()
  if (!token) return
  let updated = false
  for (const uid of dbUserIds) {
    try {
      const res = await axios.get(`/user/${uid}`, {
        headers: { Authorization: 'Bearer ' + token }
      })
      if (res.code === 200 && res.data) {
        const latestName = res.data.nickname || res.data.username
        sessionList.forEach(s => {
          if (String(s.userId) === String(uid) && latestName && s.userName !== latestName) {
            s.userName = latestName
            updated = true
          }
        })
      }
    } catch (e) {
      // 静默失败
    }
  }
  if (updated) {
    // 触发响应式更新
    sessions.value = [...sessionList]
    if (currentSession.value) {
      const fresh = sessions.value.find(s => String(s.userId) === String(currentSession.value.userId))
      if (fresh) currentSession.value = JSON.parse(JSON.stringify(fresh))
    }
  }
}

const currentMessages = computed(() => currentSession.value?.messages || [])

const selectSession = (session) => {
  const userId = session.userId
  // 读取最新的合并会话
  const latest = readSession(userId) || session
  if (latest.messages) {
    latest.messages.forEach(m => { if (m.from === 'user') m.merchantRead = true })
  }
  latest.unread = 0
  writeSession(userId, latest)
  // 更新内存
  const fresh = { ...latest, unread: 0, lastMessage: latest.messages?.length > 0 ? latest.messages[latest.messages.length - 1].content : '' }
  const idx = sessions.value.findIndex(s => String(s.userId) === String(userId))
  if (idx !== -1) sessions.value[idx] = fresh
  currentSession.value = JSON.parse(JSON.stringify(fresh))
}

// ==================== 打开聊天弹窗（从预约进入）====================
// 商家端从预约卡片点击"沟通"进入，自动定位或创建对应宠主会话
// 打开时将该会话未读数清零
const openChat = (appt) => {
  const userId = appt.userId || ('user_' + appt.id)
  let session = sessions.value.find(s => String(s.userId) === String(userId) || s.appointmentId === appt.id)
  // 优先使用预约里的最新主人名字（userNickname > userName > mockUsers > '用户'）
  const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]')
  const localUser = mockUsers.find(u => String(u.id) === String(appt.userId))
  const latestUserName = appt.userNickname || appt.userName || localUser?.nickname || localUser?.username || '用户'
  if (!session) {
    const existing = readSession(userId)
    if (existing) {
      session = {
        ...existing,
        // 同步最新用户名
        userName: latestUserName !== '用户' ? latestUserName : (existing.userName || '用户'),
        unread: existing.messages?.filter(m => m.from === 'user' && !m.merchantRead).length || 0,
        lastMessage: existing.messages?.length > 0 ? existing.messages[existing.messages.length - 1].content : ''
      }
    } else {
      session = {
        userId: userId,
        appointmentId: appt.id,
        userName: latestUserName,
        petName: appt.petName,
        hospitalId: String(merchant.value?.hospitalId || ''),
        hospitalName: merchant.value?.hospitalName || '',
        messages: [],
        _sourceKeys: [String(merchant.value?.hospitalId || '')],
        unread: 0,
        lastMessage: ''
      }
      sessions.value.push(session)
      writeSession(userId, session)
    }
  } else if (latestUserName !== '用户' && session.userName !== latestUserName) {
    // 已有会话也同步最新用户名
    session.userName = latestUserName
  }
  activeTab.value = 'chat'
  selectSession(session)
}

const addSystemMessage = (appt, content) => {
  const userId = appt.userId || ('user_' + appt.id)
  // 关键：先从 localStorage 读取最新会话，避免覆盖用户端刚发的消息
  let session = readSession(userId) || {
    userId: userId,
    appointmentId: appt.id,
    userName: appt.userNickname || appt.userName || '用户',
    petName: appt.petName,
    hospitalId: String(merchant.value?.hospitalId || ''),
    messages: [],
    unread: 0,
    lastMessage: ''
  }
  if (!session.messages) session.messages = []
  session.messages.push({
    from: 'merchant',
    content: content,
    time: new Date().toLocaleTimeString('en-GB'),
    userRead: false,
    appointmentId: appt.id
  })
  session.lastMessage = content
  writeSession(userId, session)
  // 同步到内存中的 sessions
  const idx = sessions.value.findIndex(s => String(s.userId) === String(userId))
  if (idx !== -1) {
    sessions.value[idx] = { ...session, unread: 0, lastMessage: content }
  } else {
    sessions.value.push({ ...session, unread: 0, lastMessage: content })
  }
}

// ==================== 发送消息 ====================
// 商家发送的消息 from='merchant'，宠主端会显示在左侧
// 关键：先从 localStorage 读取最新会话再追加，避免覆盖宠主刚发的消息
const sendMessage = () => {
  if (!messageInput.value.trim() || !currentSession.value) return
  const userId = currentSession.value.userId
  // 关键：先从 localStorage 读取最新会话，避免覆盖用户端刚发的消息
  let session = readSession(userId) || currentSession.value
  if (!session.messages) session.messages = []
  session.messages.push({
    from: 'merchant',
    content: messageInput.value.trim(),
    time: new Date().toLocaleTimeString('en-GB'),
    userRead: false,
    appointmentId: currentSession.value.appointmentId
  })
  session.lastMessage = messageInput.value.trim()
  messageInput.value = ''
  writeSession(userId, session)
  // 更新当前会话视图（深度克隆，避免 reactive 污染）
  currentSession.value = JSON.parse(JSON.stringify(session))
}

const logout = () => {
  // 只清理本标签页的商家会话；其他窗口的登录态不受影响
  clearMerchantSession(getMerchantToken())
  router.push('/merchant/login')
}

// 跨标签页隔离：商家会话按标签页保存在 sessionStorage。
// 同一浏览器另一个窗口登录其他医院只会改写 localStorage 的“最近一次登录”回退值，
// 不会影响本标签页的 token 与商家身份，因此这里不监听 storage、也不 reload。

// 定时轮询：刷新会话未读数 + 刷新预约（用户端新发消息/新预约实时同步）
let pollTimer = null
let polling = false  // 防重入标志：避免上一轮未完成就启动下一轮导致请求堆积

// 从公开接口校正医院名称（切号后 localStorage 里可能残留上一家的名称）
// 只校正展示名，不改变数据范围：范围始终由服务端 token 决定
const syncHospitalNameFromServer = async () => {
  const hid = merchant.value?.hospitalId
  if (!hid) return
  try {
    const res = await axios.get(`/hospitals/${hid}`)
    const name = res && res.code === 200 ? (res.data?.name || '') : ''
    if (name && merchant.value.hospitalName !== name) {
      console.log('[MerchantHome] 校正医院名称:', merchant.value.hospitalName, '->', name)
      merchant.value.hospitalName = name
      updateMerchantProfile(merchant.value)
    }
  } catch (e) {
    // 名称校正失败不影响主流程与数据隔离
  }
}

onMounted(() => {
  // 商家身份只认本标签页的会话（sessionStorage 私有），
  // 不再读取可能被其他窗口登录覆盖的全局 merchant/merchantToken 键
  const session = getMerchantSession()
  if (!session) {
    router.push('/merchant/login')
    return
  }

  merchant.value = session.merchant
  console.log('[MerchantHome] 当前商家信息:', merchant.value)

  // token 才是服务端数据范围的唯一真源：资料与 token 不一致时只校正资料，不删除有效凭证
  const payload = parseTokenPayload(session.token)
  const tokenHid = payload && payload.hospitalId ? Number(payload.hospitalId) : null
  if (tokenHid && String(merchant.value.hospitalId || '') !== String(tokenHid)) {
    console.warn('[MerchantHome] 商家资料与 token 不一致，按 token 同步医院范围:', merchant.value.hospitalId, '->', tokenHid)
    merchant.value = {
      ...merchant.value,
      id: payload.id,
      username: payload.username,
      role: 'merchant',
      hospitalId: tokenHid,
      hospitalName: ''
    }
    updateMerchantProfile(merchant.value)
  }
  // 缺少 hospitalId 的旧账号/未绑定医院的商家：保留登录态，仅提示，不清理凭证
  if (!merchant.value.hospitalId) {
    console.warn('[MerchantHome] 缺少 hospitalId：数据范围仍由 token 决定，不清理凭证')
    accessNotice.value = '未能识别商家所属医院，请联系管理员检查账号配置'
  }

  syncHospitalNameFromServer()
  loadAppointments()
  loadSessions()
  loadDoctors()
  // 每 4 秒轮询一次（防重入：上一轮未完成则跳过本次）
  pollTimer = setInterval(async () => {
    if (polling) return
    polling = true
    try {
      loadSessions()
      await loadAppointments()
    } finally {
      polling = false
    }
  }, 4000)
})

onUnmounted(() => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
})
</script>

<style scoped>
/* ===== 商家工作台：粉色爪子主题，保留预约 / 聊天 / 医生管理布局 ===== */
.merchant-home-page {
  padding-bottom: 40px;
}

/* 顶部导航在 pm-nav-bar 基础上微调 */
.nav-bar {
  padding: 14px 20px;
}

.nav-left {
  gap: 10px;
}

.back-btn {
  font-size: 14px;
  padding: 6px 14px;
  background: rgba(214, 112, 159, 0.08);
  color: #d6709f;
  border-radius: 16px;
  border: 1px solid rgba(214, 112, 159, 0.2);
}

.nav-right {
  display: flex;
  align-items: center;
}

.hospital-name {
  font-size: 13px;
  color: #d6709f;
  background: rgba(214, 112, 159, 0.08);
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid rgba(214, 112, 159, 0.15);
}

/* 数据隔离提示条 */
.isolation-notice {
  margin: 12px 16px 0;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #b4472f;
  background: #fff5f0;
  border: 1px solid #ffd6c5;
  border-radius: 10px;
}

/* Tab 切换 */
.tab-bar {
  display: flex;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  padding: 0 10px;
  border-bottom: 1px solid #ffe8f0;
  position: sticky;
  top: 56px;
  z-index: 50;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  color: #b094b8;
  cursor: pointer;
  font-size: 13px;
  position: relative;
  transition: color 0.3s;
}

.tab:hover {
  color: #d6709f;
}

.tab.active {
  color: #d6709f;
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
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
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
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border-radius: 9px;
  font-size: 11px;
  margin-left: 4px;
}

.tab-content {
  padding: 15px;
}

/* 病历管理 */
.records-tab {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.records-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.records-hint {
  font-size: 12px;
  color: #b094b8;
}

.records-import {
  display: block;
}

/* 状态筛选 */
.status-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  overflow-x: auto;
  padding-bottom: 5px;
}

.status-chip {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.85);
  color: #b094b8;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid #ffe8f0;
  transition: all 0.2s;
}

.status-chip:hover {
  border-color: #ffb3c8;
  color: #d6709f;
}

.status-chip.active {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.25);
}

/* 预约列表 */
.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.appointment-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.08);
  transition: all 0.3s;
}

.appointment-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(214, 112, 159, 0.14);
  border-color: rgba(255, 179, 200, 0.6);
}

.appt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.appt-no {
  font-size: 13px;
  color: #b094b8;
  font-weight: 600;
}

.status-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.status-tag.pending { background: rgba(255, 152, 0, 0.15); color: #ff9800; }
.status-tag.confirmed { background: rgba(33, 150, 243, 0.15); color: #2196f3; }
.status-tag.completed { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
.status-tag.cancelled { background: rgba(158, 158, 158, 0.18); color: #9e9e9e; }

.appt-body {
  margin-bottom: 12px;
}

.appt-info {
  display: flex;
  gap: 10px;
  font-size: 13px;
  margin-bottom: 6px;
}

.pet-code {
  font-size: 12px;
  color: var(--pm-primary);
  opacity: 0.85;
  word-break: break-all;
}

.info-label {
  color: #b094b8;
  min-width: 60px;
}

.info-value {
  color: #5a4a5a;
  flex: 1;
}

.appt-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #ffe8f0;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.action-btn.confirm {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  box-shadow: 0 3px 10px rgba(214, 112, 159, 0.25);
}

.action-btn.reject {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.3);
}

.action-btn.complete {
  background: rgba(76, 175, 80, 0.12);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.action-btn.chat {
  background: rgba(214, 112, 159, 0.1);
  color: #d6709f;
  border: 1px solid rgba(214, 112, 159, 0.25);
}

/* 查看病历：次要样式，不与确认/完成抢视觉重心 */
.action-btn.records {
  background: #fff;
  color: #8a7a86;
  border: 1px dashed #e7d3dd;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

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
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-right: 1px solid #ffe8f0;
  overflow-y: auto;
}

.empty-session {
  padding: 40px 15px;
  text-align: center;
  color: #b094b8;
  font-size: 13px;
}

.empty-tip {
  font-size: 11px;
  margin-top: 5px;
  color: #c8b0c0;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #ffe8f0;
  transition: background 0.2s;
}

.session-item:hover { background: rgba(214, 112, 159, 0.04); }
.session-item.active {
  background: rgba(214, 112, 159, 0.1);
  border-left: 3px solid #d6709f;
}

.session-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
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
  color: #5a4a5a;
  font-weight: 500;
}

.session-preview {
  font-size: 12px;
  color: #b094b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-badge {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  height: 18px;
  line-height: 18px;
  box-shadow: 0 2px 6px rgba(214, 112, 159, 0.3);
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 245, 247, 0.5);
}

.no-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c8b0c0;
}

.no-chat-icon {
  font-size: 60px;
  margin-bottom: 10px;
  opacity: 0.6;
}

.chat-header {
  padding: 12px 15px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #ffe8f0;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: #5a4a5a;
}

.chat-pet {
  font-weight: 400;
  font-size: 12px;
  color: #b094b8;
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
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(214, 112, 159, 0.2);
}

.message.received .msg-bubble {
  background: white;
  color: #5a4a5a;
  border-bottom-left-radius: 4px;
  border: 1px solid #ffe8f0;
}

.msg-time {
  font-size: 10px;
  color: #c8b0c0;
  margin-top: 4px;
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid #ffe8f0;
}

.chat-input-area input {
  flex: 1;
  height: 40px;
  padding: 0 15px;
  background: #fff;
  border: 2px solid #ffe8f0;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  color: #5a4a5a;
  transition: all 0.3s;
}

.chat-input-area input:focus {
  border-color: #ffb3c8;
  box-shadow: 0 0 0 4px rgba(255, 179, 200, 0.12);
}

.chat-input-area input::placeholder {
  color: #c8b0c0;
}

.send-btn {
  padding: 0 20px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.3);
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(214, 112, 159, 0.4);
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
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 25px 15px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.08);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(214, 112, 159, 0.14);
}

.stat-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #d6709f;
}

.stat-label {
  font-size: 13px;
  color: #b094b8;
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
  color: #5a4a5a;
  margin: 0;
}

.add-doctor-btn {
  padding: 8px 18px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.25);
  transition: all 0.2s;
}

.add-doctor-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(214, 112, 159, 0.35);
}

.doctor-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doctor-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.08);
  display: flex;
  align-items: flex-start;
  gap: 15px;
  transition: all 0.3s;
}

.doctor-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(214, 112, 159, 0.14);
  border-color: rgba(255, 179, 200, 0.6);
}

.doc-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(214, 112, 159, 0.12);
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
  flex-wrap: wrap;
}

.doc-name {
  font-size: 16px;
  font-weight: 600;
  color: #5a4a5a;
}

.doc-title {
  font-size: 11px;
  color: #d6709f;
  background: rgba(214, 112, 159, 0.12);
  padding: 2px 8px;
  border-radius: 10px;
}

.doc-row {
  font-size: 13px;
  color: #5a4a5a;
  margin-bottom: 4px;
}

.doc-label {
  color: #b094b8;
  min-width: 60px;
  display: inline-block;
}

.doc-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn.edit {
  background: rgba(214, 112, 159, 0.1);
  color: #d6709f;
  border: 1px solid rgba(214, 112, 159, 0.25);
}

/* 医生弹窗在 pm-modal 基础上扩展 */
.doctor-modal {
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
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

.modal-field-label {
  font-size: 13px;
  color: #b094b8;
  font-weight: 500;
}

.required {
  color: #ff6b6b;
}

/* 完成就诊弹窗 */
.complete-modal {
  max-width: 440px;
}

.complete-hint {
  margin: -4px 0 12px;
  font-size: 13px;
  color: var(--pm-text-sub);
}

.complete-pet-code {
  margin: -8px 0 12px;
  font-size: 12px;
  color: var(--pm-primary);
  word-break: break-all;
}

.complete-tip {
  margin: 0;
  font-size: 12px;
  color: var(--pm-primary);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .chat-layout {
    flex-direction: column;
    height: auto;
  }
  .session-list {
    width: 100%;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid #ffe8f0;
  }
  .chat-window {
    height: 60vh;
  }
  .tab {
    font-size: 12px;
  }
  .tab-icon {
    display: none;
  }
}
</style>
