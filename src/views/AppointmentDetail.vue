<template>
  <div class="pm-page appointment-detail-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-back-btn" @click="goBack">←</span>
        <span class="pm-nav-title">预约详情</span>
      </div>
    </nav>

    <div class="pm-content">
      <div v-if="loading" class="pm-loading">加载中...</div>

      <template v-else-if="appointment">
        <!-- 状态徽章 -->
        <div class="pm-section status-section">
          <span :class="['pm-status-tag', `pm-status-${appointment.status}`]">
            {{ getStatusText(appointment.status) }}
          </span>
        </div>

        <!-- 预约信息 -->
        <div class="pm-section">
          <h3 class="pm-section-title">📋 预约信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">预约编号</span>
              <span class="info-value">#{{ appointment.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预约医院</span>
              <span class="info-value">{{ appointment.hospitalName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预约医生</span>
              <span class="info-value">{{ appointment.doctorName || '未选择' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预约宠物</span>
              <span class="info-value">{{ appointment.petName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">预约时间</span>
              <span class="info-value">{{ appointment.appointmentTime }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">就诊类型</span>
              <span class="info-value">{{ getTypeText(appointment.type) }}</span>
            </div>
            <div class="info-item" v-if="appointment.notes">
              <span class="info-label">备注</span>
              <span class="info-value">{{ appointment.notes }}</span>
            </div>
          </div>
        </div>

        <!-- 医院信息 -->
        <div class="pm-section">
          <h3 class="pm-section-title">🏥 医院信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">地址</span>
              <span class="info-value">{{ appointment.hospitalAddress }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">电话</span>
              <span class="info-value">{{ appointment.hospitalPhone }}</span>
            </div>
          </div>
        </div>

        <!-- 评价信息 -->
        <div class="pm-section" v-if="appointment.review">
          <h3 class="pm-section-title">⭐ 评价信息</h3>
          <div class="review-content">
            <div class="review-rating">
              <span v-for="star in 5" :key="star" class="star">
                {{ star <= appointment.review.rating ? '⭐' : '☆' }}
              </span>
            </div>
            <p class="review-text">{{ appointment.review.content }}</p>
            <p class="review-time">评价时间: {{ appointment.review.time }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="pm-bottom-action" v-if="hasActions">
          <button
            v-if="appointment.status === 'pending' || appointment.status === 'confirmed'"
            class="pm-btn pm-btn-outline"
            @click="handleCancel"
          >
            取消预约
          </button>
          <button
            v-if="appointment.status === 'pending' || appointment.status === 'confirmed'"
            class="pm-btn pm-btn-outline"
            @click="showRescheduleModal = true"
          >
            改期
          </button>
          <button
            v-if="appointment.status === 'completed' && !appointment.review"
            class="pm-btn"
            @click="showReviewModal = true"
          >
            评价
          </button>
        </div>
      </template>

      <div v-else class="pm-empty">
        <div class="pm-empty-icon">📅</div>
        <div class="pm-empty-text">预约信息不存在</div>
      </div>
    </div>

    <!-- 改期弹窗 -->
    <div v-if="showRescheduleModal" class="pm-modal-mask">
      <div class="pm-modal">
        <h3 class="pm-modal-title">改期预约</h3>

        <div class="pm-form-group">
          <label class="pm-form-label">选择日期</label>
          <input
            v-model="rescheduleForm.date"
            type="date"
            :min="minDateStr"
            class="pm-input"
          />
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">选择时段</label>
          <select v-model="rescheduleForm.time" class="pm-select">
            <option value="">请选择时段</option>
            <option value="09:00">09:00</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
            <option value="16:00">16:00</option>
            <option value="17:00">17:00</option>
            <option value="18:00">18:00</option>
            <option value="19:00">19:00</option>
            <option value="20:00">20:00</option>
            <option value="21:00">21:00</option>
          </select>
        </div>

        <div class="pm-modal-actions">
          <button class="pm-btn pm-btn-outline" @click="showRescheduleModal = false">取消</button>
          <button class="pm-btn" @click="handleReschedule">确定</button>
        </div>
      </div>
    </div>

    <!-- 评价弹窗 -->
    <div v-if="showReviewModal" class="pm-modal-mask">
      <div class="pm-modal">
        <h3 class="pm-modal-title">评价预约</h3>

        <div class="pm-form-group">
          <label class="pm-form-label">评分</label>
          <div class="rating-stars">
            <span
              v-for="star in 5"
              :key="star"
              :class="['star-btn', { active: star <= reviewForm.rating }]"
              @click="reviewForm.rating = star"
            >
              ⭐
            </span>
          </div>
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">评价内容</label>
          <textarea
            v-model="reviewForm.content"
            placeholder="请输入评价内容"
            rows="4"
            class="pm-textarea"
          ></textarea>
        </div>

        <div class="pm-modal-actions">
          <button class="pm-btn pm-btn-outline" @click="showReviewModal = false">取消</button>
          <button class="pm-btn" @click="handleReview">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '../api/axios'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const appointment = ref(null)
const showRescheduleModal = ref(false)
const showReviewModal = ref(false)

const rescheduleForm = ref({ date: '', time: '' })
const reviewForm = ref({ rating: 5, content: '' })

const typeMap = {
  checkup: '常规检查',
  vaccination: '疫苗接种',
  treatment: '疾病治疗',
  surgery: '手术',
  grooming: '美容护理',
  other: '其他'
}

const minDate = computed(() => {
  const today = new Date()
  return new Date(today.getTime() + 24 * 60 * 60 * 1000)
})

const minDateStr = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// 是否有可执行的按钮（决定底部按钮区是否显示）
const hasActions = computed(() => {
  if (!appointment.value) return false
  const status = appointment.value.status
  if (status === 'pending' || status === 'confirmed') return true
  if (status === 'completed' && !appointment.value.review) return true
  return false
})

const getStatusText = (status) => {
  const texts = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

const getTypeText = (type) => {
  return typeMap[type] || type || '常规检查'
}

const loadAppointmentDetail = async () => {
  loading.value = true
  const id = route.params.id
  try {
    const res = await axios.get(`/appointments/${id}`)
    if (res.code === 200) {
      const a = res.data
      let review = null
      if (a.hospitalFeedback) {
        try { review = JSON.parse(a.hospitalFeedback) } catch (e) { review = null }
      }
      appointment.value = {
        ...a,
        appointmentTime: a.appointmentTime || (a.appointmentDate ? `${String(a.appointmentDate).slice(0, 10)} ${a.timeSlot || ''}`.trim() : ''),
        type: a.type || a.reason || 'checkup',
        reviewed: a.reviewed !== undefined ? a.reviewed : !!a.hospitalFeedback,
        review
      }
      loading.value = false
      return
    }
  } catch (error) {
    console.error('[AppointmentDetail] 后端不可用，读取本地预约数据:', error)
  }

  // 离线模式：从 localStorage 读取真实预约数据
  const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
  const found = mockAppointments.find(a => String(a.id) === String(id))

  if (found) {
    appointment.value = found
  } else {
    appointment.value = null
  }
  loading.value = false
}

const handleCancel = async () => {
  if (!confirm('确定要取消此预约吗？')) return

  try {
    await axios.put(`/appointments/${appointment.value.id}/status`, { status: 'cancel' })
  } catch (error) {
    console.error('[AppointmentDetail] 取消失败，使用离线模式:', error)
  }

  // 离线模式：同步更新 localStorage
  const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
  const index = mockAppointments.findIndex(a => a.id === appointment.value.id)
  if (index !== -1) {
    mockAppointments[index].status = 'cancelled'
    localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
  }
  appointment.value.status = 'cancelled'
  alert('取消成功')
}

const handleReschedule = async () => {
  if (!rescheduleForm.value.date || !rescheduleForm.value.time) {
    alert('请选择日期和时段')
    return
  }

  const date = rescheduleForm.value.date
  const time = rescheduleForm.value.time
  const newTime = `${date} ${time}`

  try {
    await axios.put(`/appointments/${appointment.value.id}/reschedule`, { appointmentDate: date, timeSlot: time })
  } catch (error) {
    console.error('[AppointmentDetail] 改期失败，使用离线模式:', error)
  }

  // 离线模式：同步更新 localStorage
  const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
  const index = mockAppointments.findIndex(a => a.id === appointment.value.id)
  if (index !== -1) {
    mockAppointments[index].appointmentTime = newTime
    localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
  }
  appointment.value.appointmentTime = newTime
  showRescheduleModal.value = false
  alert('改期成功')
}

const handleReview = async () => {
  if (!reviewForm.value.content) {
    alert('请输入评价内容')
    return
  }

  const reviewData = {
    rating: reviewForm.value.rating,
    content: reviewForm.value.content,
    time: new Date().toLocaleString()
  }

  try {
    await axios.post(`/appointments/${appointment.value.id}/review`, {
      rating: reviewForm.value.rating,
      content: reviewForm.value.content
    })
  } catch (error) {
    console.error('[AppointmentDetail] 评价失败，使用离线模式:', error)
  }

  // 离线模式：同步更新 localStorage
  const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
  const index = mockAppointments.findIndex(a => a.id === appointment.value.id)
  if (index !== -1) {
    mockAppointments[index].review = reviewData
    mockAppointments[index].reviewed = true
    localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
  }
  appointment.value.review = reviewData
  showReviewModal.value = false
  alert('评价成功')
}

const goBack = () => router.back()

onMounted(() => {
  loadAppointmentDetail()
})
</script>

<style scoped>
/* 页面专属样式（基础样式由全局 theme.css 提供） */

.appointment-detail-page {
  padding-bottom: 100px;
}

/* 状态徽章区域 */
.status-section {
  text-align: center;
  padding: 18px;
}

.status-section .pm-status-tag {
  font-size: 14px;
  padding: 6px 24px;
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  font-size: 14px;
  align-items: flex-start;
}

.info-label {
  width: 80px;
  color: var(--pm-text-sub);
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: var(--pm-text-main);
  word-break: break-word;
}

/* 评价内容 */
.review-content {
  padding: 14px;
  background: rgba(214, 112, 159, 0.04);
  border-radius: var(--pm-radius-md);
  border: 1px solid rgba(214, 112, 159, 0.08);
}

.review-rating {
  margin-bottom: 8px;
}

.star {
  font-size: 20px;
  margin-right: 2px;
}

.review-text {
  font-size: 14px;
  color: var(--pm-text-main);
  margin: 0 0 8px 0;
  line-height: 1.6;
}

.review-time {
  font-size: 12px;
  color: var(--pm-text-sub);
  margin: 0;
}

/* 评分星级按钮 */
.rating-stars {
  display: flex;
  gap: 8px;
}

.star-btn {
  font-size: 28px;
  opacity: 0.3;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.star-btn:hover {
  transform: scale(1.15);
}

.star-btn.active {
  opacity: 1;
}
</style>
