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

      <!-- 我的宠物（草坪展示区） -->
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

        <!-- 草坪展示区：所有宠物在同一个草坪上玩耍 -->
        <div v-else class="lawn-scene">
          <div class="sky-layer">
            <div class="sun"></div>
            <div class="cloud cloud-1"></div>
            <div class="cloud cloud-2"></div>
            <div class="cloud cloud-3"></div>
          </div>
          <div class="grass-layer">
            <span class="grass-blade" v-for="n in 20" :key="n" :style="{ left: (n * 5 - 2) + '%' }"></span>
            <span class="flower flower-1">🌼</span>
            <span class="flower flower-2">🌷</span>
            <span class="flower flower-3">🌸</span>
            <span class="flower flower-4">🌻</span>
          </div>
          <div class="pets-layer">
            <div
              v-for="(pet, index) in pets"
              :key="pet.id"
              :class="['lawn-pet', `lawn-pet-${pet.species}`]"
              :style="getPetPosition(index, pets.length)"
              @click="goToPetDetail(pet.id)"
            >
              <span class="lawn-pet-emoji">{{ getPetEmoji(pet.species) }}</span>
              <span class="lawn-pet-name">{{ pet.name }}</span>
            </div>
          </div>
          <div class="butterfly">🦋</div>
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

// 计算宠物在草坪上的位置（均匀分布 + 贴地显示，避免浮空穿模）
const getPetPosition = (index, total) => {
  // 横向：在 8%~92% 范围内均匀分布
  const spacing = 84 / Math.max(total, 1)
  const left = 8 + spacing * index + spacing / 2
  // 纵向：紧贴草地底部（容器高 280px，草地占下 50% = 140px）
  // bottom 设为 2%~5%，让宠物脚贴近草尖，避免浮空感
  const bottom = 2 + (index % 2) * 3
  return { left: left + '%', bottom: bottom + '%' }
}

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
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id)).slice(0, 4)
    return
  }
  try {
    const res = await axios.get('/pets', { params: { userId: user.id } })
    if (res.code === 200) {
      const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      const localPets = mockPets.filter(p => String(p.userId) === String(user.id))
      pets.value = [...res.data, ...localPets].slice(0, 4)
    }
  } catch (error) {
    console.error('[Home] 后端不可用，读取本地宠物数据:', error)
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id)).slice(0, 4)
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
/* 草坪展示区样式（保留，其它样式由全局 theme.css 提供） */

/* ===== 草坪展示区 ===== */
.lawn-scene {
  position: relative;
  width: 100%;
  height: 280px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  cursor: default;
}

/* 天空层 */
.sky-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, #87ceeb 0%, #b3e5fc 60%, #e1f5fe 100%);
}

.sun {
  position: absolute;
  top: 12px;
  right: 20px;
  width: 36px;
  height: 36px;
  background: radial-gradient(circle, #fff9c4 0%, #ffeb3b 60%, #ffc107 100%);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(255, 235, 59, 0.6);
  animation: sun-glow 3s ease-in-out infinite;
}
@keyframes sun-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 235, 59, 0.6); }
  50% { box-shadow: 0 0 30px rgba(255, 235, 59, 0.9); }
}

.cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 30px;
  filter: blur(1px);
}
.cloud-1 {
  top: 20px;
  left: -30px;
  width: 60px;
  height: 18px;
  animation: cloud-drift 25s linear infinite;
}
.cloud-2 {
  top: 40px;
  left: -40px;
  width: 80px;
  height: 22px;
  animation: cloud-drift 35s linear infinite 5s;
}
.cloud-3 {
  top: 15px;
  left: -50px;
  width: 50px;
  height: 15px;
  animation: cloud-drift 30s linear infinite 12s;
}
@keyframes cloud-drift {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(100vw + 100px)); }
}

/* 草地层 */
.grass-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, #81c784 0%, #66bb6a 40%, #4caf50 100%);
  overflow: hidden;
}

.grass-blade {
  position: absolute;
  bottom: 0;
  width: 3px;
  height: 14px;
  background: #388e3c;
  border-radius: 50% 50% 0 0;
  animation: grass-sway 2.5s ease-in-out infinite;
}
@keyframes grass-sway {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.flower {
  position: absolute;
  font-size: 16px;
  animation: flower-bob 3s ease-in-out infinite;
}
.flower-1 { bottom: 10px; left: 8%; }
.flower-2 { bottom: 25px; left: 25%; animation-delay: 0.5s; }
.flower-3 { bottom: 8px; left: 70%; animation-delay: 1s; }
.flower-4 { bottom: 22px; left: 88%; animation-delay: 1.5s; }
@keyframes flower-bob {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-3px) rotate(3deg); }
}

