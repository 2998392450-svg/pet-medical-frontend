<template>
  <div class="appointment-detail-page">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">预约详情</span>
      </div>
    </nav>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else-if="appointment">
      <div class="status-section">
        <span :class="['status-badge', appointment.status]">
          {{ getStatusText(appointment.status) }}
        </span>
      </div>

      <div class="section">
        <h3 class="section-title">预约信息</h3>
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

      <div class="section">
        <h3 class="section-title">医院信息</h3>
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

      <div v-if="appointment.review" class="section">
        <h3 class="section-title">评价信息</h3>
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

      <div class="action-section">
        <button
          v-if="appointment.status === 'pending' || appointment.status === 'confirmed'"
          class="action-btn cancel"
          @click="handleCancel"
        >
          取消预约
        </button>
        <button
          v-if="appointment.status === 'pending' || appointment.status === 'confirmed'"
          class="action-btn reschedule"
          @click="showRescheduleModal = true"
        >
          改期
        </button>
        <button
          v-if="appointment.status === 'completed' && !appointment.review"
          class="action-btn review"
          @click="showReviewModal = true"
        >
          评价
        </button>
      </div>
    </template>

    <div v-else class="empty">预约信息不存在</div>

    <div v-if="showRescheduleModal" class="modal">
      <div class="modal-content">
        <h3>改期预约</h3>

        <div class="form-group">
          <label>选择日期</label>
          <input
            v-model="rescheduleForm.date"
            type="date"
            :min="minDateStr"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>选择时段</label>
          <select v-model="rescheduleForm.time" class="form-input">
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

        <div class="modal-actions">
          <button class="cancel-btn" @click="showRescheduleModal = false">取消</button>
          <button class="submit-btn" @click="handleReschedule">确定</button>
        </div>
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
          <button class="submit-btn" @click="handleReview">提交</button>
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
      // 后端 hospitalFeedback 是 JSON 字符串，解析为前端 review 对象
      let review = null
      if (a.hospitalFeedback) {
        try { review = JSON.parse(a.hospitalFeedback) } catch (e) { review = null }
      }
      // 归一化：补齐前端模板依赖的 appointmentTime/type/reviewed/review
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
    // 真的找不到才显示空状态
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
.appointment-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100px;
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

.loading, .empty {
  text-align: center;
  padding: 50px 20px;
  color: #999;
}

.status-section {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 15px;
  margin: 15px;
}

.status-badge {
  font-size: 16px;
  padding: 10px 30px;
  border-radius: 20px;
}

.status-badge.pending { background: #fff3e0; color: #ff9800; }
.status-badge.confirmed { background: #e3f2fd; color: #2196f3; }
.status-badge.completed { background: #e8f5e9; color: #4caf50; }
.status-badge.cancelled { background: #ffebee; color: #f44336; }

.section {
  background: white;
  border-radius: 15px;
  padding: 20px;
  margin: 15px;
}

.section-title {
  font-size: 16px;
  color: #333;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  font-size: 14px;
}

.info-label {
  width: 80px;
  color: #999;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: #333;
}

.review-content {
  padding: 15px;
  background: #f9f9f9;
  border-radius: 10px;
}

.review-rating {
  margin-bottom: 10px;
}

.star {
  font-size: 20px;
}

.review-text {
  font-size: 14px;
  color: #333;
  margin: 0 0 10px 0;
}

.review-time {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.action-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.action-btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
}

.action-btn.cancel { background: #ffebee; color: #f44336; }
.action-btn.reschedule { background: #e3f2fd; color: #2196f3; }
.action-btn.review { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }

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

.form-input {
  width: 100%;
  padding: 12px;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  background: white;
  color: #333;
  transition: border-color 0.3s;
}

.form-input:focus {
  border-color: #4facfe;
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

.rating-stars .star {
  font-size: 30px;
  opacity: 0.3;
  cursor: pointer;
  transition: opacity 0.2s;
}

.rating-stars .star.active {
  opacity: 1;
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

.cancel-btn { background: #f5f5f5; color: #666; }
.submit-btn { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
</style>
