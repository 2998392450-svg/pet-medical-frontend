<template>
  <div class="pm-page admin-page">
    <div class="pm-content">
      <div class="pm-nav-bar admin-header">
        <div class="pm-nav-left header-left">
          <span class="pm-logo">🛡️</span>
          <span class="pm-nav-title">管理员后台</span>
        </div>
        <div class="header-right">
          <span class="welcome">欢迎，{{ admin.nickname || admin.username }}</span>
          <button class="pm-logout-btn" @click="logout">退出</button>
        </div>
      </div>

      <!-- 功能模块 Tab -->
      <div class="main-tabs">
        <button :class="['main-tab', activeModule === 'overview' ? 'active' : '']" @click="switchModule('overview')">
          📊 平台概览
        </button>
        <button :class="['main-tab', activeModule === 'appointments' ? 'active' : '']" @click="switchModule('appointments')">
          📋 预约监管
        </button>
        <button :class="['main-tab', activeModule === 'applications' ? 'active' : '']" @click="switchModule('applications')">
          ✅ 入驻审核
        </button>
      </div>

      <!-- ===== 平台概览 ===== -->
      <div v-if="activeModule === 'overview'" class="overview-panel">
        <!-- 核心数据卡片 -->
        <div class="stats-grid">
          <div class="stat-card today">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayAppointmentCount || 0 }}</div>
              <div class="stat-label">今日预约</div>
            </div>
          </div>
          <div class="stat-card pending">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingAppointmentCount || 0 }}</div>
              <div class="stat-label">待处理预约</div>
            </div>
          </div>
          <div class="stat-card hospital">
            <div class="stat-icon">🏥</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.hospitalCount || 0 }}</div>
              <div class="stat-label">入驻医院</div>
            </div>
          </div>
          <div class="stat-card user">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.userCount || 0 }}</div>
              <div class="stat-label">注册用户</div>
            </div>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-header">
              <span class="chart-title">📈 预约趋势</span>
              <div class="chart-tabs">
                <button :class="['chart-tab', trendDays === 7 ? 'active' : '']" @click="loadTrend(7)">近7天</button>
                <button :class="['chart-tab', trendDays === 30 ? 'active' : '']" @click="loadTrend(30)">近30天</button>
              </div>
            </div>
            <div ref="trendChartRef" class="chart-container"></div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <span class="chart-title">📊 医院预约量统计</span>
            </div>
            <div ref="ratioChartRef" class="chart-container"></div>
          </div>
        </div>
      </div>

      <!-- ===== 预约监管 ===== -->
      <div v-if="activeModule === 'appointments'" class="appointment-panel">
        <div class="filter-bar">
          <select v-model="appointmentFilter.status" class="filter-select">
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="confirmed">已确认</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <select v-model="appointmentFilter.hospitalId" class="filter-select">
            <option value="">全部医院</option>
            <option v-for="h in hospitals" :key="h.id" :value="h.id">{{ h.name }}</option>
          </select>
          <button class="filter-btn" @click="loadAppointments">查询</button>
        </div>

        <div v-if="appointmentLoading" class="pm-loading">加载中...</div>
        <div v-else-if="appointments.length === 0" class="pm-empty">
          <div class="pm-empty-icon">📭</div>
          <p class="pm-empty-text">暂无预约数据</p>
        </div>
        <div v-else class="appointment-table">
          <table>
            <thead>
              <tr>
                <th>医院</th>
                <th>主人</th>
                <th>宠物</th>
                <th>预约时间</th>
                <th>就诊类型</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="appt in appointments" :key="appt.id">
                <td>{{ appt.hospitalName || '-' }}</td>
                <td>
                  <div>{{ appt.userNickname || appt.userName || '匿名' }}</div>
                  <div class="small-text">{{ appt.userPhone || appt.contactPhone || '-' }}</div>
                </td>
                <td>{{ appt.petName || '-' }} ({{ appt.petBreed || '-' }})</td>
                <td>{{ formatDateTime(appt.appointmentDate, appt.timeSlot) }}</td>
                <td>{{ getVisitTypeText(appt.reason) }}</td>
                <td><span :class="['status-badge', appt.status]">{{ getStatusText(appt.status) }}</span></td>
                <td>
                  <button v-if="appt.status !== 'completed' && appt.status !== 'cancelled'"
                    class="action-btn-small force-complete" @click="forceComplete(appt)">
                    ✅ 完成
                  </button>
                  <button v-if="appt.status !== 'cancelled'"
                    class="action-btn-small force-cancel" @click="forceCancel(appt)">
                    ❌ 取消
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== 商家入驻审核 ===== -->
      <div v-if="activeModule === 'applications'" class="application-panel">
        <div class="tabs">
          <button :class="['tab', currentTab === 'pending' ? 'active' : '']" @click="switchTab('pending')">
            待审核 ({{ stats.pendingCount || 0 }})
          </button>
          <button :class="['tab', currentTab === 'approved' ? 'active' : '']" @click="switchTab('approved')">
            已通过
          </button>
          <button :class="['tab', currentTab === 'rejected' ? 'active' : '']" @click="switchTab('rejected')">
            已拒绝
          </button>
        </div>

        <div v-if="loading" class="pm-loading">加载中...</div>
        <div v-else-if="filteredApps.length === 0" class="pm-empty">
          <div class="pm-empty-icon">📭</div>
          <p class="pm-empty-text">暂无{{ currentTab === 'pending' ? '待审核' : currentTab === 'approved' ? '已通过' : '已拒绝' }}的申请</p>
        </div>

        <div v-else v-for="app in filteredApps" :key="app.id" class="app-card">
          <div class="app-header">
            <div class="app-title">
              <span class="hospital-name">{{ app.hospitalName }}</span>
              <span v-if="app.autoMatched" class="badge auto">自动认证</span>
              <span :class="['badge', 'status-' + app.status]">{{ statusText(app.status) }}</span>
            </div>
            <div class="app-time">提交时间：{{ formatTime(app.createdAt) }}</div>
          </div>

          <div class="app-body">
            <div class="info-row">
              <span class="label">📍 地址：</span>
              <span>{{ app.address }}</span>
            </div>
            <div class="info-row">
              <span class="label">📞 医院电话：</span>
              <span>{{ app.phone }}</span>
            </div>
            <div class="info-row" v-if="app.contactName">
              <span class="label">👤 联系人：</span>
              <span>{{ app.contactName }} ({{ app.contactPhone }})</span>
            </div>
            <div class="info-row" v-if="app.description">
              <span class="label">📝 简介：</span>
              <span>{{ app.description }}</span>
            </div>
            <div class="info-row">
              <span class="label">🔐 登录账号：</span>
              <span class="account">{{ app.username }}</span>
            </div>
            <div class="info-row" v-if="app.autoMatched && app.hospitalId">
              <span class="label">🏥 关联医院ID：</span>
              <span>{{ app.hospitalId }}（自动认证匹配）</span>
            </div>
            <div class="info-row" v-if="app.rejectReason">
              <span class="label">❌ 拒绝原因：</span>
              <span class="reject-reason">{{ app.rejectReason }}</span>
            </div>

            <div v-if="app.licenseUrl" class="license-area">
              <span class="label">📄 营业执照：</span>
              <img :src="app.licenseUrl" class="license-img" @click="previewImage(app.licenseUrl)" />
            </div>
          </div>

          <div v-if="app.status === 'pending'" class="app-actions">
            <button class="action-btn approve-btn" @click="approve(app)" :disabled="processing === app.id">
              {{ processing === app.id ? '处理中...' : '✓ 通过' }}
            </button>
            <button class="action-btn reject-btn" @click="reject(app)" :disabled="processing === app.id">
              ✗ 拒绝
            </button>
          </div>
          <div v-else class="review-info">
            审核时间：{{ formatTime(app.reviewedAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 拒绝原因弹窗 -->
    <div v-if="showRejectModal" class="pm-modal-mask" @click.self="showRejectModal = false">
      <div class="pm-modal reject-modal">
        <div class="pm-modal-title">拒绝申请</div>
        <p class="modal-desc">请填写拒绝原因（将展示给商家）</p>
        <textarea v-model="rejectReason" rows="3" class="pm-textarea" placeholder="如：营业执照不清晰，请重新上传"></textarea>
        <div class="pm-modal-actions">
          <button class="pm-btn pm-btn-outline" @click="showRejectModal = false">取消</button>
          <button class="pm-btn" @click="confirmReject" :disabled="!rejectReason">确认拒绝</button>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <div v-if="previewImg" class="pm-modal-mask" @click="previewImg = ''">
      <img :src="previewImg" class="full-img" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'
import * as echarts from 'echarts'

const router = useRouter()
const admin = JSON.parse(localStorage.getItem('user') || '{}')
const token = localStorage.getItem('token')

const activeModule = ref('overview')
const loading = ref(false)
const processing = ref(null)
const currentTab = ref('pending')
const applications = ref([])

const stats = reactive({
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  hospitalCount: 0,
  merchantCount: 0,
  userCount: 0,
  todayAppointmentCount: 0,
  pendingAppointmentCount: 0
})

const showRejectModal = ref(false)
const rejectReason = ref('')
const currentRejectApp = ref(null)
const previewImg = ref('')

const trendChartRef = ref(null)
const ratioChartRef = ref(null)
let trendChart = null
let ratioChart = null
const trendDays = ref(7)

const appointments = ref([])
const appointmentLoading = ref(false)
const appointmentFilter = reactive({ status: '', hospitalId: '' })
const hospitals = ref([])

const filteredApps = computed(() => {
  return applications.value.filter(a => a.status === currentTab.value)
})

const getAuthHeaders = () => ({ Authorization: 'Bearer ' + token })

const statusText = (s) => {
  return { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s
}

const getStatusText = (s) => {
  return { pending: '待处理', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[s] || s
}

const getVisitTypeText = (t) => {
  const map = { checkup: '常规检查', vaccination: '疫苗接种', treatment: '疾病治疗', surgery: '手术', grooming: '美容护理', other: '其他' }
  return map[t] || t || '-'
}

const formatTime = (t) => {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatDateTime = (date, slot) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${slot || ''}`
}

const switchModule = (module) => {
  activeModule.value = module
  if (module === 'overview') {
    loadStats()
    loadTrend(7)
    loadRatio()
  } else if (module === 'appointments') {
    loadHospitals()
    loadAppointments()
  } else if (module === 'applications') {
    loadStats()
    loadApplications()
  }
}

const loadStats = async () => {
  try {
    const res = await axios.get('/merchant/stats', { headers: getAuthHeaders() })
    Object.assign(stats, res.data)
  } catch (error) {
    console.error('loadStats error:', error)
    if (error.response && error.response.status === 401) {
      alert('登录已过期，请重新登录')
      router.push('/login')
    }
  }
}

const loadApplications = async () => {
  loading.value = true
  try {
    const res = await axios.get('/merchant/applications', { headers: getAuthHeaders() })
    applications.value = res.data || []
  } catch (error) {
    console.error('loadApplications error:', error)
    applications.value = []
  } finally {
    loading.value = false
  }
}

const switchTab = (tab) => {
  currentTab.value = tab
}

const approve = async (app) => {
  if (!confirm(`确认通过「${app.hospitalName}」的入驻申请？\n${app.autoMatched ? '该申请已自动认证匹配到现有医院。' : '将通过此申请并新建医院记录。'}`)) return
  processing.value = app.id
  try {
    await axios.put(`/merchant/applications/${app.id}/approve`, {}, { headers: getAuthHeaders() })
    alert('审核通过，商家账号已创建')
    await Promise.all([loadStats(), loadApplications()])
  } catch (error) {
    console.error('approve error:', error)
    const msg = error.response && error.response.data && error.response.data.message
    alert(msg || '审核失败')
  } finally {
    processing.value = null
  }
}

const reject = (app) => {
  currentRejectApp.value = app
  rejectReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  const app = currentRejectApp.value
  if (!app || !rejectReason.value) return
  processing.value = app.id
  showRejectModal.value = false
  try {
    await axios.put(`/merchant/applications/${app.id}/reject`, { reason: rejectReason.value }, { headers: getAuthHeaders() })
    alert('已拒绝申请')
    await Promise.all([loadStats(), loadApplications()])
  } catch (error) {
    console.error('reject error:', error)
    const msg = error.response && error.response.data && error.response.data.message
    alert(msg || '操作失败')
  } finally {
    processing.value = null
  }
}

const previewImage = (url) => {
  previewImg.value = url
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

// ===== 平台概览 - 图表 =====
const loadTrend = async (days) => {
  trendDays.value = days
  try {
    const res = await axios.get(`/merchant/appointment-trend?days=${days}`, { headers: getAuthHeaders() })
    const data = res.data || []
    renderTrendChart(data)
  } catch (error) {
    console.error('loadTrend error:', error)
  }
}

const loadRatio = async () => {
  try {
    const res = await axios.get('/merchant/hospital-appointment-ratio', { headers: getAuthHeaders() })
    const data = res.data || []
    renderRatioChart(data)
  } catch (error) {
    console.error('loadRatio error:', error)
  }
}

const renderTrendChart = (data) => {
  nextTick(() => {
    if (!trendChartRef.value) return
    if (!trendChart) {
      trendChart = echarts.init(trendChartRef.value)
    }
    const option = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date.substring(5)),
        axisLine: { lineStyle: { color: '#ffe8f0' } },
        axisLabel: { color: '#b094b8', fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#ffe8f0' } },
        axisLabel: { color: '#b094b8', fontSize: 12 }
      },
      series: [{
        name: '预约量',
        type: 'line',
        smooth: true,
        data: data.map(d => d.count),
        lineStyle: { color: '#d6709f', width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(214, 112, 159, 0.3)' },
            { offset: 1, color: 'rgba(214, 112, 159, 0.05)' }
          ])
        },
        itemStyle: { color: '#d6709f' }
      }]
    }
    trendChart.setOption(option)
  })
}

const renderRatioChart = (data) => {
  nextTick(() => {
    if (!ratioChartRef.value) return
    if (!ratioChart) {
      ratioChart = echarts.init(ratioChartRef.value)
    }
    const filteredData = data.filter(d => d.count > 0)
    const total = filteredData.reduce((sum, d) => sum + d.count, 0)
    const colors = ['#d6709f', '#ff9ec7', '#ffb3c8', '#ffd0e6', '#c89bb0']
    // 医院名过长时截断显示
    const shortenName = (name) => {
      if (!name) return '-'
      return name.length > 8 ? name.substring(0, 7) + '…' : name
    }
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0]
          const percent = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0'
          return `${filteredData[p.dataIndex].hospitalName}<br/>预约：${p.value}单 (${percent}%)`
        }
      },
      grid: {
        left: '3%',
        right: '12%',
        bottom: '8%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: filteredData.map(d => shortenName(d.hospitalName)),
        axisLine: { lineStyle: { color: '#ffe8f0' } },
        axisLabel: {
          color: '#5a4a5a',
          fontSize: 10,
          interval: 0,
          rotate: 25
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#ffe8f0' } },
        axisLabel: { color: '#b094b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#fff0f5' } }
      },
      series: [{
        type: 'bar',
        barWidth: '50%',
        data: filteredData.map((d, i) => ({
          value: d.count,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colors[i % colors.length] },
              { offset: 1, color: colors[(i + 1) % colors.length] }
            ]),
            borderRadius: [6, 6, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params) => {
              const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0'
              return `${params.value}单 ${percent}%`
            },
            color: '#5a4a5a',
            fontSize: 10,
            fontWeight: 'bold'
          }
        }))
      }]
    }
    ratioChart.setOption(option)
  })
}

const handleResize = () => {
  trendChart && trendChart.resize()
  ratioChart && ratioChart.resize()
}

// ===== 预约监管 =====
const loadHospitals = async () => {
  try {
    const res = await axios.get('/hospitals')
    hospitals.value = res.data || []
  } catch (error) {
    console.error('loadHospitals error:', error)
    hospitals.value = []
  }
}

const loadAppointments = async () => {
  appointmentLoading.value = true
  try {
    let url = '/appointments/admin'
    const params = []
    if (appointmentFilter.status) params.push(`status=${appointmentFilter.status}`)
    if (appointmentFilter.hospitalId) params.push(`hospitalId=${appointmentFilter.hospitalId}`)
    if (params.length > 0) url += '?' + params.join('&')
    const res = await axios.get(url, { headers: getAuthHeaders() })
    appointments.value = res.data || []
  } catch (error) {
    console.error('loadAppointments error:', error)
    appointments.value = []
  } finally {
    appointmentLoading.value = false
  }
}

const forceComplete = async (appt) => {
  if (!confirm(`确认将「${appt.hospitalName}」的预约标记为已完成？`)) return
  try {
    await axios.put(`/appointments/admin/${appt.id}/force-complete`, {}, { headers: getAuthHeaders() })
    alert('已标记为完成')
    loadAppointments()
  } catch (error) {
    console.error('forceComplete error:', error)
    const msg = error.response && error.response.data && error.response.data.message
    alert(msg || '操作失败')
  }
}

const forceCancel = async (appt) => {
  if (!confirm(`确认强制取消「${appt.hospitalName}」的预约？`)) return
  try {
    await axios.put(`/appointments/admin/${appt.id}/force-cancel`, {}, { headers: getAuthHeaders() })
    alert('已强制取消')
    loadAppointments()
  } catch (error) {
    console.error('forceCancel error:', error)
    const msg = error.response && error.response.data && error.response.data.message
    alert(msg || '操作失败')
  }
}

onMounted(() => {
  if (!token || admin.role !== 'admin') {
    alert('请使用管理员账号登录')
    router.push('/login')
    return
  }
  loadStats()
  loadTrend(7)
  loadRatio()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart && trendChart.dispose()
  ratioChart && ratioChart.dispose()
})
</script>

<style scoped>
.admin-page {
  padding-bottom: 40px;
}

.admin-header {
  padding: 16px 24px;
}

.header-left {
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome {
  font-size: 13px;
  color: #b094b8;
}

.main-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  max-width: 1400px;
  margin: 0 auto;
  border-bottom: 2px solid #ffe8f0;
}

.main-tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: #b094b8;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-radius: 10px 10px 0 0;
  transition: all 0.2s;
}

.main-tab:hover {
  color: #d6709f;
  background: rgba(214, 112, 159, 0.08);
}

.main-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.3);
}

/* ===== 平台概览 ===== */
.overview-panel {
  padding: 0 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 20px 0;
}

.stat-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.08);
}

.stat-icon {
  font-size: 28px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(214, 112, 159, 0.1);
  flex-shrink: 0;
}

.stat-card.today .stat-icon { background: rgba(76, 175, 80, 0.15); }
.stat-card.pending .stat-icon { background: rgba(255, 152, 0, 0.15); }
.stat-card.hospital .stat-icon { background: rgba(214, 112, 159, 0.15); }
.stat-card.user .stat-icon { background: rgba(255, 158, 199, 0.18); }

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #d6709f;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #b094b8;
  margin-top: 4px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding-bottom: 20px;
}

.chart-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #5a4a5a;
}

.chart-tabs {
  display: flex;
  gap: 6px;
}

.chart-tab {
  padding: 6px 14px;
  background: rgba(214, 112, 159, 0.1);
  border: none;
  color: #d6709f;
  cursor: pointer;
  font-size: 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.chart-tab.active {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
}

.chart-container {
  height: 300px;
}

/* ===== 预约监管 ===== */
.appointment-panel {
  padding: 0 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 12px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #ffe8f0;
  border-radius: 8px;
  background: #fff;
  color: #5a4a5a;
  font-size: 14px;
  cursor: pointer;
}

.filter-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.appointment-table {
  overflow-x: auto;
}

.appointment-table table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 12px;
  overflow: hidden;
}

.appointment-table th, .appointment-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #ffe8f0;
  font-size: 13px;
}

.appointment-table th {
  background: rgba(214, 112, 159, 0.1);
  color: #5a4a5a;
  font-weight: 600;
}

.appointment-table tr:hover {
  background: rgba(214, 112, 159, 0.05);
}

.small-text {
  font-size: 12px;
  color: #b094b8;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending { background: rgba(255, 152, 0, 0.15); color: #ff9800; }
.status-badge.confirmed { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
.status-badge.completed { background: rgba(33, 150, 243, 0.15); color: #2196f3; }
.status-badge.cancelled { background: rgba(255, 107, 107, 0.15); color: #ff6b6b; }

.action-btn-small {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 6px;
  transition: all 0.2s;
}

.force-complete {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.force-complete:hover {
  background: rgba(76, 175, 80, 0.25);
}

.force-cancel {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
}

.force-cancel:hover {
  background: rgba(255, 107, 107, 0.25);
}

/* ===== 商家入驻审核 ===== */
.application-panel {
  padding: 0 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #ffe8f0;
}

.tab {
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: #b094b8;
  cursor: pointer;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover { color: #d6709f; }

.tab.active {
  color: #d6709f;
  border-bottom-color: #d6709f;
  font-weight: 600;
}

.app-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 14px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.08);
  transition: all 0.3s;
}

.app-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(214, 112, 159, 0.14);
  border-color: rgba(255, 179, 200, 0.6);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ffe8f0;
  flex-wrap: wrap;
  gap: 8px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hospital-name {
  font-size: 16px;
  font-weight: 600;
  color: #5a4a5a;
}

.badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.badge.auto {
  background: rgba(214, 112, 159, 0.12);
  color: #d6709f;
}

.badge.status-pending {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}

.badge.status-approved {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.badge.status-rejected {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
}

.app-time {
  font-size: 12px;
  color: #b094b8;
}

.app-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  font-size: 13px;
  color: #5a4a5a;
}

.info-row .label {
  flex-shrink: 0;
  width: 100px;
  color: #b094b8;
}

.account {
  font-family: monospace;
  color: #d6709f;
  font-weight: 500;
}

.reject-reason {
  color: #ff6b6b;
}

.license-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.license-img {
  width: 200px;
  height: auto;
  border-radius: 10px;
  border: 1px solid #ffe8f0;
  cursor: pointer;
  transition: transform 0.2s;
}

.license-img:hover {
  transform: scale(1.05);
  border-color: #ffb3c8;
}

.app-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #ffe8f0;
}

.action-btn {
  padding: 8px 24px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.approve-btn {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
  box-shadow: 0 4px 14px rgba(214, 112, 159, 0.3);
}

.approve-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(214, 112, 159, 0.4);
}

.reject-btn {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.4);
}

.reject-btn:hover:not(:disabled) {
  background: rgba(255, 107, 107, 0.18);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.review-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ffe8f0;
  font-size: 12px;
  color: #b094b8;
}

/* ===== 通用弹窗样式 ===== */
.reject-modal {
  max-width: 440px;
}

.modal-desc {
  font-size: 13px;
  color: #b094b8;
  margin: 0 0 12px;
  text-align: center;
}

.full-img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .main-tabs {
    flex-wrap: wrap;
  }
  .main-tab {
    padding: 10px 16px;
    font-size: 13px;
  }
  .filter-bar {
    flex-wrap: wrap;
  }
  .appointment-table {
    font-size: 12px;
  }
}
</style>