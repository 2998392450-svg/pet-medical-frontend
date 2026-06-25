<template>
  <div class="create-appointment-container">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">预约挂号</span>
      </div>
    </nav>

    <div class="hospital-section" v-if="hospital && hospital.id">
      <div class="hospital-card">
        <div class="hospital-icon">🏥</div>
        <div class="hospital-info">
          <h3>{{ hospital.name }}</h3>
          <p>{{ hospital.address }}</p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">选择宠物</h2>
      <div v-if="pets.length === 0" class="empty-pets">
        <p>还没有添加宠物</p>
        <button class="add-pet-btn" @click="goToAddPet">立即添加</button>
      </div>
      <div v-else class="pet-options">
        <div
          v-for="pet in pets"
          :key="pet.id"
          :class="['pet-option', { selected: selectedPet === pet.id }]"
          @click="selectedPet = pet.id"
        >
          <div class="pet-icon">{{ pet.isExotic ? '🦎' : '🐕' }}</div>
          <div class="pet-detail">
            <span class="pet-name">{{ pet.name }}</span>
            <span class="pet-breed">{{ pet.breed }}</span>
          </div>
          <span :class="['radio-indicator', { checked: selectedPet === pet.id }]"></span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">选择医生</h2>
      <div v-if="doctors.length === 0" class="empty-doctors">
        <p>暂无医生信息</p>
      </div>
      <div v-else class="doctor-options">
        <div
          v-for="doctor in doctors"
          :key="doctor.id"
          :class="['doctor-option', { selected: selectedDoctor === doctor.id }]"
          @click="selectedDoctor = doctor.id"
        >
          <div class="doctor-avatar">👨‍⚕️</div>
          <div class="doctor-detail">
            <span class="doctor-name">{{ doctor.name }} <span class="doctor-title">{{ doctor.title }}</span></span>
            <span class="doctor-specialty">{{ doctor.specialty }}</span>
          </div>
          <span :class="['radio-indicator', { checked: selectedDoctor === doctor.id }]"></span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">选择日期</h2>
      <div class="date-picker">
        <!-- 用 text + 自定义 placeholder,避免浏览器硬编码 yyyy/mm/日 -->
        <input
          v-model="selectedDate"
          type="text"
          placeholder="点击选择日期(YYYY-MM-DD)"
          class="form-input"
          readonly
          @click="openDatePicker"
        />
        <!-- 隐藏的原生 date,点击 text 时弹出 -->
        <input
          ref="nativeDateInput"
          type="date"
          :min="minDateStr"
          class="hidden-native-date"
          @change="onNativeDateChange"
        />
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">选择时段</h2>
      <div v-if="!selectedDate" class="empty-time">
        <p>请先选择日期</p>
      </div>
      <div v-else class="time-slots">
        <div
          v-for="slot in timeSlots"
          :key="slot"
          :class="['time-slot', { selected: selectedTime === slot, disabled: isSlotDisabled(slot) }]"
          @click="selectTimeSlot(slot)"
        >
          {{ slot }}
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">就诊类型</h2>
      <div class="type-options">
        <div
          v-for="type in appointmentTypes"
          :key="type.value"
          :class="['type-option', { selected: selectedType === type.value }]"
          @click="selectedType = type.value"
        >
          {{ type.label }}
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">备注信息</h2>
      <textarea
        v-model="notes"
        placeholder="请输入备注信息（选填）"
        rows="3"
        class="form-input textarea"
      ></textarea>
    </div>

    <div class="bottom-action">
      <button class="submit-btn" @click="submitAppointment" :disabled="!isFormValid || submitting">
        {{ submitting ? '提交中...' : '确认预约' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '../api/axios'

const router = useRouter()
const route = useRoute()

const hospitalId = ref(route.params.hospitalId)
const hospital = ref({})
const pets = ref([])
const doctors = ref([])
const selectedPet = ref(null)
const selectedDoctor = ref(null)
const selectedDate = ref('')
const selectedTime = ref('')
const selectedType = ref('checkup')
const notes = ref('')
const submitting = ref(false)
const nativeDateInput = ref(null)

function openDatePicker() {
  // 触发隐藏的原生 date input
  if (nativeDateInput.value) {
    nativeDateInput.value.showPicker?.() || nativeDateInput.value.click()
  }
}

function onNativeDateChange(e) {
  selectedDate.value = e.target.value
}

const appointmentTypes = [
  { label: '常规检查', value: 'checkup' },
  { label: '疫苗接种', value: 'vaccination' },
  { label: '疾病治疗', value: 'treatment' },
  { label: '手术', value: 'surgery' },
  { label: '美容护理', value: 'grooming' },
  { label: '其他', value: 'other' }
]

const minDateStr = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const timeSlots = computed(() => {
  const slots = []
  if (hospital.value.nightService) {
    for (let hour = 8; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
    for (let hour = 0; hour < 8; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  } else {
    for (let hour = 8; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }
  return slots
})

const isFormValid = computed(() => {
  return selectedPet.value && selectedDate.value && selectedTime.value
})

const isSlotDisabled = (slot) => {
  if (!selectedDate.value) return false
  const now = new Date()
  const selectedDateTime = new Date(`${selectedDate.value}T${slot}`)
  return selectedDateTime < now
}

const selectTimeSlot = (slot) => {
  if (!isSlotDisabled(slot)) {
    selectedTime.value = slot
  }
}

const loadHospital = async () => {
  // 1. 优先从 sessionStorage 读取
  const cached = sessionStorage.getItem('currentHospital')
  if (cached) {
    try {
      const cachedHospital = JSON.parse(cached)
      if (String(cachedHospital.id) === String(hospitalId.value)) {
        hospital.value = cachedHospital
        return
      }
    } catch (e) {
      // 解析失败继续
    }
  }
  // 2. 尝试后端API
  try {
    const res = await axios.get(`/hospitals/${hospitalId.value}`)
    if (res.code === 200) {
      hospital.value = res.data
    }
  } catch (error) {
    console.error('[CreateAppointment] 加载医院失败:', error)
  }
}

const loadPets = async () => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) return
  try {
    const res = await axios.get('/pets', { params: { userId: user.id } })
    if (res.code === 200) {
      pets.value = res.data
    }
  } catch (error) {
    console.error('[CreateAppointment] 后端不可用，读取本地宠物数据:', error)
    // 离线模式：从 localStorage 读取宠物数据
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    const userPets = mockPets.filter(p => p.userId === user.id)
    pets.value = userPets
  }
}

const loadDoctors = async () => {
  try {
    const res = await axios.get(`/hospitals/${hospitalId.value}/doctors`)
    if (res.code === 200) {
      doctors.value = res.data
    }
  } catch (error) {
    console.error('[CreateAppointment] 加载医生失败，使用本地数据:', error)
    doctors.value = [
      { id: 1, name: '王医生', title: '主任医师', specialty: '小动物外科', experienceYears: 15, rating: 4.9 },
      { id: 2, name: '李医生', title: '副主任医师', specialty: '内科诊疗', experienceYears: 10, rating: 4.7 },
      { id: 3, name: '赵医生', title: '主治医师', specialty: '影像诊断', experienceYears: 8, rating: 4.6 }
    ]
  }
}

const submitAppointment = async () => {
  if (!isFormValid.value) {
    alert('请填写完整的预约信息')
    return
  }

  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) {
    alert('请先登录')
    router.push('/login')
    return
  }

  submitting.value = true
  try {
    const selectedPetObj = pets.value.find(p => p.id === selectedPet.value)
    const res = await axios.post('/appointments', {
      userId: user.id,
      hospitalId: hospitalId.value,
      petId: selectedPet.value,
      doctorId: selectedDoctor.value || null,
      petName: selectedPetObj ? selectedPetObj.name : null,
      petBreed: selectedPetObj ? selectedPetObj.breed : null,
      userName: user.nickname || user.username || null,
      contactPhone: user.phone || null,
      appointmentDate: selectedDate.value,
      timeSlot: selectedTime.value,
      reason: selectedType.value,
      notes: notes.value || null
    })

    if (res.code === 200) {
      alert('预约成功')
      router.push('/appointments')
    } else {
      alert(res.message || '预约失败')
    }
  } catch (error) {
    console.error('[CreateAppointment] 预约失败，使用离线模式:', error)
    // 离线模式：将预约保存到 localStorage
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const selectedPetObj = pets.value.find(p => p.id === selectedPet.value)
    const newAppointment = {
      id: Date.now(),
      userId: user.id,
      hospitalId: parseInt(hospitalId.value),
      hospitalName: hospital.value.name || '未知医院',
      hospitalAddress: hospital.value.address || '',
      hospitalPhone: hospital.value.phone || '',
      petId: selectedPet.value,
      petName: selectedPetObj ? selectedPetObj.name : '未知宠物',
      doctorId: selectedDoctor.value || null,
      doctorName: doctors.value.find(d => d.id === selectedDoctor.value)?.name || null,
      appointmentTime: `${selectedDate.value} ${selectedTime.value}`,
      type: selectedType.value,
      status: 'pending',
      notes: notes.value || null,
      createdAt: new Date().toISOString()
    }
    mockAppointments.push(newAppointment)
    localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    alert('预约成功（离线模式）')
    router.push('/appointments')
  } finally {
    submitting.value = false
  }
}

const goBack = () => router.back()
const goToAddPet = () => router.push('/pets/add')

onMounted(() => {
  loadHospital()
  loadPets()
  loadDoctors()

  const doctorId = route.query.doctorId
  if (doctorId && doctorId !== 'null') {
    selectedDoctor.value = parseInt(doctorId)
  }
})
</script>

<style scoped>
.hidden-native-date {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.create-appointment-container {
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

.hospital-section {
  padding: 15px;
}

.hospital-card {
  display: flex;
  gap: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 15px;
  color: white;
}

.hospital-icon {
  font-size: 48px;
}

.hospital-info h3 {
  font-size: 18px;
  margin-bottom: 5px;
}

.hospital-info p {
  font-size: 13px;
  opacity: 0.9;
}

.section {
  background: white;
  margin: 10px;
  border-radius: 15px;
  padding: 15px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.empty-pets, .empty-doctors, .empty-time {
  text-align: center;
  padding: 20px;
  color: #999;
}

.add-pet-btn {
  margin-top: 10px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.pet-options, .doctor-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pet-option, .doctor-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.pet-option.selected, .doctor-option.selected {
  border-color: #667eea;
  background: #f0f4ff;
}

.pet-icon {
  font-size: 36px;
}

.pet-detail, .doctor-detail {
  flex: 1;
}

.pet-name, .doctor-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  display: block;
}

.pet-breed, .doctor-specialty {
  font-size: 13px;
  color: #999;
  display: block;
}

.doctor-avatar {
  font-size: 36px;
}

.doctor-title {
  font-size: 12px;
  color: #667eea;
  margin-left: 5px;
}

.radio-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #ddd;
  flex-shrink: 0;
  transition: all 0.3s;
}

.radio-indicator.checked {
  border-color: #667eea;
  background: #667eea;
  box-shadow: inset 0 0 0 4px white;
}

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  background: white;
  color: #333;
  transition: border-color 0.3s;
}

.form-input:focus {
  border-color: #4facfe;
}

textarea.form-input {
  resize: none;
  font-family: inherit;
}

.time-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.time-slot {
  padding: 12px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.time-slot.selected {
  background: #667eea;
  color: white;
}

.time-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.type-option {
  padding: 10px 20px;
  background: #f8f9fa;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.type-option.selected {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #1890ff;
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px 20px;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
