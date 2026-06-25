<template>
  <div class="pet-detail-container">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">宠物详情</span>
      </div>
      <div class="nav-right">
        <button class="edit-btn" @click="goToEdit">编辑</button>
      </div>
    </nav>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else-if="pet">
      <!-- 动态宠物展示区 -->
      <div :class="['pet-stage', `stage-${pet.species}`]">
        <div class="pet-animation-area">
          <div :class="['cartoon-pet', `pet-${pet.species}`]">
            <span class="pet-emoji">{{ getPetEmoji(pet.species) }}</span>
            <span v-if="pet.species === 'fish'" class="pet-bubble bubble1"></span>
            <span v-if="pet.species === 'fish'" class="pet-bubble bubble2"></span>
          </div>
          <div class="pet-ground"></div>
        </div>
        <div class="pet-name-overlay">
          <h2>{{ pet.name }}</h2>
          <p>{{ getSpeciesText(pet.species) }}</p>
        </div>
      </div>

      <!-- 基本信息卡片 -->
      <div class="section">
        <h3 class="section-title">基本信息</h3>
        <div class="info-grid">
          <div class="info-cell">
            <span class="info-label">品种</span>
            <span class="info-value">{{ pet.breed || '未知' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">性别</span>
            <span class="info-value">{{ getGenderText(pet.gender) }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">年龄</span>
            <span class="info-value">{{ pet.age != null ? pet.age + '岁' : '未知' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">体重</span>
            <span class="info-value">{{ pet.weight != null ? pet.weight + 'kg' : '未知' }}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">绝育</span>
            <span class="info-value">{{ getNeuteredText(pet.neutered) }}</span>
          </div>
          <div class="info-cell" v-if="pet.isExotic">
            <span class="info-label">类型</span>
            <span class="info-value">异宠</span>
          </div>
        </div>
      </div>

      <!-- 备注 -->
      <div class="section" v-if="pet.notes">
        <h3 class="section-title">备注信息</h3>
        <p class="notes-content">{{ pet.notes }}</p>
      </div>

      <!-- 健康提示 -->
      <div class="section tips-section">
        <h3 class="section-title">健康小贴士</h3>
        <div class="tips-list">
          <div v-for="(tip, index) in healthTips" :key="index" class="tip-item">
            <span class="tip-icon">{{ tip.icon }}</span>
            <div class="tip-content">
              <h4>{{ tip.title }}</h4>
              <p>{{ tip.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="bottom-action">
        <button class="action-btn edit" @click="goToEdit">编辑信息</button>
        <button class="action-btn delete" @click="handleDelete">删除宠物</button>
      </div>
    </template>

    <div v-else class="empty">宠物信息不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '../api/axios'

const router = useRouter()
const route = useRoute()

const pet = ref(null)
const loading = ref(true)

const speciesEmojiMap = {
  dog: '🐕', cat: '🐱', rabbit: '🐰', hamster: '🐹',
  bird: '🦜', fish: '🐠', exotic: '🦎'
}

const speciesTextMap = {
  dog: '狗狗', cat: '猫咪', rabbit: '兔子', hamster: '仓鼠',
  bird: '鸟类', fish: '鱼类', exotic: '异宠'
}

const getPetEmoji = (species) => speciesEmojiMap[species] || '🐾'
const getSpeciesText = (species) => speciesTextMap[species] || '宠物'
const getGenderText = (gender) => {
  if (gender === 'male') return '公'
  if (gender === 'female') return '母'
  return '未知'
}
const getNeuteredText = (neutered) => {
  if (neutered === true) return '已绝育'
  if (neutered === false) return '未绝育'
  return '未知'
}

// 根据宠物种类生成健康小贴士
const healthTips = computed(() => {
  const species = pet.value?.species
  const tipsMap = {
    dog: [
      { icon: '💉', title: '定期疫苗', content: '每年接种狂犬疫苗和六联疫苗，保障爱犬健康' },
      { icon: '🦴', title: '合理饮食', content: '根据体重和年龄选择合适的狗粮，避免喂食巧克力等禁忌食物' },
      { icon: '🏃', title: '适量运动', content: '每天保证30-60分钟户外运动，大型犬需要更多运动量' }
    ],
    cat: [
      { icon: '💉', title: '定期疫苗', content: '每年接种猫三联疫苗，预防猫瘟等传染病' },
      { icon: '🐟', title: '合理饮食', content: '选择高蛋白猫粮，保证充足饮水，预防泌尿系统疾病' },
      { icon: '🧹', title: '猫砂清洁', content: '每天清理猫砂盆，保持环境卫生，减少应激' }
    ],
    rabbit: [
      { icon: '🥕', title: '饮食结构', content: '以干草为主食（80%），搭配少量蔬菜和兔粮' },
      { icon: '🦷', title: '磨牙需求', content: '提供磨牙木或干草，防止牙齿过长' },
      { icon: '🌡️', title: '温度管理', content: '适宜温度15-25℃，避免高温和直射阳光' }
    ],
    hamster: [
      { icon: '🏃', title: '运动需求', content: '提供跑轮满足运动需求，避免肥胖' },
      { icon: '🌰', title: '饮食结构', content: '以仓鼠粮为主，搭配少量坚果和蔬菜' },
      { icon: '🏠', title: '居住环境', content: '独居饲养，提供充足垫料用于筑巢' }
    ],
    bird: [
      { icon: '🥗', title: '均衡饮食', content: '根据鸟种提供谷物、水果和蔬菜的均衡搭配' },
      { icon: '☀️', title: '光照需求', content: '保证每天适量阳光照射，促进维生素D合成' },
      { icon: '🧠', title: '智力刺激', content: '提供玩具和互动，防止无聊导致的啄羽行为' }
    ],
    fish: [
      { icon: '💧', title: '水质管理', content: '定期换水（每周1/3），保持水温恒定' },
      { icon: '🐠', title: '合理喂食', content: '少量多次，避免过量喂食导致水质恶化' },
      { icon: '🌿', title: '环境布置', content: '提供水草和躲避物，模拟自然生态环境' }
    ],
    exotic: [
      { icon: '🌡️', title: '温控环境', content: '根据物种需求设置合适的温度梯度和湿度' },
      { icon: '💡', title: 'UVB照明', content: '爬行动物需要UVB灯促进钙质吸收' },
      { icon: '🦗', title: '活体饲料', content: '根据物种提供合适的活体或冷冻饲料' }
    ]
  }
  return tipsMap[species] || [
    { icon: '❤️', title: '定期体检', content: '建议每年至少进行一次全面体检' },
    { icon: '💉', title: '疫苗接种', content: '按兽医建议定期接种疫苗' },
    { icon: '🍖', title: '合理饮食', content: '根据宠物种类选择合适的饲料' }
  ]
})

const loadPet = async () => {
  loading.value = true
  const id = route.params.id
  try {
    const res = await axios.get(`/pets/${id}`)
    if (res.code === 200) {
      pet.value = res.data
      return
    }
  } catch (error) {
    console.error('[PetDetail] 后端不可用，读取本地数据:', error)
  }

  // 离线模式：从 localStorage 读取宠物数据
  const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
  const found = mockPets.find(p => String(p.id) === String(id))
  pet.value = found || null
  loading.value = false
}

const handleDelete = async () => {
  if (!confirm(`确定要删除宠物"${pet.value.name}"吗？此操作不可撤销`)) return

  try {
    await axios.delete(`/pets/${pet.value.id}`)
  } catch (error) {
    console.error('[PetDetail] 删除失败，使用离线模式:', error)
  }

  // 离线模式：从 localStorage 删除
  const mockPets = JSON.parse(localStorage.getItem('mockPets') || '[]')
  const filtered = mockPets.filter(p => p.id !== pet.value.id)
  localStorage.setItem('mockPets', JSON.stringify(filtered))

  alert('删除成功')
  router.push('/pets')
}

const goBack = () => router.back()
const goToEdit = () => router.push(`/pets/${pet.value.id}/edit`)

onMounted(() => {
  loadPet()
})
</script>

<style scoped>
.pet-detail-container {
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

.edit-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
}

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

/* ===== 动态宠物展示舞台 ===== */
.pet-stage {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.stage-dog { background: linear-gradient(180deg, #e3f2fd 0%, #f0f9ff 70%, #e8f5e9 100%); }
.stage-cat { background: linear-gradient(180deg, #fff3e0 0%, #fff8e1 70%, #ffe0b2 100%); }
.stage-rabbit { background: linear-gradient(180deg, #f3e5f5 0%, #fce4ec 70%, #f8bbd0 100%); }
.stage-hamster { background: linear-gradient(180deg, #fff8e1 0%, #fffde7 70%, #ffe082 100%); }
.stage-bird { background: linear-gradient(180deg, #b3e5fc 0%, #e1f5fe 70%, #b2dfdb 100%); }
.stage-fish { background: linear-gradient(180deg, #4fc3f7 0%, #29b6f6 60%, #0288d1 100%); }
.stage-exotic { background: linear-gradient(180deg, #dcedc8 0%, #f0f4c3 70%, #c5e1a5 100%); }

.pet-animation-area {
  position: relative;
  height: 100%;
}

.cartoon-pet {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 70px;
}

.pet-emoji {
  display: inline-block;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.pet-ground {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 12px;
  background: rgba(0, 0, 0, 0.08);
}

.pet-name-overlay {
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.pet-name-overlay h2 {
  font-size: 28px;
  margin: 0;
}

.pet-name-overlay p {
  font-size: 14px;
  margin: 4px 0 0 0;
  opacity: 0.9;
}

/* 气泡 */
.pet-bubble {
  position: absolute;
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  bottom: 20px;
}

.bubble1 { left: 30%; animation: bubble-rise 2s ease-in infinite; }
.bubble2 { left: 60%; animation: bubble-rise 2.5s ease-in infinite 0.5s; }

@keyframes bubble-rise {
  0% { bottom: 20px; opacity: 0.7; transform: scale(1); }
  100% { bottom: 150px; opacity: 0; transform: scale(1.5); }
}

/* ===== 各类宠物动画 ===== */
.pet-dog { animation: dog-bounce 1.5s ease-in-out infinite; }
.pet-dog .pet-emoji { animation: dog-tail 0.8s ease-in-out infinite; transform-origin: bottom left; }
@keyframes dog-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-12px); }
}
@keyframes dog-tail {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-15deg); }
}

.pet-cat { animation: cat-sway 2s ease-in-out infinite; }
.pet-cat .pet-emoji { animation: cat-blink 3s ease-in-out infinite; }
@keyframes cat-sway {
  0%, 100% { transform: translateX(-50%) rotate(-3deg); }
  50% { transform: translateX(-50%) rotate(3deg); }
}
@keyframes cat-blink {
  0%, 90%, 100% { transform: scaleY(1); }
  93%, 97% { transform: scaleY(0.1); }
}

.pet-rabbit { animation: rabbit-hop 0.8s ease-in-out infinite; }
@keyframes rabbit-hop {
  0%, 100% { transform: translateX(-50%) translateY(0) scaleY(1); }
  30% { transform: translateX(-50%) translateY(-30px) scaleY(1.1); }
  60% { transform: translateX(-50%) translateY(0) scaleY(0.9); }
}

.pet-hamster { animation: hamster-run 2s linear infinite; }
@keyframes hamster-run {
  0% { left: 20%; transform: translateX(0) scaleX(1); }
  49% { left: 80%; transform: translateX(0) scaleX(1); }
  50% { left: 80%; transform: translateX(0) scaleX(-1); }
  99% { left: 20%; transform: translateX(0) scaleX(-1); }
  100% { left: 20%; transform: translateX(0) scaleX(1); }
}

.pet-bird { animation: bird-fly 3s ease-in-out infinite; }
.pet-bird .pet-emoji { animation: bird-wing 0.3s ease-in-out infinite; display: inline-block; }
@keyframes bird-fly {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  25% { transform: translateX(-50%) translateY(-20px) translateX(15px); }
  50% { transform: translateX(-50%) translateY(-8px); }
  75% { transform: translateX(-50%) translateY(-25px) translateX(-15px); }
}
@keyframes bird-wing {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(10deg); }
}

.pet-fish { animation: fish-swim 3s ease-in-out infinite; }
@keyframes fish-swim {
  0%, 100% { transform: translateX(-50%) translateY(0) scaleX(1); }
  25% { transform: translateX(-80%) translateY(-8px) scaleX(1); }
  50% { transform: translateX(-50%) translateY(0) scaleX(-1); }
  75% { transform: translateX(-20%) translateY(8px) scaleX(-1); }
}

.pet-exotic { animation: exotic-crawl 3s ease-in-out infinite; }
@keyframes exotic-crawl {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  25% { transform: translateX(-70%) translateY(-3px); }
  50% { transform: translateX(-50%) translateY(0); }
  75% { transform: translateX(-30%) translateY(-3px); }
}

/* ===== 信息卡片 ===== */
.section {
  background: white;
  border-radius: 15px;
  padding: 20px;
  margin: 15px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.info-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-label {
  font-size: 12px;
  color: #999;
}

.info-value {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.notes-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

/* ===== 健康小贴士 ===== */
.tips-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.tip-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 10px;
}

.tip-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.tip-content h4 {
  font-size: 14px;
  color: #333;
  margin: 0 0 5px 0;
}

.tip-content p {
  font-size: 13px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

/* ===== 底部操作 ===== */
.bottom-action {
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
  height: 48px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.edit {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.action-btn.delete {
  background: #fff2f0;
  color: #ff4d4f;
}

.action-btn:active {
  transform: scale(0.98);
}
</style>
