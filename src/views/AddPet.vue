<template>
  <div class="pm-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-back-btn" @click="goBack">←</span>
        <span class="pm-nav-title">{{ isEdit ? '编辑宠物' : '添加宠物' }}</span>
      </div>
    </nav>

    <div class="pm-content">
      <div class="pm-section avatar-section">
        <div class="avatar-upload">
          <div class="avatar" :class="{ hasImage: petForm.avatar }">
            <img v-if="petForm.avatar" :src="petForm.avatar" alt="宠物头像" />
            <span v-else>{{ getDefaultAvatarEmoji() }}</span>
          </div>
          <input type="file" class="avatar-input" accept="image/*" @change="handleAvatarUpload" />
          <span class="upload-text">{{ petForm.species ? '点击上传头像（已使用默认卡通头像）' : '请先选择宠物类型' }}</span>
        </div>
      </div>

      <div class="pm-section">
        <div class="pm-form-group">
          <label class="pm-form-label">宠物名称 <span class="required">*</span></label>
          <input
            v-model="petForm.name"
            type="text"
            placeholder="请输入宠物名称"
            class="pm-input"
          />
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">宠物类型 <span class="required">*</span></label>
          <select v-model="petForm.species" @change="onSpeciesChange" class="pm-select">
            <option value="">请选择</option>
            <option value="dog">🐕 狗</option>
            <option value="cat">🐱 猫</option>
            <option value="rabbit">🐰 兔子</option>
            <option value="hamster">🐹 仓鼠</option>
            <option value="bird">🦜 鸟类</option>
            <option value="fish">🐠 鱼类</option>
            <option value="exotic">🦎 异宠</option>
          </select>
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">品种 <span class="required">*</span></label>
          <input
            v-if="petForm.species === 'exotic' || isCustomBreed"
            v-model="petForm.breed"
            type="text"
            :placeholder="petForm.species === 'exotic' ? '请输入异宠品种（如：蜥蜴、蛇、龟等）' : '请输入品种名称'"
            class="pm-input"
          />
          <select v-else v-model="petForm.breed" @change="onBreedChange" class="pm-select">
            <option value="">请选择品种</option>
            <option v-for="breed in breedOptions" :key="breed" :value="breed">{{ breed }}</option>
          </select>
          <button
            v-if="petForm.species !== 'exotic' && isCustomBreed"
            type="button"
            class="pm-btn pm-btn-sm pm-btn-outline breed-reset-btn"
            @click="resetCustomBreed"
          >← 返回选择</button>
        </div>

        <div class="form-row">
          <div class="pm-form-group half">
            <label class="pm-form-label">年龄（岁）</label>
            <input
              v-model.number="petForm.age"
              type="number"
              placeholder="请输入年龄"
              min="0"
              max="30"
              class="pm-input"
            />
          </div>
          <div class="pm-form-group half">
            <label class="pm-form-label">体重（kg）</label>
            <input
              v-model.number="petForm.weight"
              type="number"
              placeholder="请输入体重"
              min="0"
              step="0.1"
              class="pm-input"
            />
          </div>
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">性别</label>
          <div class="gender-options">
            <label :class="['gender-option', { selected: petForm.gender === 'male' }]">
              <input type="radio" v-model="petForm.gender" value="male" />
              <span>公</span>
            </label>
            <label :class="['gender-option', { selected: petForm.gender === 'female' }]">
              <input type="radio" v-model="petForm.gender" value="female" />
              <span>母</span>
            </label>
            <label :class="['gender-option', { selected: petForm.gender === '' }]">
              <input type="radio" v-model="petForm.gender" value="" />
              <span>未知</span>
            </label>
          </div>
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">是否已绝育</label>
          <div class="boolean-options">
            <label :class="['boolean-option', { selected: petForm.neutered === true }]">
              <input type="radio" v-model="petForm.neutered" :value="true" />
              <span>是</span>
            </label>
            <label :class="['boolean-option', { selected: petForm.neutered === false }]">
              <input type="radio" v-model="petForm.neutered" :value="false" />
              <span>否</span>
            </label>
            <label :class="['boolean-option', { selected: petForm.neutered === null }]">
              <input type="radio" v-model="petForm.neutered" :value="null" />
              <span>未知</span>
            </label>
          </div>
        </div>

        <div class="pm-form-group">
          <label class="pm-form-label">备注信息</label>
          <textarea
            v-model="petForm.notes"
            placeholder="请输入备注信息（选填）"
            rows="3"
            class="pm-textarea"
          ></textarea>
        </div>
      </div>

      <div class="pm-bottom-action">
        <button class="pm-btn pm-btn-block" @click="submitForm" :disabled="!isFormValid || submitting">
          {{ submitting ? '提交中...' : (isEdit ? '保存修改' : '添加宠物') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '../api/axios'

const router = useRouter()
const route = useRoute()
const submitting = ref(false)
const isCustomBreed = ref(false) // 品种选择"其他"时，切换为自由输入模式

const isEdit = computed(() => !!route.params.id)

const petForm = reactive({
  id: null,
  name: '',
  species: '',
  breed: '',
  age: null,
  weight: null,
  gender: '',
  neutered: null,
  notes: '',
  avatar: '',
  isExotic: false
})

const breedOptions = computed(() => {
  const breeds = {
    dog: ['金毛', '拉布拉多', '哈士奇', '泰迪', '柯基', '柴犬', '萨摩耶', '比熊', '贵宾', '吉娃娃', '其他'],
    cat: ['英短', '美短', '布偶', '暹罗', '波斯', '橘猫', '田园猫', '加菲', '无毛猫', '其他'],
    rabbit: ['垂耳兔', '荷兰兔', '狮子兔', '侏儒兔', '其他'],
    hamster: ['金丝熊', '布丁', '银狐', '三线', '其他'],
    bird: ['鹦鹉', '八哥', '画眉', '鸽子', '其他'],
    fish: ['金鱼', '锦鲤', '热带鱼', '孔雀鱼', '其他'],
    exotic: []
  }
  return breeds[petForm.species] || []
})

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

// 获取当前表单应显示的默认头像（依据已选种类）
const getDefaultAvatarEmoji = () => {
  return speciesEmojiMap[petForm.species] || '🐾'
}

const isFormValid = computed(() => {
  return petForm.name && petForm.species && petForm.breed
})

const onSpeciesChange = () => {
  petForm.breed = ''
  petForm.isExotic = petForm.species === 'exotic'
  isCustomBreed.value = false
}

// 品种下拉变化时，若选了"其他"则切换为自由输入框
const onBreedChange = () => {
  if (petForm.breed === '其他') {
    isCustomBreed.value = true
    petForm.breed = '' // 清空，让用户重新输入
  }
}

// 从自由输入模式返回下拉选择
const resetCustomBreed = () => {
  isCustomBreed.value = false
  petForm.breed = ''
}

const handleAvatarUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      petForm.avatar = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 将后端宠物数据填入表单（兼容 snake_case / camelCase / 0/1）
const fillFormFromPet = (pet) => {
  petForm.id = pet.id
  petForm.name = pet.name || ''
  petForm.species = pet.species || ''
  petForm.breed = pet.breed || ''
  petForm.age = pet.age != null ? Number(pet.age) : null
  petForm.weight = pet.weight != null ? Number(pet.weight) : null
  petForm.gender = pet.gender || ''
  // 后端 neutered 为 0/1/null，前端表单需要 true/false/null
  const neutered = pet.neutered
  petForm.neutered = (neutered === null || neutered === undefined) ? null : !!Number(neutered)
  petForm.notes = pet.notes || ''
  petForm.avatar = pet.avatar || ''
  petForm.isExotic = !!Number(pet.isExotic) || pet.species === 'exotic'
  // 编辑模式下：若 breed 不在当前 species 的预设列表中，切到自由输入模式
  if (petForm.species && petForm.species !== 'exotic') {
    const presets = breedOptions.value
    if (petForm.breed && !presets.includes(petForm.breed)) {
      isCustomBreed.value = true
    }
  }
}

const loadPet = async () => {
  if (!isEdit.value) return
  const petId = route.params.id
  // 1. 优先从 sessionStorage 读取（列表页传入的完整数据）
  try {
    const cached = sessionStorage.getItem('currentPet')
    if (cached) {
      const pet = JSON.parse(cached)
      if (String(pet.id) === String(petId)) {
        fillFormFromPet(pet)
        console.log('[AddPet] 从 sessionStorage 预填成功:', pet.name)
        return
      }
    }
  } catch (e) {
    console.warn('[AddPet] sessionStorage 解析失败')
  }
  // 2. 尝试后端 API
  try {
    const res = await axios.get(`/pets/${petId}`)
    if (res.code === 200) {
      fillFormFromPet(res.data)
      console.log('[AddPet] 从后端预填成功:', res.data.name)
      return
    }
  } catch (error) {
    console.error('[AddPet] 后端不可用，尝试本地数据:', error)
  }
  // 3. 离线兜底：从 localStorage.mockPets 读取
  const pets = JSON.parse(localStorage.getItem('mockPets') || '[]')
  const pet = pets.find(p => String(p.id) === String(petId))
  if (pet) {
    fillFormFromPet(pet)
    console.log('[AddPet] 从 localStorage 预填成功:', pet.name)
  } else {
    console.warn('[AddPet] 未找到宠物数据，表单为空')
  }
}

const submitForm = async () => {
  console.log('[AddPet] 表单数据:', petForm)

  if (!isFormValid.value) {
    console.log('[AddPet] 表单验证失败:', { name: petForm.name, species: petForm.species, breed: petForm.breed })
    alert('请填写必填项（名称、类型、品种）')
    return
  }

  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) {
    alert('请先登录')
    router.push('/login')
    return
  }

  submitting.value = true

  // 检测是否为离线用户（mock-token），离线用户直接走 localStorage，避免后端 user_id 溢出
  const token = localStorage.getItem('token') || ''
  const isOfflineUser = token.startsWith('mock-token-')

  // userId 不再提交，后端统一取 token 身份；离线分支仍用 user.id 归属本地数据
  const petData = {
    name: petForm.name,
    species: petForm.species,
    breed: petForm.breed,
    age: petForm.age,
    weight: petForm.weight,
    gender: petForm.gender || null,
    neutered: petForm.neutered,
    notes: petForm.notes || null,
    avatar: petForm.avatar || null,
    isExotic: petForm.isExotic
  }
  console.log('[AddPet] 提交数据:', petData, '离线用户:', isOfflineUser)

  // 离线用户：直接走 localStorage
  if (isOfflineUser) {
    const pets = JSON.parse(localStorage.getItem('mockPets') || '[]')
    if (isEdit.value) {
      const index = pets.findIndex(p => String(p.id) === String(petForm.id))
      if (index !== -1) {
        pets[index] = { ...pets[index], ...petData, id: petForm.id }
      }
      localStorage.setItem('mockPets', JSON.stringify(pets))
      alert('修改成功')
    } else {
      // 离线数据仍需 userId 归属，供列表按本地用户过滤
      const newPet = { ...petData, userId: user.id, id: Date.now() }
      pets.push(newPet)
      localStorage.setItem('mockPets', JSON.stringify(pets))
      alert('添加成功')
    }
    router.push('/pets')
    submitting.value = false
    return
  }

  // 在线用户：调用后端 API
  try {
    let res
    if (isEdit.value) {
      petData.id = petForm.id
      res = await axios.put('/pets', petData)
    } else {
      res = await axios.post('/pets', petData)
    }

    console.log('[AddPet] 返回结果:', res)

    if (res && res.code === 200) {
      alert(isEdit.value ? '修改成功' : '添加成功')
      router.push('/pets')
    } else if (res && res.code === 403) {
      // 后端校验用户不存在（通常是离线注册的时间戳 id），提示重新登录
      alert(res.message || '用户信息异常，请重新登录')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    } else {
      alert(res?.message || '操作失败')
    }
  } catch (error) {
    console.error('[AddPet] 提交异常:', error)
    console.error('[AddPet] 错误详情:', error.response?.data || error.message)
    // 网络错误兜底：存入 localStorage
    if (isEdit.value) {
      const pets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      const index = pets.findIndex(p => String(p.id) === String(petForm.id))
      if (index !== -1) {
        pets[index] = { ...pets[index], ...petData, id: petForm.id }
      }
      localStorage.setItem('mockPets', JSON.stringify(pets))
    } else {
      const pets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      pets.push({ ...petData, userId: user.id, id: Date.now() })
      localStorage.setItem('mockPets', JSON.stringify(pets))
    }
    alert(isEdit.value ? '修改成功（离线模式）' : '添加成功（离线模式）')
    router.push('/pets')
  } finally {
    submitting.value = false
  }
}

const goBack = () => router.back()

onMounted(() => {
  loadPet()
})
</script>

<style scoped>
/* 头像预览区域 */
.avatar-section {
  text-align: center;
  padding: 25px 16px;
}

.avatar-upload {
  position: relative;
  display: inline-block;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff0f5 0%, #ffd6e7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  cursor: pointer;
  transition: all 0.3s;
  border: 3px dashed #ffb3c8;
}

.avatar.hasImage {
  border-style: solid;
  border-color: #d6709f;
  box-shadow: 0 6px 20px rgba(214, 112, 159, 0.25);
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-text {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  color: #b094b8;
}

/* 表单行布局 */
.form-row {
  display: flex;
  gap: 15px;
}

.pm-form-group.half {
  flex: 1;
}

/* 必填标记 */
.required {
  color: #ff4d6d;
}

/* 性别 / 绝育 选项 */
.gender-options,
.boolean-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.gender-option,
.boolean-option {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 20px;
  background: #fff;
  border-radius: 20px;
  cursor: pointer;
  border: 2px solid #ffe8f0;
  transition: all 0.3s;
  color: #5a4a5a;
  font-size: 14px;
}

.gender-option.selected,
.boolean-option.selected {
  background: rgba(214, 112, 159, 0.1);
  border-color: #d6709f;
  color: #d6709f;
  font-weight: 500;
}

.gender-option input,
.boolean-option input {
  display: none;
}

/* 自定义品种输入模式下的"返回选择"按钮 */
.breed-reset-btn {
  margin-top: 8px;
  font-size: 12px;
  padding: 4px 12px;
}
</style>
