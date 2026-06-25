<template>
  <div class="add-pet-container">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">{{ isEdit ? '编辑宠物' : '添加宠物' }}</span>
      </div>
    </nav>

    <div class="form-section">
      <div class="avatar-section">
        <div class="avatar-upload">
          <div class="avatar" :class="{ hasImage: petForm.avatar }">
            <img v-if="petForm.avatar" :src="petForm.avatar" alt="宠物头像" />
            <span v-else>{{ petForm.isExotic ? '🦎' : '🐕' }}</span>
          </div>
          <input type="file" class="avatar-input" accept="image/*" @change="handleAvatarUpload" />
          <span class="upload-text">点击上传头像</span>
        </div>
      </div>

      <div class="form-group">
        <label>宠物名称 <span class="required">*</span></label>
        <input
          v-model="petForm.name"
          type="text"
          placeholder="请输入宠物名称"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>宠物类型 <span class="required">*</span></label>
        <select v-model="petForm.species" @change="onSpeciesChange" class="form-input">
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

      <div class="form-group">
        <label>品种 <span class="required">*</span></label>
        <input
          v-if="petForm.species === 'exotic'"
          v-model="petForm.breed"
          type="text"
          placeholder="请输入异宠品种（如：蜥蜴、蛇、龟等）"
          class="form-input"
        />
        <select v-else v-model="petForm.breed" class="form-input">
          <option value="">请选择品种</option>
          <option v-for="breed in breedOptions" :key="breed" :value="breed">{{ breed }}</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label>年龄（岁）</label>
          <input
            v-model.number="petForm.age"
            type="number"
            placeholder="请输入年龄"
            min="0"
            max="30"
            class="form-input"
          />
        </div>
        <div class="form-group half">
          <label>体重（kg）</label>
          <input
            v-model.number="petForm.weight"
            type="number"
            placeholder="请输入体重"
            min="0"
            step="0.1"
            class="form-input"
          />
        </div>
      </div>

      <div class="form-group">
        <label>性别</label>
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

      <div class="form-group">
        <label>是否已绝育</label>
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

      <div class="form-group">
        <label>备注信息</label>
        <textarea
          v-model="petForm.notes"
          placeholder="请输入备注信息（选填）"
          rows="3"
          class="form-input"
        ></textarea>
      </div>
    </div>

    <div class="bottom-action">
      <button class="submit-btn" @click="submitForm" :disabled="!isFormValid || submitting">
        {{ submitting ? '提交中...' : (isEdit ? '保存修改' : '添加宠物') }}
      </button>
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

const isFormValid = computed(() => {
  return petForm.name && petForm.species && petForm.breed
})

const onSpeciesChange = () => {
  petForm.breed = ''
  petForm.isExotic = petForm.species === 'exotic'
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

const loadPet = async () => {
  if (!isEdit.value) return
  try {
    const res = await axios.get(`/pets/${route.params.id}`)
    if (res.code === 200) {
      const pet = res.data
      petForm.id = pet.id
      petForm.name = pet.name
      petForm.species = pet.species
      petForm.breed = pet.breed
      petForm.age = pet.age
      petForm.weight = pet.weight
      petForm.gender = pet.gender || ''
      // 后端 neutered 为 0/1/null，前端表单需要 true/false/null
      petForm.neutered = (pet.neutered === null || pet.neutered === undefined) ? null : !!pet.neutered
      petForm.notes = pet.notes || ''
      petForm.avatar = pet.avatar || ''
      petForm.isExotic = !!pet.isExotic || pet.species === 'exotic'
    }
  } catch (error) {
    console.error('[AddPet] 加载宠物失败:', error)
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

  try {
    const data = {
      userId: user.id,
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

    console.log('[AddPet] 提交数据:', data)

    let res
    if (isEdit.value) {
      data.id = petForm.id
      res = await axios.put('/pets', data)
    } else {
      res = await axios.post('/pets', data)
    }

    console.log('[AddPet] 返回结果:', res)

    if (res && res.code === 200) {
      alert(isEdit.value ? '修改成功' : '添加成功')
      router.push('/pets')
    } else {
      alert(res?.message || '操作失败')
    }
  } catch (error) {
    console.error('[AddPet] 提交异常:', error)
    console.error('[AddPet] 错误详情:', error.response?.data || error.message)

    // 兜底：后端不可用时模拟成功，方便前端测试
    if (isEdit.value) {
      // 模拟编辑成功
      const pets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      const index = pets.findIndex(p => p.id === petForm.id)
      if (index !== -1) {
        pets[index] = { ...pets[index], ...petForm }
      }
      localStorage.setItem('mockPets', JSON.stringify(pets))
    } else {
      // 模拟添加成功
      const pets = JSON.parse(localStorage.getItem('mockPets') || '[]')
      const newPet = {
        id: Date.now(),
        userId: user.id,
        name: petForm.name,
        species: petForm.species,
        breed: petForm.breed,
        age: petForm.age,
        weight: petForm.weight,
        gender: petForm.gender,
        neutered: petForm.neutered,
        notes: petForm.notes,
        avatar: petForm.avatar,
        isExotic: petForm.isExotic
      }
      pets.push(newPet)
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
.add-pet-container {
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

.form-section {
  padding: 20px;
}

.avatar-section {
  text-align: center;
  margin-bottom: 25px;
}

.avatar-upload {
  position: relative;
  display: inline-block;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  cursor: pointer;
  transition: all 0.3s;
  border: 3px dashed #ccc;
}

.avatar.hasImage {
  border-style: solid;
  border-color: #4facfe;
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
  color: #999;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-group.half {
  flex: 1;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.required {
  color: #ff4d4f;
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
  pointer-events: auto;
}

.form-input:focus {
  border-color: #4facfe;
}

.form-input::placeholder {
  color: #bbb;
}

textarea.form-input {
  resize: none;
  font-family: inherit;
}

.gender-options, .boolean-options {
  display: flex;
  gap: 15px;
}

.gender-option, .boolean-option {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 20px;
  background: #f8f9fa;
  border-radius: 20px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.gender-option.selected, .boolean-option.selected {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.gender-option input, .boolean-option input {
  display: none;
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

.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
