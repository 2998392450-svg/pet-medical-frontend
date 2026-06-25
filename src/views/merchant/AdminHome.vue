<template>
  <div class="admin-container">
    <div class="admin-header">
      <div class="header-left">
        <span class="logo">🛡️</span>
        <h1>管理员后台</h1>
      </div>
      <div class="header-right">
        <span class="welcome">欢迎，{{ admin.nickname || admin.username }}</span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </div>

    <!-- 概览卡片 -->
    <div class="stats-grid">
      <div class="stat-card pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pendingCount }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </div>
      <div class="stat-card approved">
        <div class="stat-icon">✓</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.approvedCount }}</div>
          <div class="stat-label">已通过</div>
        </div>
      </div>
      <div class="stat-card rejected">
        <div class="stat-icon">✗</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.rejectedCount }}</div>
          <div class="stat-label">已拒绝</div>
        </div>
      </div>
      <div class="stat-card hospital">
        <div class="stat-icon">🏥</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.hospitalCount }}</div>
          <div class="stat-label">医院总数</div>
        </div>
      </div>
      <div class="stat-card merchant">
        <div class="stat-icon">👤</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.merchantCount }}</div>
          <div class="stat-label">商家总数</div>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tabs">
      <button :class="['tab', currentTab === 'pending' ? 'active' : '']" @click="switchTab('pending')">
        待审核 ({{ stats.pendingCount }})
      </button>
      <button :class="['tab', currentTab === 'approved' ? 'active' : '']" @click="switchTab('approved')">
        已通过
      </button>
      <button :class="['tab', currentTab === 'rejected' ? 'active' : '']" @click="switchTab('rejected')">
        已拒绝
      </button>
    </div>

    <!-- 申请列表 -->
    <div class="application-list">
      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="filteredApps.length === 0" class="empty">
        <span class="empty-icon">📭</span>
        <p>暂无{{ currentTab === 'pending' ? '待审核' : currentTab === 'approved' ? '已通过' : '已拒绝' }}的申请</p>
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

          <!-- 营业执照 -->
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

    <!-- 拒绝原因弹窗 -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal-card">
        <div class="modal-title">拒绝申请</div>
        <p class="modal-desc">请填写拒绝原因（将展示给商家）</p>
        <textarea v-model="rejectReason" rows="3" placeholder="如：营业执照不清晰，请重新上传"></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showRejectModal = false">取消</button>
          <button class="modal-btn confirm" @click="confirmReject" :disabled="!rejectReason">确认拒绝</button>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <div v-if="previewImg" class="modal-overlay" @click="previewImg = ''">
      <img :src="previewImg" class="full-img" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/api/axios'

const router = useRouter()
const loading = ref(false)
const processing = ref(null)
const currentTab = ref('pending')
const applications = ref([])
const stats = reactive({
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  hospitalCount: 0,
  merchantCount: 0
})

const admin = JSON.parse(localStorage.getItem('user') || '{}')
const token = localStorage.getItem('token')

const showRejectModal = ref(false)
const rejectReason = ref('')
const currentRejectApp = ref(null)
const previewImg = ref('')

const filteredApps = computed(() => {
  return applications.value.filter(a => a.status === currentTab.value)
})

const statusText = (s) => {
  return { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s
}

const formatTime = (t) => {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getAuthHeaders = () => ({ Authorization: 'Bearer ' + token })

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

onMounted(() => {
  if (!token || admin.role !== 'admin') {
    alert('请使用管理员账号登录')
    router.push('/login')
    return
  }
  loadStats()
  loadApplications()
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 0 0 40px;
  font-family: 'Segoe UI', 'PingFang SC', Roboto, sans-serif;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  color: #fff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 28px;
}

.admin-header h1 {
  font-size: 22px;
  margin: 0;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome {
  font-size: 14px;
  opacity: 0.8;
}

.logout-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  padding: 24px 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.stat-card.pending .stat-icon { background: rgba(255, 193, 7, 0.2); }
.stat-card.approved .stat-icon { background: rgba(67, 233, 123, 0.2); }
.stat-card.rejected .stat-icon { background: rgba(255, 107, 107, 0.2); }

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  padding: 0 32px;
  max-width: 1200px;
  margin: 0 auto 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab {
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab.active {
  color: #fff;
  border-bottom-color: #43e97b;
}

/* 列表 */
.application-list {
  padding: 0 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading,
.empty {
  text-align: center;
  padding: 60px 0;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
}

.app-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hospital-name {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
}

.badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.badge.auto {
  background: rgba(79, 172, 254, 0.2);
  color: #4facfe;
}

.badge.status-pending {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.badge.status-approved {
  background: rgba(67, 233, 123, 0.2);
  color: #43e97b;
}

.badge.status-rejected {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.app-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.app-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.info-row .label {
  flex-shrink: 0;
  width: 100px;
  color: rgba(255, 255, 255, 0.5);
}

.account {
  font-family: monospace;
  color: #43e97b;
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
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: transform 0.2s;
}

.license-img:hover {
  transform: scale(1.05);
}

.app-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.action-btn {
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.approve-btn {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  color: #fff;
}

.approve-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(67, 233, 123, 0.4);
}

.reject-btn {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.4);
}

.reject-btn:hover:not(:disabled) {
  background: rgba(255, 107, 107, 0.3);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.review-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card {
  background: #fff;
  border-radius: 14px;
  padding: 24px;
  width: 440px;
  max-width: 90vw;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.modal-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.modal-card textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
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
  background: #ff6b6b;
  color: #fff;
}

.modal-btn.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.full-img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .admin-header {
    padding: 16px;
  }
  .application-list, .tabs {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
