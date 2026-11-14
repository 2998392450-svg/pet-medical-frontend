<template>
  <div class="pm-page home-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-logo">🐾</span>
        <span class="pm-nav-title">宠物医疗</span>
      </div>
      <div class="nav-right">
        <button class="pm-logout-btn" @click="logout">退出登录</button>
      </div>
    </nav>

    <div class="pm-content">
      <div class="pm-hero">
        <h1>关爱宠物健康</h1>
        <p>为您的宠物提供专业的医疗服务</p>
        <button class="pm-hero-btn" @click="goToHospitals">寻找医院</button>
      </div>

      <div class="pm-quick-actions">
        <div class="pm-action-card" @click="goToHospitals">
          <div class="pm-action-icon">🏥</div>
          <span>附近医院</span>
        </div>
        <div class="pm-action-card" @click="goToPets">
          <div class="pm-action-icon">🐕</div>
          <span>我的宠物</span>
        </div>
        <div class="pm-action-card" @click="goToAppointments">
          <div class="pm-action-icon">📅</div>
          <span>我的预约</span>
        </div>
      </div>

      <div class="pm-section">
        <h2 class="pm-section-title">🏥 热门医院</h2>
        <div v-if="hospitals.length === 0" class="pm-empty">
          <div class="pm-empty-icon">🏥</div>
          <div class="pm-empty-text">暂无医院数据</div>
        </div>
        <div v-else>
          <div
            v-for="hospital in hospitals"
            :key="hospital.id"
            class="pm-list-card"
            @click="goToHospitalDetail(hospital)"
          >
            <div class="pm-list-card-header">
              <div class="pm-list-card-icon">🏥</div>
              <div style="flex:1">
                <h3 class="pm-list-card-title">{{ hospital.name }}</h3>
                <div class="pm-rating">⭐ {{ hospital.rating }}</div>
              </div>
            </div>
            <p class="pm-list-card-body">📍 {{ hospital.address }}</p>
            <div style="margin-top:8px">
              <span v-if="hospital.nightService" class="pm-tag pm-tag-night">夜间服务</span>
              <span v-if="hospital.exoticAccept" class="pm-tag pm-tag-exotic">接诊异宠</span>
              <span v-if="hospital.emergencySupport" class="pm-tag pm-tag-emergency">急诊</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的宠物 -->
      <div class="pm-section">
        <div class="pm-section-header">
          <h2 class="pm-section-title">🐾 我的宠物</h2>
          <button class="pm-btn pm-btn-outline pm-btn-sm" @click="goToAddPet">+ 添加</button>
        </div>

        <div v-if="pets.length === 0" class="pm-empty">
          <div class="pm-empty-icon">🐾</div>
          <div class="pm-empty-text">还没有添加宠物</div>
          <button class="pm-btn pm-btn-sm" @click="goToAddPet">添加宠物</button>
        </div>

        <div v-else class="pet-grid">
          <div
            v-for="pet in pets"
            :key="pet.id"
            class="pm-list-card pet-card"
            @click="goToPetDetail(pet.id)"
          >
            <div class="pet-avatar">{{ getPetEmoji(pet.species) }}</div>
            <div class="pet-info">
              <div class="pet-name" :title="pet.name">{{ pet.name }}</div>
              <div class="pet-meta">
                {{ getSpeciesText(pet.species) }}<span v-if="pet.breed"> · {{ pet.breed }}</span>
              </div>
              <div class="pet-code" :title="pet.petUuid">{{ pet.petUuid || '暂无宠物码' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pm-bottom-nav">
      <div class="pm-nav-item active" @click="goToHome">
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
      <div class="pm-nav-item" @click="goToAppointments">
        <span class="pm-nav-icon">📅</span>
        <span>预约</span>
      </div>
      <div class="pm-nav-item" @click="goToProfile">
        <span class="pm-nav-icon">👤</span>
        <span>我的</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '../api/axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const hospitals = ref([])
const pets = ref([])

const speciesEmojiMap = {
  dog: '🐕',
  cat: '🐱',
  rabbit: '🐰',
  hamster: '🐹',
  bird: '🦜',
  fish: '🐠',
  exotic: '🦎'
}

const speciesTextMap = {
  dog: '狗狗',
  cat: '猫咪',
  rabbit: '兔子',
  hamster: '仓鼠',
  bird: '鸟类',
  fish: '鱼类',
  exotic: '异宠'
}

const getPetEmoji = (species) => speciesEmojiMap[species] || '🐾'
const getSpeciesText = (species) => speciesTextMap[species] || '宠物'

const getUser = () => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

const loadHospitals = async () => {
  try {
    const res = await axios.get('/hospitals', { params: { sortBy: 'rating' } })
    if (res.code === 200) {
      hospitals.value = res.data.slice(0, 3)
    }
  } catch (error) {
    console.error('[Home] 加载医院失败:', error)
    // 离线兜底：上海热门医院
    hospitals.value = [
      {
        id: 3, name: '上海芭比堂动物医院(长宁店)', address: '上海市长宁区延安西路2000号',
        rating: 4.9, nightService: true, exoticAccept: false, emergencySupport: true
      },
      {
        id: 1, name: '上海宠颐生动物医院(静安店)', address: '上海市静安区南京西路1788号',
        rating: 4.8, nightService: false, exoticAccept: true, emergencySupport: true
      },
      {
        id: 4, name: '上海瑞鹏宠物医院(浦东店)', address: '上海市浦东新区张杨路500号',
        rating: 4.7, nightService: true, exoticAccept: true, emergencySupport: false
      }
    ]
  }
}

const loadPets = async () => {
  const user = getUser()
  if (!user) return
  // 离线用户（mock-token）优先读 localStorage
  const token = localStorage.getItem('token') || ''
  if (token.startsWith('mock-token-')) {
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id))
    return
  }
  try {
    // 身份由后端从 token 解析，不再传 userId
    const res = await axios.get('/pets')
    if (res.code === 200) {
      const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      const localPets = mockPets.filter(p => String(p.userId) === String(user.id))
      pets.value = [...res.data, ...localPets]
    }
  } catch (error) {
    console.error('[Home] 后端不可用，读取本地宠物数据:', error)
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id))
  }
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

const goToHospitals = () => router.push('/hospitals')
const goToPets = () => router.push('/pets')
const goToPetDetail = (id) => router.push(`/pets/${id}`)
const goToAppointments = () => router.push('/appointments')
const goToAddPet = () => router.push('/pets/add')
const goToHome = () => router.push('/')
const goToProfile = () => router.push('/profile')
const goToHospitalDetail = (hospital) => {
  sessionStorage.setItem('currentHospital', JSON.stringify(hospital))
  router.push(`/hospitals/${hospital.id}`)
}

onMounted(() => {
  loadHospitals()
  loadPets()
})
</script>

<style scoped>
/* 首页我的宠物：自适应卡片网格，窄屏自动降为单列，避免横向溢出 */
.pet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.pet-grid .pm-list-card {
  margin-bottom: 0;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pet-avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 24px;
  background: linear-gradient(135deg, #fff5f7, #ffe8f0);
  border: 2px solid rgba(255, 179, 200, 0.6);
}

.pet-info {
  flex: 1;
  min-width: 0;
}

.pet-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--pm-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pet-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--pm-text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pet-code {
  margin-top: 4px;
  font-size: 11px;
  letter-spacing: 0.3px;
  color: var(--pm-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 360px) {
  .pet-grid {
    grid-template-columns: 1fr;
  }
}
</style>
