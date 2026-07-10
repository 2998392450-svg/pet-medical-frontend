<template>
  <div class="pm-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-back-btn" @click="goBack">←</span>
        <span class="pm-nav-title">预约挂号</span>
      </div>
    </nav>

    <div class="pm-content">
      <div class="pm-section hospital-section" v-if="hospital && hospital.id">
        <div class="hospital-card">
          <div class="hospital-icon">🏥</div>
          <div class="hospital-info">
            <h3>{{ hospital.name }}</h3>
            <p>{{ hospital.address }}</p>
          </div>
        </div>
      </div>

      <div class="pm-section">
        <h2 class="pm-section-title">选择宠物</h2>
        <div v-if="pets.length === 0" class="pm-empty">
          <div class="pm-empty-icon">🐾</div>
          <p class="pm-empty-text">还没有添加宠物</p>
          <button class="pm-btn pm-btn-sm pm-btn-outline" @click="goToAddPet">立即添加</button>
        </div>
        <div v-else class="pet-options">
          <div
            v-for="pet in pets"
            :key="pet.id"
            :class="['pm-option', { selected: selectedPet === pet.id }]"
            @click="selectedPet = pet.id"
          >
            <div class="pm-option-icon">{{ getPetEmoji(pet.species) }}</div>
            <div class="pm-option-content">
              <span class="pm-option-title">{{ pet.name }}</span>
              <span class="pm-option-subtitle">{{ pet.breed }}</span>
            </div>
            <span :class="['pm-radio', { checked: selectedPet === pet.id }]"></span>
          </div>
        </div>
      </div>

      <div class="pm-section">
        <h2 class="pm-section-title">选择医生</h2>
        <div v-if="doctors.length === 0" class="pm-empty">
          <div class="pm-empty-icon">👨‍⚕️</div>
          <p class="pm-empty-text">暂无医生信息</p>
        </div>
        <div v-else class="doctor-options">
          <div
            v-for="doctor in doctors"
            :key="doctor.id"
            :class="['pm-option', { selected: selectedDoctor === doctor.id }]"
            @click="selectedDoctor = doctor.id"
          >
            <div class="pm-option-icon">👨‍⚕️</div>
            <div class="pm-option-content">
              <span class="pm-option-title">{{ doctor.name }} <span class="doctor-title">{{ doctor.title }}</span></span>
              <span class="pm-option-subtitle">{{ doctor.specialty }}</span>
            </div>
            <span :class="['pm-radio', { checked: selectedDoctor === doctor.id }]"></span>
          </div>
        </div>
      </div>

      <div class="pm-section">
        <h2 class="pm-section-title">选择日期</h2>
        <div class="date-picker">
          <!-- 用 text + 自定义 placeholder,避免浏览器硬编码 yyyy/mm/日 -->
          <input
            v-model="selectedDate"
            type="text"
            placeholder="点击选择日期(YYYY-MM-DD)"
            class="pm-input"
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

      <div class="pm-section">
        <h2 class="pm-section-title">选择时段</h2>
        <div v-if="!selectedDate" class="pm-empty">
          <div class="pm-empty-icon">📅</div>
          <p class="pm-empty-text">请先选择日期</p>
        </div>
        <div v-else class="pm-time-slots">
          <div
            v-for="slot in timeSlots"
            :key="slot"
            :class="['pm-time-slot', { selected: selectedTime === slot, disabled: isSlotDisabled(slot) }]"
            @click="selectTimeSlot(slot)"
          >
            {{ slot }}
          </div>
        </div>
      </div>

      <div class="pm-section">
        <h2 class="pm-section-title">就诊类型</h2>
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

      <div class="pm-section">
        <h2 class="pm-section-title">备注信息</h2>
        <textarea
          v-model="notes"
          placeholder="请输入备注信息（选填）"
          rows="3"
          class="pm-textarea"
        ></textarea>
      </div>

      <div class="pm-bottom-action">
        <button class="pm-btn pm-btn-block" @click="submitAppointment" :disabled="!isFormValid || submitting">
          {{ submitting ? '提交中...' : '确认预约' }}
        </button>
      </div>
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

