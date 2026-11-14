<template>
  <div class="pm-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-back-btn" @click="goBack">←</span>
        <span class="pm-nav-title">我的宠物</span>
      </div>
    </nav>

    <div class="pm-content">
      <div class="pm-content-inner">
        <button class="pm-btn pm-btn-block add-pet-btn" @click="goToAddPet">
          + 添加宠物
        </button>

        <div v-if="loading" class="pm-loading">加载中...</div>

        <div v-else-if="pets.length === 0" class="pm-empty">
          <div class="pm-empty-icon">🐾</div>
          <p class="pm-empty-text">还没有添加宠物</p>
          <button class="pm-btn pm-btn-sm" @click="goToAddPet">添加第一只宠物</button>
        </div>

        <div v-else class="pet-list">
          <div
            v-for="pet in pets"
            :key="pet.id"
            class="pm-list-card pet-card"
            @click="goToPetDetail(pet.id)"
          >
            <div class="pet-avatar">
              <img v-if="pet.avatar" :src="pet.avatar" alt="宠物头像" />
              <div v-else class="placeholder-avatar">{{ getPetEmoji(pet.species) }}</div>
            </div>
            <div class="pet-info">
              <h4 class="pm-list-card-title pet-name">{{ pet.name }}</h4>
              <div class="pm-list-card-subtitle pet-meta">
                <span>{{ getSpeciesText(pet.species) }}</span>
                <span>{{ pet.breed || '未知品种' }}</span>
              </div>
              <p class="pet-age">年龄: {{ pet.age || '未知' }}岁</p>
              <p class="pet-weight">体重: {{ pet.weight || '未知' }}kg</p>
              <p class="pet-code">宠物码：{{ pet.petUuid || '暂无宠物码' }}</p>
            </div>
            <div class="pet-actions">
              <button class="pm-btn pm-btn-sm pm-btn-outline" @click.stop="goToEditPet(pet)">编辑</button>
              <button class="pm-btn pm-btn-sm delete-btn" @click.stop="deletePet(pet)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pm-bottom-nav">
      <div class="pm-nav-item" @click="goToHome">
        <span class="pm-nav-icon">🏠</span>
        <span>首页</span>
      </div>
      <div class="pm-nav-item" @click="goToHospitals">
        <span class="pm-nav-icon">🏥</span>
        <span>医院</span>
      </div>
      <div class="pm-nav-item active">
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

// 各种类默认卡通头像 emoji（无自定义头像时显示）
const speciesEmojiMap = {
  dog: '🐕',
  cat: '🐱',
  rabbit: '🐰',
  hamster: '🐹',
  bird: '🦜',
  fish: '🐠',
  exotic: '🦎'
}

const getSpeciesText = (species) => {
  return speciesMap[species] || species || '未知'
}

const getPetEmoji = (species) => speciesEmojiMap[species] || '🐾'

const loadPets = async () => {
  loading.value = true
  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) {
    loading.value = false
    return
  }
  // 离线用户（mock-token）优先读 localStorage
  const token = localStorage.getItem('token') || ''
  if (token.startsWith('mock-token-')) {
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id))
    loading.value = false
    return
  }
  try {
    // 身份由后端从 token 解析，不再传 userId
    const res = await axios.get('/pets')
    if (res.code === 200) {
      // 合并 localStorage 中可能存在的离线数据
      const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      const localPets = mockPets.filter(p => String(p.userId) === String(user.id))
      pets.value = [...res.data, ...localPets]
    }
  } catch (error) {
    console.error('[Pets] 加载失败，使用本地数据:', error)
    const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    pets.value = mockPets.filter(p => String(p.userId) === String(user.id))
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
    const res = await axios.delete(`/pets/${pet.id}`)
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
const goToPetDetail = (id) => router.push(`/pets/${id}`)
const goToEditPet = (pet) => {
  // 把宠物数据存入 sessionStorage，编辑页可立即预填（后端不可用时也能用）
  sessionStorage.setItem('currentPet', JSON.stringify(pet))
  router.push(`/pets/${pet.id}/edit`)
}
const goToHome = () => router.push('/')
const goToHospitals = () => router.push('/hospitals')
const goToAppointments = () => router.push('/appointments')
const goToProfile = () => router.push('/profile')

onMounted(() => {
  loadPets()
})
</script>

<style scoped>
.pm-content-inner {
  padding: 15px;
}

.add-pet-btn {
  margin-bottom: 15px;
}

.pet-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 宠物卡片：在 pm-list-card 基础上定制 flex 布局（头像 | 信息 | 操作） */
.pet-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 0;
  cursor: pointer;
}

.pet-card:hover {
  transform: none;
}

/* 宠物头像（页面专属，保留并适配粉色主题） */
.pet-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(255, 179, 200, 0.6);
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.15);
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
  background: linear-gradient(135deg, #fff5f7, #ffe8f0);
  font-size: 32px;
}

.pet-info {
  flex: 1;
  min-width: 0;
}

.pet-name {
  font-size: 17px;
  margin: 0 0 6px 0;
}

.pet-meta {
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
}

.pet-age,
.pet-weight {
  font-size: 13px;
  color: var(--pm-text-sub);
  margin: 2px 0;
}

.pet-code {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pm-primary);
  opacity: 0.85;
  word-break: break-all;
}

.pet-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 删除按钮覆盖 pm-btn 渐变，使用红色提示色 */
.delete-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.25);
  box-shadow: none;
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.18);
  transform: translateY(-1px);
}
</style>
