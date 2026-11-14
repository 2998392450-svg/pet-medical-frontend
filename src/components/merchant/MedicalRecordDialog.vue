<template>
  <div v-if="modelValue" class="pm-modal-mask" @click.self="close">
    <div class="pm-modal record-dialog">
      <div class="pm-modal-title">开具病历</div>

      <div class="dialog-body">
      <!-- 1. 搜索并选择宠物（原生表单控件，遵循项目既有约定） -->
      <div class="dialog-field">
        <label class="dialog-label">宠物 <span class="required">*</span></label>
        <div class="search-row">
          <input
            v-model="keyword"
            type="text"
            class="pm-input"
            placeholder="输入宠物名或宠物码，如 小白 / PET-2026-0001"
            @keyup.enter="handleSearch"
          />
          <button class="pm-btn pm-btn-sm" :disabled="searching" @click="handleSearch">
            {{ searching ? '搜索中...' : '搜索' }}
          </button>
        </div>

        <div v-if="selectedPet" class="selected-pet">
          <span class="selected-pet-name">
            {{ selectedPet.name }}
            <span class="selected-pet-code">{{ selectedPet.petUuid || '暂无宠物码' }}</span>
          </span>
          <span class="selected-pet-owner" v-if="selectedPet.ownerName">
            主人：{{ selectedPet.ownerName }}
          </span>
          <button class="link-btn" @click="clearSelected">重新选择</button>
        </div>

        <div v-else-if="searchResults.length > 0" class="search-results">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="search-result-item"
            @click="selectPet(item)"
          >
            <div class="result-main">
              <span class="result-name">{{ item.name }}</span>
              <span class="result-code">{{ item.petUuid || '暂无宠物码' }}</span>
            </div>
            <div class="result-sub">
              {{ item.species || '宠物' }}<span v-if="item.breed"> · {{ item.breed }}</span>
              <span v-if="item.ownerName"> · 主人 {{ item.ownerName }}</span>
            </div>
          </div>
        </div>
        <p v-else-if="searched && !searching" class="search-empty">未找到匹配的宠物，请检查名称或宠物码</p>
      </div>

      <!-- 1-2. 选定宠物后的历史病历（全平台跨院） -->
      <div v-if="selectedPet" class="history-block">
        <div class="history-header">
          <span class="history-title">历史病历</span>
          <button class="link-btn" type="button" :disabled="historyLoading" @click="loadHistory">
            {{ historyLoading ? '加载中...' : '刷新' }}
          </button>
        </div>

        <p v-if="!selectedPet.petUuid" class="history-state">该宠物暂无宠物码，无法调阅历史病历</p>
        <p v-else-if="historyLoading" class="history-state">正在调阅该宠物的历史病历...</p>
        <div v-else-if="historyError" class="history-state history-error">
          <p class="history-error-text">{{ historyError }}</p>
          <button class="link-btn" type="button" @click="loadHistory">重试</button>
        </div>
        <p v-else-if="history && history.total === 0" class="history-state">
          该宠物暂无历史病历，本次为首诊记录
        </p>
        <div v-else-if="history" class="history-list">
          <div class="history-summary">
            共 {{ history.total }} 条记录 · {{ history.hospitalCount }} 家医院
          </div>
          <div v-for="record in history.records" :key="record.id" class="history-item">
            <div class="history-item-top">
              <span class="history-time">{{ record.createTime }}</span>
              <span class="history-hospital">{{ record.hospitalName }}</span>
              <span class="history-doctor">{{ record.doctorName || '未记录医生' }}</span>
            </div>
            <p class="history-line"><span class="history-label">诊断</span>{{ record.diagnosis || '未填写' }}</p>
            <p class="history-line"><span class="history-label">治疗</span>{{ record.treatment || '未填写' }}</p>
          </div>
        </div>
      </div>

      <!-- 2. 诊断 -->
      <div class="dialog-field">
        <label class="dialog-label">诊断结果 <span class="required">*</span></label>
        <textarea
          v-model="diagnosis"
          class="pm-textarea"
          rows="2"
          maxlength="200"
          placeholder="如：急性胃肠炎、左前肢骨折"
        ></textarea>
      </div>

      <!-- 3. 治疗方案 -->
      <div class="dialog-field">
        <label class="dialog-label">治疗方案 <span class="required">*</span></label>
        <textarea
          v-model="treatment"
          class="pm-textarea"
          rows="3"
          maxlength="500"
          placeholder="如：禁食 12 小时，补液 3 天，口服益生菌"
        ></textarea>
      </div>

      <!-- 4. 就诊时间 -->
      <div class="dialog-field">
        <label class="dialog-label">就诊时间</label>
        <input v-model="createTime" type="datetime-local" class="pm-input" />
        <p class="field-tip">不填写时后端默认使用当前时间</p>
      </div>

      <p v-if="successMessage" class="dialog-success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="dialog-error">{{ errorMessage }}</p>
      </div>

      <div class="pm-modal-actions">
        <button class="pm-btn pm-btn-outline" :disabled="submitting" @click="close">关闭</button>
        <button class="pm-btn" :disabled="submitting || !canSubmit" @click="handleSubmit">
          {{ submitting ? '提交中...' : '提交病历' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { createMedicalRecord, fetchPetMedicalRecords, searchPets } from '@/api/medicalRecord'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'success'])

