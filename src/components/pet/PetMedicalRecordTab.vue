<template>
  <div class="pet-records">
    <div class="records-header">
      <div>
        <h3 class="records-title">就诊记录</h3>
        <p class="records-sub" v-if="pet && pet.petUuid">宠物码：{{ pet.petUuid }}</p>
      </div>
      <button class="refresh-btn" :disabled="loading || !petUuid" @click="loadRecords">刷新</button>
    </div>

    <!-- 无宠物码（离线数据或旧数据） -->
    <div v-if="!petUuid" class="state-box">
      <span class="state-icon">📄</span>
      <p class="state-text">该宠物暂未生成宠物码，无法调阅就诊记录</p>
      <p class="state-sub">联机后重新保存宠物信息即可生成</p>
    </div>

    <!-- 加载态 -->
    <div v-else-if="loading" class="state-box">
      <p class="state-text">正在加载就诊记录...</p>
    </div>

    <!-- 无权限 -->
    <div v-else-if="forbidden" class="state-box forbidden-box">
      <span class="state-icon">🔒</span>
      <p class="state-text">你还不是该宠物的主人，无法查看就诊记录</p>
      <p class="state-sub">如确认信息有误，请联系宠物医院核实</p>
    </div>

    <!-- 其他错误 -->
    <div v-else-if="errorMessage" class="state-box error-box">
      <span class="state-icon">⚠️</span>
      <p class="state-text">{{ errorMessage }}</p>
      <button class="retry-btn" @click="loadRecords">重新加载</button>
    </div>

    <!-- 空态 -->
    <div v-else-if="result && result.total === 0" class="state-box">
      <span class="state-icon">📭</span>
      <p class="state-text">暂无就诊记录</p>
      <p class="state-sub">在本平台医院就诊后，记录会自动同步到这里</p>
    </div>

    <!-- 时间线 -->
    <div v-else-if="result" class="timeline-wrap">
      <div class="summary-row">
        <span>共 {{ result.total }} 次就诊</span>
        <span>·</span>
        <span>{{ result.hospitalCount }} 家医院</span>
      </div>
      <el-timeline>
        <el-timeline-item
          v-for="(record, index) in result.records"
          :key="record.id"
          :timestamp="record.createTime"
          placement="top"
          :color="index === 0 ? '#d6709f' : '#ffb3c8'"
          :hollow="index !== 0"
        >
          <div class="record-card">
            <div class="record-top">
              <span class="hospital-name">{{ record.hospitalName }}</span>
              <span class="doctor-name">
                {{ record.doctorName ? `${record.doctorName}${record.doctorTitle ? ' · ' + record.doctorTitle : ''}` : '未记录医生' }}
              </span>
            </div>
            <div class="record-row">
              <span class="row-label">诊断</span>
              <span class="row-value">{{ record.diagnosis || '未填写' }}</span>
            </div>
            <div class="record-row">
              <span class="row-label">治疗方案</span>
              <span class="row-value">{{ record.treatment || '未填写' }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { fetchPetMedicalRecords } from '@/api/medicalRecord'

const props = defineProps({
  pet: { type: Object, default: null }
})

const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')
const forbidden = ref(false)

const petUuid = computed(() => {
  return props.pet && props.pet.petUuid ? String(props.pet.petUuid) : ''
})

async function loadRecords() {
  if (!petUuid.value) return
  loading.value = true
  forbidden.value = false
  errorMessage.value = ''
  result.value = null
  try {
    result.value = await fetchPetMedicalRecords(petUuid.value, false)
  } catch (error) {
    if (error.status === 403) {
      forbidden.value = true
    } else if (error.status === 401) {
      errorMessage.value = '登录状态已失效，请重新登录后查看'
    } else if (error.status === 404) {
      errorMessage.value = error.message || '未找到该宠物的就诊记录'
    } else {
      errorMessage.value = error.message || '加载失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => petUuid.value,
  (value) => {
    if (value) loadRecords()
  }
)

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.pet-records {
  background: #fff;
  border-radius: var(--pm-radius-md);
  padding: 16px;
  box-shadow: 0 4px 14px rgba(191, 128, 158, 0.08);
}

.records-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.records-title {
  margin: 0;
  font-size: 15px;
  color: var(--pm-text-main);
}

.records-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pm-primary);
}

.refresh-btn {
  border: none;
  background: #fff5f9;
  color: var(--pm-primary);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.state-box {
  padding: 28px 16px;
  text-align: center;
  border-radius: var(--pm-radius-sm);
  background: #fffafc;
}

.state-icon {
  font-size: 26px;
}

.state-text {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--pm-text-sub);
}

.state-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pm-text-sub);
  opacity: 0.8;
}

.forbidden-box {
  background: #fff8ea;
}

.error-box {
  background: #fff0f4;
}

.error-box .state-text {
  color: #d64570;
}

.retry-btn {
  margin-top: 10px;
  border: none;
  background: none;
  color: var(--pm-primary);
  font-size: 13px;
  cursor: pointer;
}

.summary-row {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 14px;
  border-radius: var(--pm-radius-sm);
  background: #fff5f9;
  font-size: 12px;
  color: var(--pm-text-sub);
}

.record-card {
  padding: 10px 12px;
  background: #fffafc;
  border: 1px solid var(--pm-border-input);
  border-radius: var(--pm-radius-sm);
}

.record-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.hospital-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--pm-text-main);
}

.doctor-name {
  font-size: 12px;
  color: var(--pm-primary-dark, #b85a85);
}

.record-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
}

.row-label {
  flex: 0 0 60px;
  color: var(--pm-text-sub);
}

.row-value {
  color: var(--pm-text-main);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