/* 宠物层 */
.pets-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.lawn-pet {
  position: absolute;
  text-align: center;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s;
  z-index: 2;
  /* 关键：以底部为旋转中心，避免 rotate 时脚离地 */
  transform-origin: bottom center;
  /* GPU 加速，防止页面滚动时动画卡顿/浮空 */
  will-change: transform;
  transform: translateZ(0);
}
.lawn-pet:active {
  transform: scale(0.92);
}

.lawn-pet-emoji {
  display: block;
  font-size: 36px;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.25));
  margin-bottom: 2px;
  line-height: 1;
}

.lawn-pet-name {
  display: inline-block;
  background: rgba(255, 255, 255, 0.85);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: #555;
  white-space: nowrap;
  backdrop-filter: blur(4px);
}

/* 不同种类的宠物行为动画（幅度小化，避免浮空） */
.lawn-pet-dog {
  animation: lawn-dog-bounce 1.4s ease-in-out infinite;
}
@keyframes lawn-dog-bounce {
  0%, 100% { transform: translateZ(0) translateY(0) rotate(-2deg); }
  50% { transform: translateZ(0) translateY(-6px) rotate(2deg); }
}

.lawn-pet-cat {
  animation: lawn-cat-sway 2.5s ease-in-out infinite;
}
@keyframes lawn-cat-sway {
  0%, 100% { transform: translateZ(0) rotate(-4deg); }
  50% { transform: translateZ(0) rotate(4deg); }
}

.lawn-pet-rabbit {
  animation: lawn-rabbit-hop 0.9s ease-in-out infinite;
}
@keyframes lawn-rabbit-hop {
  0%, 100% { transform: translateZ(0) translateY(0) scaleY(1); }
  30% { transform: translateZ(0) translateY(-10px) scaleY(1.05); }
  60% { transform: translateZ(0) translateY(0) scaleY(0.95); }
}

.lawn-pet-hamster {
  animation: lawn-hamster-walk 2.5s ease-in-out infinite;
}
@keyframes lawn-hamster-walk {
  0%, 100% { transform: translateZ(0) translateX(0); }
  25% { transform: translateZ(0) translateX(6px); }
  75% { transform: translateZ(0) translateX(-6px); }
}

.lawn-pet-bird {
  animation: lawn-bird-fly 3.5s ease-in-out infinite;
}
@keyframes lawn-bird-fly {
  0%, 100% { transform: translateZ(0) translate(0, 0); }
  25% { transform: translateZ(0) translate(8px, -8px); }
  50% { transform: translateZ(0) translate(0, -14px); }
  75% { transform: translateZ(0) translate(-8px, -8px); }
}

.lawn-pet-fish {
  animation: lawn-fish-swim 3s ease-in-out infinite;
}
@keyframes lawn-fish-swim {
  0%, 100% { transform: translateZ(0) translateX(0) scaleX(1); }
  49% { transform: translateZ(0) translateX(8px) scaleX(1); }
  50% { transform: translateZ(0) translateX(8px) scaleX(-1); }
  100% { transform: translateZ(0) translateX(0) scaleX(-1); }
}

.lawn-pet-exotic {
  animation: lawn-exotic-crawl 3s ease-in-out infinite;
}
@keyframes lawn-exotic-crawl {
  0%, 100% { transform: translateZ(0) translateX(0) translateY(0); }
  25% { transform: translateZ(0) translateX(5px) translateY(-1px); }
  75% { transform: translateZ(0) translateX(-5px) translateY(0); }
}

/* 蝴蝶装饰 */
.butterfly {
  position: absolute;
  top: 30%;
  left: 40%;
  font-size: 20px;
  z-index: 3;
  animation: butterfly-fly 6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes butterfly-fly {
  0% { top: 30%; left: 40%; transform: rotate(0deg); }
  25% { top: 20%; left: 60%; transform: rotate(15deg); }
  50% { top: 35%; left: 70%; transform: rotate(-10deg); }
  75% { top: 25%; left: 50%; transform: rotate(20deg); }
  100% { top: 30%; left: 40%; transform: rotate(0deg); }
}
</style>