const keyword = ref('')
const searching = ref(false)
const searched = ref(false)
const searchResults = ref([])
const selectedPet = ref(null)

// 选定宠物后的历史病历（跨院）
const history = ref(null)
const historyLoading = ref(false)
const historyError = ref('')

const diagnosis = ref('')
const treatment = ref('')
const createTime = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const canSubmit = computed(() => {
  return !!selectedPet.value && !!diagnosis.value.trim() && !!treatment.value.trim()
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowForInput() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function reset() {
  keyword.value = ''
  searching.value = false
  searched.value = false
  searchResults.value = []
  selectedPet.value = null
  history.value = null
  historyLoading.value = false
  historyError.value = ''
  diagnosis.value = ''
  treatment.value = ''
  createTime.value = nowForInput()
  submitting.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

// 每次打开弹窗都重置，避免把上一次的宠物/病历带进来
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) reset()
  }
)

async function handleSearch() {
  const value = keyword.value.trim()
  if (!value) {
    errorMessage.value = '请输入宠物名或宠物码'
    return
  }
  searching.value = true
  errorMessage.value = ''
  try {
    searchResults.value = await searchPets(value)
  } catch (error) {
    searchResults.value = []
    errorMessage.value = error.message || '搜索失败'
  } finally {
    searching.value = false
    searched.value = true
  }
}

function selectPet(pet) {
  selectedPet.value = pet
  searchResults.value = []
  successMessage.value = ''
  loadHistory()
}

function clearSelected() {
  selectedPet.value = null
  searchResults.value = []
  searched.value = false
  history.value = null
  historyError.value = ''
  successMessage.value = ''
}

// 区分权限问题与网络问题，避免只提示“加载失败”
function describeHistoryError(error) {
  const status = error && error.status
  if (status === 401) return '商家登录状态已失效，请重新登录商家账号后查看（权限问题）'
  if (status === 403) return '当前账号无权调阅该宠物病历，请确认使用的是商家账号（权限问题）'
  if (status === 404) return '未找到该宠物，宠物码可能已失效'
  if (!status) return `网络异常，无法连接后端服务：${(error && error.message) || '请检查网络后重试'}（网络问题）`
  return `加载失败（HTTP ${status}）：${(error && error.message) || '请稍后重试'}`
}

async function loadHistory() {
  if (!selectedPet.value || !selectedPet.value.petUuid) return
  historyLoading.value = true
  historyError.value = ''
  try {
    history.value = await fetchPetMedicalRecords(selectedPet.value.petUuid, true)
  } catch (error) {
    history.value = null
    historyError.value = describeHistoryError(error)
  } finally {
    historyLoading.value = false
  }
}

