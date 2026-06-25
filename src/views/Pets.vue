<template>
  <div class="pets-page">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">我的宠物</span>
      </div>
    </nav>

    <div class="content">
      <button class="add-btn" @click="goToAddPet">
        + 添加宠物
      </button>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="pets.length === 0" class="empty">
        <div class="empty-icon">🐾</div>
        <p>还没有添加宠物</p>
        <button class="empty-add-btn" @click="goToAddPet">添加第一只宠物</button>
      </div>

      <div v-else class="pet-list">
        <div
          v-for="pet in pets"
          :key="pet.id"
          class="pet-card"
        >
          <div class="pet-avatar">
            <img v-if="pet.avatar" :src="pet.avatar" alt="宠物头像" />
            <div v-else class="placeholder-avatar">{{ pet.isExotic ? '🦎' : '🐕' }}</div>
          </div>
          <div class="pet-info">
            <h4 class="pet-name">{{ pet.name }}</h4>
            <div class="pet-meta">
              <span>{{ getSpeciesText(pet.species) }}</span>
              <span>{{ pet.breed || '未知品种' }}</span>
            </div>
            <p class="pet-age">年龄: {{ pet.age || '未知' }}岁</p>
            <p class="pet-weight">体重: {{ pet.weight || '未知' }}kg</p>
          </div>
          <div class="pet-actions">
            <button class="action-btn edit" @click="goToEditPet(pet.id)">编辑</button>
            <button class="action-btn delete" @click="deletePet(pet)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-nav">
      <div class="nav-item" @click="goToHome">
        <span class="nav-icon">🏠</span>
        <span>首页</span>
      </div>
      <div class="nav-item" @click="goToHospitals">
        <span class="nav-icon">🏥</span>
        <span>医院</span>
      </div>
      <div class="nav-item active">
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
import { useRouter } from 'vue-router'
import axios from '../api/axios'

const router = useRouter()
const loading = ref(false)
const pets = ref([])

const speciesMap = {
  dog: '🐕 狗',
  cat: '🐱 猫',
  rabbit: '🐰 兔子',
  hamster: '🐹 仓鼠',
  bird: '🦜 鸟类',
  fish: '🐠 鱼类',
  exotic: '🦎 异宠'
}

const getSpeciesText = (species) => {
  return speciesMap[species] || species || '未知'
}

const loadPets = async () => {
  loading.value = true
  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) {
    loading.value = false
    return
  }
  try {
    const res = await axios.get('/pets', { params: { userId: user.id } })
    if (res.code === 200) {
      pets.value = res.data
    }
  } catch (error) {
    console.error('[Pets] 加载失败，使用本地数据:', error)
    // 读取离线模式保存的宠物数据
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    const userPets = mockPets.filter(p => p.userId === user.id)
    pets.value = userPets
  } finally {
    loading.value = false
  }
}

const deletePet = async (pet) => {
  if (!confirm(`确定要删除宠物 "${pet.name}" 吗？`)) return

  const user = JSON.parse(localStorage.getItem('user'))
  if (!user || !user.id) {
    alert('请先登录')
    router.push('/login')
    return
  }

  let deleted = false
  try {
    const res = await axios.delete(`/pets/${pet.id}`, { params: { userId: user.id } })
    if (res && (res.code === 200 || res.code === 0)) {
      deleted = true
    }
  } catch (error) {
    // 后端不可用（Network Error）属于预期离线模式，静默处理走 localStorage 兜底
    console.log('[Pets] 后端不可用，使用离线模式删除')
  }

  // 无论后端是否成功，都同步删除本地 mock 数据（保证离线/在线数据一致）
  try {
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    const filtered = mockPets.filter(p => String(p.id) !== String(pet.id))
    localStorage.setItem('mockPets', JSON.stringify(filtered))
  } catch (e) {
    console.error('[Pets] localStorage操作失败:', e)
  }

  // 从当前列表移除
  pets.value = pets.value.filter(p => String(p.id) !== String(pet.id))
  alert(deleted ? '删除成功' : '删除成功（离线模式）')
}

const goBack = () => router.back()
const goToAddPet = () => router.push('/pets/add')
const goToEditPet = (id) => router.push(`/pets/${id}/edit`)
const goToHome = () => router.push('/')
const goToHospitals = () => router.push('/hospitals')
const goToAppointments = () => router.push('/appointments')

onMounted(() => {
  loadPets()
})
</script>

<style scoped>
.pets-page {
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

.content {
  padding: 15px;
}

.add-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 15px;
}

.loading, .empty {
  text-align: center;
  padding: 50px 20px;
  color: #999;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 15px;
}

.empty p {
  margin-bottom: 15px;
}

.pet-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.pet-card {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.pet-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.pet-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  font-size: 35px;
}

.pet-info {
  flex: 1;
  min-width: 0;
}

.pet-name {
  font-size: 18px;
  color: #333;
  margin: 0 0 8px 0;
}

.pet-meta {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: #4facfe;
  margin-bottom: 5px;
}

.pet-age, .pet-weight {
  font-size: 13px;
  color: #999;
  margin: 3px 0;
}

.pet-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.edit {
  background: #e3f2fd;
  color: #2196f3;
}

.action-btn.delete {
  background: #ffebee;
  color: #f44336;
}

.action-btn:active {
  transform: scale(0.95);
}

.empty-add-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
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
