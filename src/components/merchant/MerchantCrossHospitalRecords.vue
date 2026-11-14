<template>
  <div class="cross-record">
    <div class="cross-header">
      <h3 class="cross-title">跨院病历调阅</h3>
      <p class="cross-sub">输入宠物唯一码，可查看该宠物在全平台所有医院的就诊记录</p>
    </div>

    <div class="search-row">
      <input
        v-model="petUuid"
        type="text"
        class="pm-input"
        placeholder="请输入宠物码，如 PET-2026-0001"
        @keyup.enter="handleQuery"
      />
      <button class="pm-btn pm-btn-sm" :disabled="loading" @click="handleQuery">
        {{ loading ? '查询中...' : '查询' }}
      </button>
    </div>

    <!-- 错误态 -->
    <div v-if="errorMessage" class="state-box error-box">
      <span class="state-icon">⚠️</span>
      <p class="state-text">{{ errorMessage }}</p>
      <button v-if="errorStatus === 403" class="link-btn" @click="handleQuery">重新查询</button>
    </div>

    <!-- 加载态 -->
    <div v-else-if="loading" class="state-box">
      <p class="state-text">正在调阅该宠物的就诊记录...</p>
    </div>

    <!-- 空态 -->
    <div v-else-if="result && result.total === 0" class="state-box">
      <span class="state-icon">📭</span>
      <p class="state-text">该宠物暂无就诊记录</p>
    </div>

    <!-- 时间线 -->
    <div v-else-if="result" class="timeline-wrap">
      <div class="pet-summary">
        <span class="summary-name">{{ result.pet?.name || '未知宠物' }}</span>
        <span class="summary-code">{{ result.pet?.petUuid || petUuid }}</span>
        <span class="summary-count">共 {{ result.total }} 条记录 · {{ result.hospitalCount }} 家医院</span>
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

    <!-- 初始态 -->
    <div v-else class="state-box">
      <span class="state-icon">🔍</span>
      <p class="state-text">输入宠物码后点击查询</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { fetchPetMedicalRecords } from '@/api/medicalRecord'

const petUuid = ref('')
const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')
const errorStatus = ref(0)

async function handleQuery() {
  const value = petUuid.value.trim()
  if (!value) {
    errorMessage.value = '请输入宠物码'
    errorStatus.value = 0
    result.value = null
    return
  }
  loading.value = true
  errorMessage.value = ''
  errorStatus.value = 0
  try {
    result.value = await fetchPetMedicalRecords(value, true)
  } catch (error) {
    result.value = null
    errorStatus.value = error.status || 0
    if (error.status === 401) {
      errorMessage.value = '登录状态已失效，请重新登录商家账号'
    } else if (error.status === 403) {
      errorMessage.value = '当前账号无权调阅跨院病历，请确认使用的是商家账号'
    } else if (error.status === 404) {
      errorMessage.value = error.message || '宠物码不存在，请核对后重试'
    } else {
      errorMessage.value = error.message || '查询失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cross-record {
  background: #fff;
  border-radius: var(--pm-radius-md);
  padding: 16px;
  box-shadow: 0 4px 14px rgba(191, 128, 158, 0.08);
}

.cross-header {
  margin-bottom: 12px;
}

.cross-title {
  margin: 0;
  font-size: 16px;
  color: var(--pm-text-main);
}

.cross-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pm-text-sub);
}

.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.search-row .pm-input {
  flex: 1;
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

.error-box {
  background: #fff0f4;
}

.error-box .state-text {
  color: #d64570;
}

.link-btn {
  margin-top: 8px;
  border: none;
  background: none;
  color: var(--pm-primary);
  font-size: 13px;
  cursor: pointer;
}

.pet-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: #fff5f9;
  border-radius: var(--pm-radius-sm);
  font-size: 13px;
}

.summary-name {
  font-weight: 600;
  color: var(--pm-text-main);
}

.summary-code {
  color: var(--pm-primary);
  font-size: 12px;
}

.summary-count {
  margin-left: auto;
  color: var(--pm-text-sub);
  font-size: 12px;
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
