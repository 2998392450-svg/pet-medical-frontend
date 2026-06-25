<template>
  <div class="home-container">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="logo">🐾</span>
        <span class="title">宠物医疗</span>
      </div>
      <div class="nav-right">
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>
    </nav>

    <div class="hero-section">
      <div class="hero-content">
        <h1>关爱宠物健康</h1>
        <p>为您的宠物提供专业的医疗服务</p>
        <button class="hero-btn" @click="goToHospitals">寻找医院</button>
      </div>
    </div>

    <div class="quick-actions">
      <div class="action-card" @click="goToHospitals">
        <div class="action-icon">🏥</div>
        <span>附近医院</span>
      </div>
      <div class="action-card" @click="goToPets">
        <div class="action-icon">🐕</div>
        <span>我的宠物</span>
      </div>
      <div class="action-card" @click="goToAppointments">
        <div class="action-icon">📅</div>
        <span>我的预约</span>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">热门医院</h2>
      <div v-if="hospitals.length === 0" class="empty-hint">暂无医院数据</div>
      <div v-else class="hospital-list">
        <div v-for="hospital in hospitals" :key="hospital.id" class="hospital-card" @click="goToHospitalDetail(hospital)">
          <div class="hospital-header">
            <div class="hospital-logo">🏥</div>
            <div class="hospital-info">
              <h3>{{ hospital.name }}</h3>
              <div class="hospital-rating">⭐ {{ hospital.rating }}</div>
            </div>
          </div>
          <p class="hospital-address">{{ hospital.address }}</p>
          <div class="hospital-tags">
            <span v-if="hospital.nightService" class="tag night">夜间服务</span>
            <span v-if="hospital.exoticAccept" class="tag exotic">接诊异宠</span>
            <span v-if="hospital.emergencySupport" class="tag emergency">急诊</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的宠物（动态卡通宠物展示区） -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">我的宠物</h2>
        <button class="add-pet-link" @click="goToAddPet">+ 添加</button>
      </div>

      <div v-if="pets.length === 0" class="empty-state">
        <div class="empty-icon">🐾</div>
        <p>还没有添加宠物</p>
        <button class="add-pet-btn" @click="goToAddPet">添加宠物</button>
      </div>

      <!-- 动态宠物展示区 -->
      <div v-else class="pet-playground">
        <div
          v-for="pet in pets"
          :key="pet.id"
          :class="['pet-stage', `stage-${pet.species}`]"
          @click="goToPetDetail(pet.id)"
        >
          <!-- 宠物动画区 -->
          <div class="pet-animation-area">
            <div :class="['cartoon-pet', `pet-${pet.species}`]">
              <span class="pet-emoji">{{ getPetEmoji(pet.species) }}</span>
              <!-- 部分宠物有额外装饰 -->
              <span v-if="pet.species === 'rabbit'" class="pet-shadow"></span>
              <span v-if="pet.species === 'bird'" class="pet-wing"></span>
              <span v-if="pet.species === 'fish'" class="pet-bubble bubble1"></span>
              <span v-if="pet.species === 'fish'" class="pet-bubble bubble2"></span>
            </div>
            <div class="pet-ground"></div>
          </div>
          <!-- 宠物信息 -->
          <div class="pet-info-card">
            <h4>{{ pet.name }}</h4>
            <p>{{ pet.breed || getSpeciesText(pet.species) }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-nav">
      <div class="nav-item active" @click="goToHome">
        <span class="nav-icon">🏠</span>
        <span>首页</span>
      </div>
      <div class="nav-item" @click="goToHospitals">
        <span class="nav-icon">🏥</span>
        <span>医院</span>
      </div>
      <div class="nav-item" @click="goToPets">
        <span class="nav-icon">🐕</span>
        <span>宠物</span>
      </div>
      <div class="nav-item" @click="goToAppointments">
        <span class="nav-icon">📅</span>
        <span>预约</span>
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
  try {
    const res = await axios.get('/pets', { params: { userId: user.id } })
    if (res.code === 200) {
      pets.value = res.data.slice(0, 4)
    }
  } catch (error) {
    console.error('[Home] 后端不可用，读取本地宠物数据:', error)
    // 离线模式：从 localStorage 读取宠物数据
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    const userPets = mockPets.filter(p => p.userId === user.id)
    pets.value = userPets.slice(0, 4)
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
.home-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
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

.logo {
  font-size: 28px;
}

.title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.logout-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 6px 14px;
  border-radius: 15px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.logout-btn:active {
  background: #f5f5f5;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  color: white;
  text-align: center;
}

.hero-content h1 {
  font-size: 28px;
  margin-bottom: 10px;
}

.hero-content p {
  opacity: 0.9;
  margin-bottom: 20px;
}

.hero-btn {
  padding: 12px 32px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.hero-btn:active {
  transform: scale(0.96);
}

.quick-actions {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: white;
  margin: -20px 10px 20px;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.action-card {
  flex: 1;
  text-align: center;
  padding: 15px;
  border-radius: 10px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s;
}

.action-card:active {
  transform: scale(0.95);
}

.action-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.action-card span {
  font-size: 14px;
  color: #666;
}

.section {
  padding: 0 20px;
  margin-bottom: 25px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.add-pet-link {
  background: none;
  border: none;
  color: #4facfe;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 10px;
}

.empty-hint {
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.hospital-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.hospital-card {
  background: white;
  border-radius: 15px;
  padding: 15px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.hospital-header {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.hospital-logo {
  font-size: 40px;
}

.hospital-info h3 {
  font-size: 16px;
  margin-bottom: 3px;
}

.hospital-rating {
  font-size: 13px;
  color: #ff9800;
}

.hospital-address {
  font-size: 13px;
  color: #999;
  margin-bottom: 10px;
}

.hospital-tags {
  display: flex;
  gap: 8px;
}

.tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 15px;
}

.tag.night {
  background: #ffe4b5;
  color: #d4a017;
}

.tag.exotic {
  background: #e6f7ff;
  color: #1890ff;
}

.tag.emergency {
  background: #fff2f0;
  color: #ff4d4f;
}

.empty-state {
  background: white;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.empty-state p {
  color: #999;
  margin-bottom: 15px;
}

.add-pet-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

/* ===== 动态宠物展示区 ===== */
.pet-playground {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.pet-stage {
  background: linear-gradient(180deg, #e3f2fd 0%, #f0f9ff 70%, #e8f5e9 100%);
  border-radius: 15px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.pet-stage:active {
  transform: scale(0.97);
}

/* 不同种类宠物舞台背景 */
.stage-cat {
  background: linear-gradient(180deg, #fff3e0 0%, #fff8e1 70%, #ffe0b2 100%);
}
.stage-rabbit {
  background: linear-gradient(180deg, #f3e5f5 0%, #fce4ec 70%, #f8bbd0 100%);
}
.stage-hamster {
  background: linear-gradient(180deg, #fff8e1 0%, #fffde7 70%, #ffe082 100%);
}
.stage-bird {
  background: linear-gradient(180deg, #b3e5fc 0%, #e1f5fe 70%, #b2dfdb 100%);
}
.stage-fish {
  background: linear-gradient(180deg, #4fc3f7 0%, #29b6f6 60%, #0288d1 100%);
}
.stage-exotic {
  background: linear-gradient(180deg, #dcedc8 0%, #f0f4c3 70%, #c5e1a5 100%);
}

.pet-animation-area {
  position: relative;
  height: 90px;
  overflow: hidden;
}

.cartoon-pet {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 40px;
  display: inline-block;
}

.pet-emoji {
  display: inline-block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.pet-ground {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: rgba(0, 0, 0, 0.08);
}

/* ===== 各类宠物动画 ===== */

/* 狗：摇尾巴 + 轻微跳跃 */
.pet-dog {
  animation: dog-bounce 1.5s ease-in-out infinite;
}
.pet-dog .pet-emoji {
  animation: dog-tail 0.8s ease-in-out infinite;
  transform-origin: bottom left;
}
@keyframes dog-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-8px); }
}
@keyframes dog-tail {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-15deg); }
}

/* 猫：眨眼 + 摇摆 */
.pet-cat {
  animation: cat-sway 2s ease-in-out infinite;
}
.pet-cat .pet-emoji {
  animation: cat-blink 3s ease-in-out infinite;
}
@keyframes cat-sway {
  0%, 100% { transform: translateX(-50%) rotate(-3deg); }
  50% { transform: translateX(-50%) rotate(3deg); }
}
@keyframes cat-blink {
  0%, 90%, 100% { transform: scaleY(1); }
  93%, 97% { transform: scaleY(0.1); }
}

/* 兔子：跳跃 */
.pet-rabbit {
  animation: rabbit-hop 0.8s ease-in-out infinite;
}
@keyframes rabbit-hop {
  0%, 100% { transform: translateX(-50%) translateY(0) scaleY(1); }
  30% { transform: translateX(-50%) translateY(-20px) scaleY(1.1); }
  60% { transform: translateX(-50%) translateY(0) scaleY(0.9); }
}

/* 仓鼠：左右跑动 */
.pet-hamster {
  animation: hamster-run 2s linear infinite;
}
@keyframes hamster-run {
  0% { left: 20%; transform: translateX(0) scaleX(1); }
  49% { left: 80%; transform: translateX(0) scaleX(1); }
  50% { left: 80%; transform: translateX(0) scaleX(-1); }
  99% { left: 20%; transform: translateX(0) scaleX(-1); }
  100% { left: 20%; transform: translateX(0) scaleX(1); }
}

/* 鸟：扇翅膀 + 飞翔 */
.pet-bird {
  animation: bird-fly 3s ease-in-out infinite;
}
.pet-bird .pet-emoji {
  animation: bird-wing 0.3s ease-in-out infinite;
  display: inline-block;
}
@keyframes bird-fly {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  25% { transform: translateX(-50%) translateY(-15px) translateX(10px); }
  50% { transform: translateX(-50%) translateY(-5px); }
  75% { transform: translateX(-50%) translateY(-20px) translateX(-10px); }
}
@keyframes bird-wing {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(10deg); }
}

/* 鱼：游动 + 气泡 */
.pet-fish {
  animation: fish-swim 3s ease-in-out infinite;
}
@keyframes fish-swim {
  0%, 100% { transform: translateX(-50%) translateY(0) scaleX(1); }
  25% { transform: translateX(-80%) translateY(-5px) scaleX(1); }
  50% { transform: translateX(-50%) translateY(0) scaleX(-1); }
  75% { transform: translateX(-20%) translateY(5px) scaleX(-1); }
}

.pet-bubble {
  position: absolute;
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  bottom: 10px;
}

.bubble1 {
  left: 30%;
  animation: bubble-rise 2s ease-in infinite;
}

.bubble2 {
  left: 60%;
  animation: bubble-rise 2.5s ease-in infinite 0.5s;
}

@keyframes bubble-rise {
  0% { bottom: 10px; opacity: 0.7; transform: scale(1); }
  100% { bottom: 80px; opacity: 0; transform: scale(1.5); }
}

/* 异宠（蜥蜴）：爬行 */
.pet-exotic {
  animation: exotic-crawl 3s ease-in-out infinite;
}
@keyframes exotic-crawl {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  25% { transform: translateX(-70%) translateY(-2px); }
  50% { transform: translateX(-50%) translateY(0); }
  75% { transform: translateX(-30%) translateY(-2px); }
}

/* 宠物信息卡片 */
.pet-info-card {
  background: white;
  padding: 10px 12px;
  text-align: center;
}

.pet-info-card h4 {
  font-size: 14px;
  margin: 0 0 2px 0;
  color: #333;
}

.pet-info-card p {
  font-size: 11px;
  color: #999;
  margin: 0;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  padding: 10px 0;
}

.nav-item {
  flex: 1;
  text-align: center;
  cursor: pointer;
  padding: 8px;
  color: #999;
  transition: color 0.3s;
}

.nav-item.active {
  color: #667eea;
}

.nav-icon {
  font-size: 22px;
  display: block;
  margin-bottom: 4px;
}

.nav-item span:last-child {
  font-size: 12px;
}
</style>
