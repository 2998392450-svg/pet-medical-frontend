<template>
  <teleport to="body">
    <transition name="drawer-fade">
      <div v-if="modelValue" class="drawer-mask" @click.self="close">
        <aside class="drawer" role="dialog" aria-label="宠物病历档案">
          <header class="drawer-head">
            <div class="drawer-title-wrap">
              <h3 class="drawer-title">{{ pet.name || '宠物' }}</h3>
              <p class="drawer-code">宠物码：{{ pet.petUuid || '暂无宠物码' }}</p>
            </div>
            <button class="drawer-close" type="button" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="drawer-body">
            <p v-if="!pet.petUuid" class="state state-warn">该宠物暂无宠物码，无法调阅病历档案</p>

            <template v-else>
              <div v-if="loading" class="state">正在调阅病历档案...</div>

              <div v-else-if="error" class="state state-error">
                <p class="state-text">{{ error }}</p>
                <button class="retry-btn" type="button" @click="load">重试</button>
              </div>

              <p v-else-if="data && data.total === 0" class="state">该宠物暂无就诊记录</p>

              <template v-else-if="data">
                <div class="summary">
                  共 {{ data.total }} 条记录 · {{ data.hospitalCount }} 家医院
                </div>
                <ul class="record-list">
                  <li
                    v-for="record in data.records"
                    :key="record.id"
                    class="record-item"
                    :style="{ borderLeftColor: hospitalColor(record.hospitalId) }"
                  >
                    <div class="record-top">
                      <span class="record-time">{{ record.createTime }}</span>
                      <span class="record-hospital">{{ record.hospitalName }}</span>
                    </div>
                    <div class="record-doctor">
                      {{ record.doctorName || '未记录医生' }}
                      <span v-if="record.doctorTitle" class="doctor-title">{{ record.doctorTitle }}</span>
                    </div>
                    <p class="record-line"><span class="line-label">诊断</span>{{ record.diagnosis || '未填写' }}</p>
                    <p class="record-line"><span class="line-label">治疗</span>{{ record.treatment || '未填写' }}</p>
                  </li>
                </ul>
              </template>
            </template>
          </div>
        </aside>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { fetchPetMedicalRecords } from '@/api/medicalRecord'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  pet: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const error = ref('')
const data = ref(null)

// 同一家医院给同一个淡色，仅作轻微区分，不分组不折叠
const HOSPITAL_COLORS = ['#f4a7c3', '#a8c8f0', '#b7e0c8', '#e8c9a0', '#c9b6e8', '#f0b7a8']
function hospitalColor(hospitalId) {
  const id = Number(hospitalId)
  if (!Number.isFinite(id)) return HOSPITAL_COLORS[0]
  return HOSPITAL_COLORS[Math.abs(id) % HOSPITAL_COLORS.length]
}

function describeError(err) {
  const status = err && err.status
  if (status === 401) return '商家登录状态已失效，请重新登录商家账号后查看（权限问题）'
  if (status === 403) return '当前账号无权调阅该宠物病历，请确认使用商家账号登录（权限问题）'
  if (status === 404) return '未找到该宠物，宠物码可能已失效'
  if (!status) return `网络异常，无法连接后端服务：${(err && err.message) || '请检查网络后重试'}（网络问题）`
  return `加载失败（HTTP ${status}）：${(err && err.message) || '请稍后重试'}`
}

async function load() {
  if (!props.pet || !props.pet.petUuid) return
  loading.value = true
  error.value = ''
  data.value = null
  try {
    data.value = await fetchPetMedicalRecords(props.pet.petUuid, true)
  } catch (err) {
    error.value = describeError(err)
  } finally {
    loading.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      load()
    } else {
      loading.value = false
      error.value = ''
      data.value = null
    }
  }
)
</script>

<style scoped>
.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(60, 40, 55, 0.35);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: 420px;
  max-width: 92vw;
  height: 100%;
  background: #fffafc;
  box-shadow: -8px 0 24px rgba(180, 120, 150, 0.18);
  display: flex;
  flex-direction: column;
}

.drawer-head {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  background: linear-gradient(135deg, #ffe3ef 0%, #fff5f9 100%);
  border-bottom: 1px solid #fde3ee;
}

.drawer-title {
  margin: 0;
  font-size: 18px;
  color: var(--pm-text-main);
}

.drawer-code {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pm-primary);
  word-break: break-all;
}

.drawer-close {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: var(--pm-text-sub);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(200, 150, 175, 0.2);
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 24px;
}

.summary {
  font-size: 12px;
  color: var(--pm-text-sub);
  margin-bottom: 10px;
}

.state {
  margin: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--pm-text-sub);
}

.state-warn {
  color: #c98a2e;
}

.state-error {
  background: #fff0f4;
  border-radius: var(--pm-radius-sm);
  padding: 12px;
  color: #d64570;
}

.state-text {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.5;
}

.retry-btn {
  border: 1px solid #f2b8cd;
  background: #fff;
  color: #d64570;
  border-radius: var(--pm-radius-sm);
  padding: 4px 14px;
  font-size: 12px;
  cursor: pointer;
}

.record-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.record-item {
  background: #fff;
  border: 1px solid #fdeaf2;
  border-left: 3px solid #f4a7c3;
  border-radius: var(--pm-radius-sm);
  padding: 10px 12px;
  margin-bottom: 10px;
}

.record-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.record-time {
  font-size: 12px;
  color: var(--pm-text-sub);
}

.record-hospital {
  font-size: 13px;
  font-weight: 600;
  color: var(--pm-primary);
}

.record-doctor {
  margin-top: 4px;
  font-size: 12px;
  color: var(--pm-text-main);
}

.doctor-title {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 8px;
  background: #fdeaf2;
  color: #b85a85;
  font-size: 11px;
}

.record-line {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--pm-text-main);
  word-break: break-word;
}

.line-label {
  display: inline-block;
  min-width: 30px;
  margin-right: 6px;
  color: var(--pm-text-sub);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-active .drawer,
.drawer-fade-leave-active .drawer {
  transition: transform 0.22s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-from .drawer,
.drawer-fade-leave-to .drawer {
  transform: translateX(100%);
}

@media (max-width: 480px) {
  .drawer {
    max-width: 100vw;
    width: 100vw;
  }
}
</style>