function close() {
  if (submitting.value) return
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const data = await createMedicalRecord({
      petUuid: selectedPet.value.petUuid,
      diagnosis: diagnosis.value.trim(),
      treatment: treatment.value.trim(),
      createTime: createTime.value || null
    })
    // 提交后保留弹窗并刷新历史列表，便于确认是否已写入、是否重复开
    successMessage.value = data && data.duplicated
      ? '同一份病历已存在，本次未重复写入'
      : '病历提交成功，下方列表已刷新'
    diagnosis.value = ''
    treatment.value = ''
    createTime.value = nowForInput()
    emit('success', data)
    await loadHistory()
  } catch (error) {
    errorMessage.value = error.message || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.record-dialog {
  width: 440px;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px 20px 16px;
}

.record-dialog .pm-modal-title {
  flex-shrink: 0;
  margin-bottom: 12px;
}

/* 内容区独立滚动，提交按钮固定在弹窗底部，不会被长列表顶出屏幕 */
.dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.record-dialog .pm-modal-actions {
  flex-shrink: 0;
  margin-top: 12px;
}

.dialog-field {
  margin-bottom: 14px;
}

.dialog-label {
  display: block;
  font-size: 13px;
  color: var(--pm-text-main);
  margin-bottom: 6px;
}

.required {
  color: #e0567d;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-row .pm-input {
  flex: 1;
}

.selected-pet {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: var(--pm-radius-sm);
  background: #fff5f9;
  border: 1px solid var(--pm-border-input);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
}

.selected-pet-name {
  font-weight: 600;
  color: var(--pm-text-main);
}

.selected-pet-code {
  margin-left: 6px;
  font-size: 12px;
  color: var(--pm-primary);
}

.selected-pet-owner {
  color: var(--pm-text-sub);
}

.link-btn {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--pm-primary);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.search-results {
  margin-top: 8px;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--pm-border-input);
  border-radius: var(--pm-radius-sm);
}

.search-result-item {
  padding: 9px 12px;
  cursor: pointer;
  border-bottom: 1px solid #fdf1f6;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #fff5f9;
}

.result-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--pm-text-main);
}

.result-name {
  font-weight: 600;
}

.result-code {
  font-size: 12px;
  color: var(--pm-primary);
}

.result-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--pm-text-sub);
}

.search-empty {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--pm-text-sub);
}

.field-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pm-text-sub);
}

.dialog-error {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: var(--pm-radius-sm);
  background: #fff0f4;
  color: #d64570;
  font-size: 13px;
}

.dialog-success {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: var(--pm-radius-sm);
  background: #f0fbf4;
  color: #2e8b57;
  font-size: 13px;
}

/* ===== 历史病历 ===== */
.history-block {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: var(--pm-radius-sm);
  background: #fffafc;
  border: 1px solid #fdeaf2;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.history-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--pm-text-main);
}

.history-state {
  margin: 4px 0;
  font-size: 12px;
  color: var(--pm-text-sub);
  text-align: center;
  padding: 8px 0;
}

.history-error {
  background: #fff0f4;
  border-radius: var(--pm-radius-sm);
  color: #d64570;
  text-align: left;
  padding: 8px 10px;
}

.history-error-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-summary {
  font-size: 12px;
  color: var(--pm-text-sub);
  margin-bottom: 6px;
}

.history-item {
  padding: 8px 10px;
  margin-bottom: 6px;
  background: #fff;
  border: 1px solid #fdeaf2;
  border-radius: var(--pm-radius-sm);
}

.history-item:last-child {
  margin-bottom: 0;
}

.history-item-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--pm-text-sub);
}

.history-time {
  color: var(--pm-text-sub);
}

.history-hospital {
  font-weight: 600;
  color: var(--pm-primary);
}

.history-doctor {
  color: var(--pm-primary-dark, #b85a85);
}

.history-line {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pm-text-main);
  word-break: break-word;
}

.history-label {
  display: inline-block;
  min-width: 30px;
  margin-right: 6px;
  color: var(--pm-text-sub);
}

@media (max-width: 480px) {
  .record-dialog {
    max-height: 92vh;
    padding: 16px 14px 12px;
  }

  .history-list {
    max-height: 160px;
  }
}
</style>