// 各种类默认卡通头像 emoji
const speciesEmojiMap = {
  dog: '🐕',
  cat: '🐱',
  rabbit: '🐰',
  hamster: '🐹',
  bird: '🦜',
  fish: '🐠',
  exotic: '🦎'
}
const getPetEmoji = (species) => speciesEmojiMap[species] || '🐾'

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
  let user
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null')
  } catch (e) {
    console.error('[CreateAppointment] user 数据损坏:', e)
    localStorage.removeItem('user')
    user = null
  }
  if (!user) return
  // 离线用户（mock-token）优先读 localStorage
  const token = localStorage.getItem('token') || ''
  if (token.startsWith('mock-token-')) {
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id))
    return
  }
  try {
    const res = await axios.get('/pets', { params: { userId: user.id } })
    if (res.code === 200) {
      // 合并后端与本地（兼顾离线时新增的宠物）
      const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      const localPets = mockPets.filter(p => String(p.userId) === String(user.id))
      const merged = [...res.data]
      localPets.forEach(lp => {
        if (!merged.some(p => String(p.id) === String(lp.id))) merged.push(lp)
      })
      pets.value = merged
    }
  } catch (error) {
    console.error('[CreateAppointment] 后端不可用，读取本地宠物数据:', error)
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id))
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

  let user
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null')
  } catch (e) {
    console.error('[CreateAppointment] user 数据损坏:', e)
    localStorage.removeItem('user')
    user = null
  }
  if (!user) {
    alert('请先登录')
    router.push('/login')
    return
  }

  submitting.value = true
  const selectedPetObj = pets.value.find(p => p.id === selectedPet.value)

  // 离线用户（mock-token）或周边搜索医院（nearby_* ID）直接走 localStorage，避免后端 500
  const token = localStorage.getItem('token') || ''
  const isOfflineUser = token.startsWith('mock-token-')
  const isNearbyHospital = String(hospitalId.value).startsWith('nearby_')

  if (isOfflineUser || isNearbyHospital) {
    const mockAppointments = JSON.parse(localStorage.getItem('mockAppointments') || '[]')
    const newAppointment = {
      id: Date.now(),
      userId: user.id,
      hospitalId: hospitalId.value,
      hospitalName: hospital.value.name || '未知医院',
      hospitalAddress: hospital.value.address || '',
      hospitalPhone: hospital.value.phone || '',
      petId: selectedPet.value,
      petName: selectedPetObj ? selectedPetObj.name : '未知宠物',
      petBreed: selectedPetObj ? selectedPetObj.breed : '',
      doctorId: selectedDoctor.value || null,
      doctorName: doctors.value.find(d => d.id === selectedDoctor.value)?.name || null,
      // 主人名字和联系电话（商家端显示需要）
      userName: user.nickname || user.username || null,
      userNickname: user.nickname || user.username || null,
      contactPhone: user.phone || null,
      userPhone: user.phone || null,
      appointmentDate: selectedDate.value,
      timeSlot: selectedTime.value,
      appointmentTime: `${selectedDate.value} ${selectedTime.value}`,
      type: selectedType.value,
      reason: selectedType.value,
      status: 'pending',
      notes: notes.value || null,
      createdAt: new Date().toISOString()
    }
    mockAppointments.push(newAppointment)
    localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    // 离线用户同步写入 mockUsers，便于商家端补全主人信息
    if (isOfflineUser) {
      const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]')
      const idx = mockUsers.findIndex(u => String(u.id) === String(user.id))
      const userRecord = { id: user.id, username: user.username, nickname: user.nickname || user.username, phone: user.phone || '' }
      if (idx === -1) mockUsers.push(userRecord)
      else mockUsers[idx] = { ...mockUsers[idx], ...userRecord }
      localStorage.setItem('mockUsers', JSON.stringify(mockUsers))
    }
    alert(isOfflineUser ? '预约成功（离线模式）' : '预约成功（周边医院，已保存到本地）')
    router.push('/appointments')
    submitting.value = false
    return
  }

  try {
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
    const newAppointment = {
      id: Date.now(),
      userId: user.id,
      hospitalId: hospitalId.value,
      hospitalName: hospital.value.name || '未知医院',
      hospitalAddress: hospital.value.address || '',
      hospitalPhone: hospital.value.phone || '',
      petId: selectedPet.value,
      petName: selectedPetObj ? selectedPetObj.name : '未知宠物',
      petBreed: selectedPetObj ? selectedPetObj.breed : '',
      doctorId: selectedDoctor.value || null,
      doctorName: doctors.value.find(d => d.id === selectedDoctor.value)?.name || null,
      // 主人名字和联系电话（商家端显示需要）
      userName: user.nickname || user.username || null,
      userNickname: user.nickname || user.username || null,
      contactPhone: user.phone || null,
      userPhone: user.phone || null,
      appointmentDate: selectedDate.value,
      timeSlot: selectedTime.value,
      appointmentTime: `${selectedDate.value} ${selectedTime.value}`,
      type: selectedType.value,
      reason: selectedType.value,
      status: 'pending',
      notes: notes.value || null,
      createdAt: new Date().toISOString()
    }
    mockAppointments.push(newAppointment)
    localStorage.setItem('mockAppointments', JSON.stringify(mockAppointments))
    // 同步写入 mockUsers，便于商家端补全主人信息
    const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]')
    const idx = mockUsers.findIndex(u => String(u.id) === String(user.id))
    const userRecord = { id: user.id, username: user.username, nickname: user.nickname || user.username, phone: user.phone || '' }
    if (idx === -1) mockUsers.push(userRecord)
    else mockUsers[idx] = { ...mockUsers[idx], ...userRecord }
    localStorage.setItem('mockUsers', JSON.stringify(mockUsers))
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
/* 隐藏的原生 date input */
.hidden-native-date {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

/* 医院卡片特殊样式 */
.hospital-section {
  padding: 12px;
}

.hospital-card {
  display: flex;
  gap: 15px;
  background: linear-gradient(135deg, #ff9ec7 0%, #d6709f 100%);
  padding: 20px;
  border-radius: 14px;
  color: white;
  box-shadow: 0 6px 20px rgba(214, 112, 159, 0.25);
}

.hospital-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.hospital-info {
  flex: 1;
}

.hospital-info h3 {
  font-size: 18px;
  margin: 0 0 5px;
  font-weight: 600;
}

.hospital-info p {
  font-size: 13px;
  margin: 0;
  opacity: 0.9;
}

/* 医生职称小标签 */
.doctor-title {
  font-size: 12px;
  color: #d6709f;
  margin-left: 5px;
  font-weight: 500;
}

/* 就诊类型选项 */
.type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.type-option {
  padding: 10px 20px;
  background: #fff;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid #ffe8f0;
  color: #5a4a5a;
}

.type-option.selected {
  background: rgba(214, 112, 159, 0.1);
  color: #d6709f;
  border-color: #d6709f;
  font-weight: 500;
}
</style>
