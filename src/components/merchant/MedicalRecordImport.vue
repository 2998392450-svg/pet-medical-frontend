<template>
  <div class="import-record">
    <div class="import-header">
      <h3 class="import-title">录入外部病历</h3>
      <p class="import-sub">可直接打字录入，也可从 Excel 粘贴或上传文件；三种方式走同一套导入逻辑</p>
    </div>

    <!-- 入口切换：默认手动录入 -->
    <div class="mode-switch">
      <button
        type="button"
        class="mode-btn"
        :class="{ active: mode === 'manual' }"
        @click="mode = 'manual'"
      >手动录入</button>
      <button
        type="button"
        class="mode-btn"
        :class="{ active: mode === 'file' }"
        @click="mode = 'file'"
      >文件导入</button>
    </div>

    <!-- ==================== 手动录入 ==================== -->
    <div v-if="mode === 'manual'" class="manual-panel">
      <p v-if="hospitalsError" class="state-box error-box">
        <span class="state-text">{{ hospitalsError }}</span>
      </p>

      <div class="manual-rows">
        <div v-for="(row, index) in rows" :key="row.key" class="manual-row">
          <div class="row-head">
            <span class="row-index">第 {{ index + 1 }} 条</span>
            <button
              type="button"
              class="link-btn row-del"
              :disabled="rows.length === 1"
              @click="removeRow(index)"
            >删除该行</button>
          </div>

          <div class="row-grid">
            <label class="field">
              <span class="field-label">宠物码 <em>*</em></span>
              <input
                v-model.trim="row.petUuid"
                type="text"
                placeholder="如 PET-2026-0001"
                @input="clearRowErrors(row)"
              />
            </label>

            <label class="field">
              <span class="field-label">医院 <em>*</em></span>
              <select v-model="row.hospitalId" @change="onHospitalChange(row)">
                <option value="">请选择医院</option>
                <option v-for="h in hospitals" :key="h.id" :value="h.id">{{ h.name }}</option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">医生（可留空）</span>
              <select v-model="row.doctorId" :disabled="!row.hospitalId" @change="clearRowErrors(row)">
                <option value="">不指定医生</option>
                <option v-for="d in doctorsOf(row)" :key="d.id" :value="d.id">
                  {{ d.name }}<template v-if="d.title"> · {{ d.title }}</template>
                </option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">就诊时间</span>
              <input
                v-model="row.createTime"
                type="datetime-local"
                step="60"
                @input="clearRowErrors(row)"
              />
            </label>

            <label class="field field-wide">
              <span class="field-label">诊断</span>
              <input v-model.trim="row.diagnosis" type="text" placeholder="诊断结果" @input="clearRowErrors(row)" />
            </label>

            <label class="field field-wide">
              <span class="field-label">治疗方案</span>
              <input v-model.trim="row.treatment" type="text" placeholder="治疗方案" @input="clearRowErrors(row)" />
            </label>
          </div>

          <p v-if="row.errors.length > 0" class="row-errors">
            <span v-for="(err, i) in row.errors" :key="i">{{ err }}</span>
          </p>
        </div>
      </div>

      <div class="manual-actions">
        <button type="button" class="pm-btn pm-btn-sm pm-btn-outline" @click="addRow">+ 添加一行</button>
        <button type="button" class="pm-btn pm-btn-sm" :disabled="submitting" @click="submitManual">
          {{ submitting ? '提交中...' : '提交录入' }}
        </button>
      </div>

      <!-- 粘贴数据 -->
      <div class="paste-block">
        <div class="paste-head">
          <h4 class="paste-title">从 Excel 粘贴数据</h4>
          <button v-if="pasteText" type="button" class="link-btn" @click="clearPaste">清空</button>
        </div>
        <p class="paste-tip">
          复制 Excel 整块内容粘贴到下面，按制表符分列。列顺序：宠物码、医院名称、医生姓名、诊断、治疗方案、就诊时间；
          若带表头（pet_uuid / hospital_name / doctor_name / diagnosis / treatment / create_time）则按表头识别。
        </p>
        <textarea v-model="pasteText" class="paste-area" rows="4" placeholder="例如：&#10;PET-2026-0001    上海宠颐生动物医院(静安店)    张明华    皮肤炎    外用药膏    2026-11-14 10:30"></textarea>
        <div class="paste-actions">
          <button type="button" class="pm-btn pm-btn-sm pm-btn-outline" @click="parsePaste">解析并填入上方</button>
        </div>
        <ul v-if="pasteErrors.length > 0" class="paste-errors">
          <li v-for="(err, i) in pasteErrors" :key="i">{{ err }}</li>
        </ul>
      </div>
    </div>

    <!-- ==================== 文件导入 ==================== -->
    <div v-else class="file-panel">
      <div class="import-toolbar">
        <el-upload
          ref="uploadRef"
          :auto-upload="true"
          :show-file-list="true"
          :limit="1"
          accept=".xlsx,.xls,.json"
          :http-request="customUpload"
          :on-exceed="handleExceed"
        >
          <button type="button" class="pm-btn pm-btn-sm" :disabled="uploading">
            {{ uploading ? '导入中...' : '选择文件并导入' }}
          </button>
          <template #tip>
            <div class="upload-tip">支持 .xlsx / .xls / .json，单文件不超过 5MB，单次最多 2000 条</div>
          </template>
        </el-upload>
        <button
          type="button"
          class="pm-btn pm-btn-sm pm-btn-outline download-btn"
          :disabled="downloading"
          @click="downloadTemplate"
        >
          {{ downloading ? '下载中...' : '下载模板' }}
        </button>
      </div>
    </div>

    <!-- 错误态 -->
    <div v-if="errorMessage" class="state-box error-box">
      <p class="state-text">{{ errorMessage }}</p>
    </div>

    <!-- 导入/提交结果 -->
    <div v-if="result" class="result-block">
      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-value">{{ result.total }}</span>
          <span class="stat-label">总行数</span>
        </div>
        <div class="stat-item imported">
          <span class="stat-value">{{ result.imported }}</span>
          <span class="stat-label">新增</span>
        </div>
        <div class="stat-item duplicated">
          <span class="stat-value">{{ result.duplicated }}</span>
          <span class="stat-label">重复</span>
        </div>
        <div class="stat-item failed">
          <span class="stat-value">{{ result.failed }}</span>
          <span class="stat-label">失败</span>
        </div>
      </div>

      <div v-if="result.errors && result.errors.length > 0" class="error-list">
        <div class="error-list-title">失败明细（最多展示 20 条）</div>
        <div v-for="item in result.errors" :key="item.row" class="error-item">
          <span class="error-row">第 {{ item.row }} 行</span>
          <span class="error-reason">{{ item.reason }}</span>
        </div>
      </div>

      <button class="link-btn" @click="resetResult">继续录入 / 导入</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import axios from '@/api/axios'
import {
  downloadImportTemplate,
  importMedicalRecords,
  importMedicalRecordsJson
} from '@/api/medicalRecord'

const uploadRef = ref(null)
const uploading = ref(false)
const downloading = ref(false)
const submitting = ref(false)
const result = ref(null)
const errorMessage = ref('')

const mode = ref('manual')

// ==================== 医院 / 医生 ====================
const hospitals = ref([])
const hospitalsError = ref('')
const doctorsByHospital = reactive({})

function doctorsOf(row) {
  return row.hospitalId ? (doctorsByHospital[row.hospitalId] || []) : []
}

async function ensureDoctors(hospitalId) {
  if (!hospitalId || doctorsByHospital[hospitalId]) return
  try {
    const res = await axios.get(`/hospitals/${hospitalId}/doctors`)
    doctorsByHospital[hospitalId] = res.data || []
  } catch (e) {
    doctorsByHospital[hospitalId] = []
  }
}

async function onHospitalChange(row) {
  clearRowErrors(row)
  row.doctorId = ''
  await ensureDoctors(row.hospitalId)
}

onMounted(async () => {
  try {
    const res = await axios.get('/hospitals')
    hospitals.value = res.data || []
  } catch (e) {
    hospitalsError.value = '医院列表加载失败，暂时无法使用下拉选择，请刷新后重试'
  }
})

// ==================== 逐行录入 ====================
let rowSeed = 0
function pad(n) {
  return String(n).padStart(2, '0')
}

function nowForInput() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function createRow(data = {}) {
  rowSeed += 1
  return {
    key: `row-${rowSeed}`,
    petUuid: data.petUuid || '',
    hospitalId: data.hospitalId || '',
    doctorId: data.doctorId || '',
    diagnosis: data.diagnosis || '',
    treatment: data.treatment || '',
    createTime: data.createTime || nowForInput(),
    errors: []
  }
}

const rows = ref([createRow()])

function addRow() {
  rows.value.push(createRow())
}

function removeRow(index) {
  if (rows.value.length === 1) return
  rows.value.splice(index, 1)
}

function clearRowErrors(row) {
  if (row.errors.length > 0) row.errors = []
  errorMessage.value = ''
}

function validateRow(row) {
  const errors = []
  if (!row.petUuid) errors.push('宠物码必填')
  if (!row.hospitalId) errors.push('医院必选')
  if (!row.diagnosis && !row.treatment) errors.push('诊断与治疗方案至少填一项')
  row.errors = errors
  return errors.length === 0
}

function toApiTime(value) {
  if (!value) return ''
  const v = String(value)
  return v.length === 16 ? `${v.replace('T', ' ')}:00` : v.replace('T', ' ')
}

function resetRows() {
  rows.value = [createRow()]
}

async function submitManual() {
  if (submitting.value) return
  errorMessage.value = ''
  result.value = null

  let allValid = true
  rows.value.forEach(row => {
    if (!validateRow(row)) allValid = false
  })
  if (!allValid) return

  submitting.value = true
  try {
    const payload = rows.value.map(row => ({
      pet_uuid: row.petUuid,
      hospital_id: Number(row.hospitalId),
      doctor_id: row.doctorId ? Number(row.doctorId) : null,
      diagnosis: row.diagnosis,
      treatment: row.treatment,
      create_time: toApiTime(row.createTime)
    }))
    const data = await importMedicalRecordsJson(payload)
    result.value = data

    if (data.failed === 0) {
      resetRows()
      clearPaste()
    } else if ((data.errors || []).length >= data.failed) {
      // 仅保留失败行，便于就地修正后再次提交（接口行号 = 数据下标 + 2）
      // 失败明细最多返回 20 条，超过时不裁剪，避免把未列入明细的失败行丢掉
      const failedIndexes = new Set((data.errors || []).map(item => Number(item.row) - 2))
      const kept = rows.value.filter((_, index) => failedIndexes.has(index))
      if (kept.length > 0) rows.value = kept
    }
  } catch (error) {
    errorMessage.value = error.message || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

// ==================== 粘贴解析 ====================
const pasteText = ref('')
const pasteErrors = ref([])

const COLUMN_ALIASES = {
  petUuid: ['pet_uuid', 'petuuid', '宠物唯一码', '宠物编号', '宠物码'],
  hospitalId: ['hospital_id', 'hospitalid', '医院id'],
  hospitalName: ['hospital_name', 'hospitalname', '医院名称', '医院'],
  doctorId: ['doctor_id', 'doctorid', '医生id'],
  doctorName: ['doctor_name', 'doctorname', '医生姓名', '医生'],
  diagnosis: ['diagnosis', '诊断', '诊断结果'],
  treatment: ['treatment', '治疗方案', '治疗'],
  createTime: ['create_time', 'createtime', '时间', '就诊时间']
}

function detectHeader(cells) {
  const map = {}
  cells.forEach((cell, index) => {
    const value = String(cell || '').trim().toLowerCase()
    if (!value) return
    for (const key of Object.keys(COLUMN_ALIASES)) {
      if (COLUMN_ALIASES[key].includes(value)) {
        map[key] = index
        break
      }
    }
  })
  return Object.keys(map).length > 0 ? map : null
}

function parsePasteTime(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  // Excel 序列号（如 46000）
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000)
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }
  const m = /^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s)
  if (!m) return ''
  const [, y, mo, d, h = '0', mi = '0'] = m
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}`
}

function matchHospital(idRaw, nameRaw) {
  const id = Number(idRaw)
  if (String(idRaw || '').trim() && Number.isFinite(id)) {
    const byId = hospitals.value.find(h => Number(h.id) === id)
    if (byId) return byId
  }
  const name = String(nameRaw || '').trim()
  if (!name) return null
  return hospitals.value.find(h => h.name === name)
    || hospitals.value.find(h => h.name.includes(name) || name.includes(h.name))
    || null
}

async function matchDoctor(hospitalId, idRaw, nameRaw) {
  if (!hospitalId) return null
  await ensureDoctors(hospitalId)
  const list = doctorsByHospital[hospitalId] || []
  const id = Number(idRaw)
  if (String(idRaw || '').trim() && Number.isFinite(id)) {
    const byId = list.find(d => Number(d.id) === id)
    if (byId) return byId
  }
  const name = String(nameRaw || '').trim()
  if (!name) return null
  return list.find(d => d.name === name) || null
}

function clearPaste() {
  pasteText.value = ''
  pasteErrors.value = []
}

async function parsePaste() {
  pasteErrors.value = []
  const text = String(pasteText.value || '').replace(/\r\n/g, '\n').trim()
  if (!text) {
    pasteErrors.value = ['粘贴内容为空']
    return
  }

  const lines = text.split('\n').filter(line => line.trim() !== '')
  const firstCells = lines[0].split('\t')
  const headerMap = detectHeader(firstCells)
  const startIndex = headerMap ? 1 : 0

  if (lines.length === startIndex) {
    pasteErrors.value = ['只有表头，没有数据行']
    return
  }

  const parsed = []
  const issues = []

  for (let i = startIndex; i < lines.length; i += 1) {
    const cells = lines[i].split('\t')
    let data
    if (headerMap) {
      const get = key => (headerMap[key] === undefined ? '' : String(cells[headerMap[key]] ?? '').trim())
      data = {
        petUuid: get('petUuid'),
        hospitalId: get('hospitalId'),
        hospitalName: get('hospitalName'),
        doctorId: get('doctorId'),
        doctorName: get('doctorName'),
        diagnosis: get('diagnosis'),
        treatment: get('treatment'),
        createTime: get('createTime')
      }
    } else if (cells.length >= 8) {
      // 模板列顺序：pet_uuid, hospital_id, hospital_name, doctor_id, doctor_name, diagnosis, treatment, create_time
      data = {
        petUuid: String(cells[0] || '').trim(),
        hospitalId: String(cells[1] || '').trim(),
        hospitalName: String(cells[2] || '').trim(),
        doctorId: String(cells[3] || '').trim(),
        doctorName: String(cells[4] || '').trim(),
        diagnosis: String(cells[5] || '').trim(),
        treatment: String(cells[6] || '').trim(),
        createTime: String(cells[7] || '').trim()
      }
    } else if (cells.length >= 6) {
      // 常用 6 列：宠物码、医院名称、医生姓名、诊断、治疗方案、就诊时间
      data = {
        petUuid: String(cells[0] || '').trim(),
        hospitalId: '',
        hospitalName: String(cells[1] || '').trim(),
        doctorId: '',
        doctorName: String(cells[2] || '').trim(),
        diagnosis: String(cells[3] || '').trim(),
        treatment: String(cells[4] || '').trim(),
        createTime: String(cells[5] || '').trim()
      }
    } else {
      issues.push(`第 ${i + 1} 行：列数不足（至少 6 列，用制表符分隔）`)
      continue
    }

    const hospital = matchHospital(data.hospitalId, data.hospitalName)
    const doctor = hospital ? await matchDoctor(hospital.id, data.doctorId, data.doctorName) : null
    const row = createRow({
      petUuid: data.petUuid,
      hospitalId: hospital ? hospital.id : '',
      doctorId: doctor ? doctor.id : '',
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      createTime: parsePasteTime(data.createTime) || nowForInput()
    })

    const errors = []
    if (!row.petUuid) errors.push('缺少宠物码')
    if (!row.hospitalId) {
      errors.push(`医院「${data.hospitalName || data.hospitalId || '空'}」未匹配到平台医院`)
    }
    if (!row.diagnosis && !row.treatment) errors.push('诊断与治疗方案至少填一项')
    row.errors = errors
    if (errors.length > 0) {
      issues.push(`第 ${i + 1} 行：${errors.join('；')}`)
    }
    parsed.push(row)
  }

  if (parsed.length === 0) {
    pasteErrors.value = issues.length > 0 ? issues : ['未识别到有效数据行']
    return
  }

  rows.value = parsed
  pasteErrors.value = issues
  if (issues.length === 0) {
    pasteText.value = ''
  }
}

// ==================== 文件导入 ====================
async function customUpload(options) {
  const { file, onSuccess, onError } = options
  uploading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const data = await importMedicalRecords(file)
    result.value = data
    onSuccess(data)
  } catch (error) {
    errorMessage.value = error.message || '导入失败，请检查文件格式后重试'
    onError(error)
  } finally {
    uploading.value = false
  }
}

async function downloadTemplate() {
  if (downloading.value) return
  downloading.value = true
  errorMessage.value = ''
  try {
    const blob = await downloadImportTemplate()
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('模板内容为空')
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '病历导入模板.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    if (error && (error.status === 401 || error.status === 403)) {
      errorMessage.value = '下载模板失败：商家登录状态失效或无权限，请重新登录后再试'
    } else if (error && error.status) {
      errorMessage.value = `下载模板失败（HTTP ${error.status}），请稍后重试`
    } else {
      errorMessage.value = `下载模板失败：${(error && error.message) || '网络异常，请确认后端服务可用'}`
    }
  } finally {
    downloading.value = false
  }
}

function handleExceed() {
  errorMessage.value = '一次只能导入一个文件，请先点击「继续录入 / 导入」再选择'
}

function resetResult() {
  result.value = null
  errorMessage.value = ''
  if (uploadRef.value) uploadRef.value.clearFiles()
}
</script>

<style scoped>
.import-record {
  background: #fff;
  border-radius: var(--pm-radius-md);
  padding: 16px;
  box-shadow: 0 4px 14px rgba(191, 128, 158, 0.08);
}

.import-header {
  margin-bottom: 12px;
}

.import-title {
  margin: 0;
  font-size: 16px;
  color: var(--pm-text-main);
}

.import-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--pm-text-sub);
}

/* 分段控件 */
.mode-switch {
  display: inline-flex;
  padding: 3px;
  margin-bottom: 14px;
  border-radius: 999px;
  background: #fff5f9;
  border: 1px solid #fde3ee;
}

.mode-btn {
  border: none;
  background: transparent;
  color: var(--pm-text-sub);
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 999px;
  cursor: pointer;
}

.mode-btn.active {
  background: var(--pm-primary);
  color: #fff;
  box-shadow: 0 2px 6px rgba(214, 112, 159, 0.25);
}

/* 逐行录入 */
.manual-row {
  border: 1px solid #fdeaf2;
  border-radius: var(--pm-radius-sm);
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #fffafc;
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.row-index {
  font-size: 12px;
  color: var(--pm-text-sub);
}

.row-del {
  margin: 0;
  font-size: 12px;
  color: #d64570;
}

.row-del[disabled] {
  color: #d8c8d0;
  cursor: not-allowed;
}

.row-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.field-wide {
  grid-column: span 2;
}

.field-label {
  font-size: 12px;
  color: var(--pm-text-sub);
}

.field-label em {
  color: #d64570;
  font-style: normal;
}

.field input,
.field select {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 1px solid #f0dbe5;
  border-radius: 8px;
  font-size: 13px;
  color: var(--pm-text-main);
  background: #fff;
  outline: none;
}

.field input:focus,
.field select:focus {
  border-color: var(--pm-primary);
}

.field select:disabled {
  background: #faf4f7;
  color: #b9a9b2;
}

.row-errors {
  margin: 8px 0 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff0f4;
  color: #d64570;
  font-size: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.row-errors span::before {
  content: '· ';
}

.manual-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 4px 0 16px;
}

/* 粘贴区 */
.paste-block {
  border-top: 1px dashed #f3dde7;
  padding-top: 12px;
}

.paste-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paste-title {
  margin: 0;
  font-size: 14px;
  color: var(--pm-text-main);
}

.paste-tip {
  margin: 6px 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pm-text-sub);
}

.paste-area {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #f0dbe5;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pm-text-main);
  resize: vertical;
  outline: none;
}

.paste-area:focus {
  border-color: var(--pm-primary);
}

.paste-actions {
  margin-top: 8px;
}

.paste-errors {
  margin: 10px 0 0;
  padding: 8px 10px 8px 24px;
  border-radius: 6px;
  background: #fff5f9;
  color: #b85a85;
  font-size: 12px;
  line-height: 1.6;
}

/* 文件导入 */
.import-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}

.download-btn {
  margin-top: 2px;
}

.upload-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--pm-text-sub);
}

/* 状态与结果 */
.state-box {
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: var(--pm-radius-sm);
  background: #fffafc;
}

.error-box {
  background: #fff0f4;
}

.state-text {
  margin: 0;
  font-size: 13px;
  color: #d64570;
}

.result-block {
  margin-top: 14px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  border-radius: var(--pm-radius-sm);
  background: #fff5f9;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--pm-text-main);
}

.stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--pm-text-sub);
}

.stat-item.imported .stat-value {
  color: #3f9d6b;
}

.stat-item.duplicated .stat-value {
  color: #b98a2f;
}

.stat-item.failed .stat-value {
  color: #d64570;
}

.error-list {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--pm-radius-sm);
  background: #fff5f9;
}

.error-list-title {
  font-size: 13px;
  color: var(--pm-text-main);
  margin-bottom: 6px;
}

.error-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px dashed #ffe1ec;
}

.error-item:last-child {
  border-bottom: none;
}

.error-row {
  flex: 0 0 auto;
  color: #d64570;
}

.error-reason {
  color: var(--pm-text-sub);
  word-break: break-word;
}

.link-btn {
  margin-top: 12px;
  border: none;
  background: none;
  color: var(--pm-primary);
  font-size: 13px;
  cursor: pointer;
}

.link-btn[disabled] {
  color: #d8c8d0;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .row-grid {
    grid-template-columns: 1fr;
  }

  .field-wide {
    grid-column: span 1;
  }

  .result-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .mode-switch {
    display: flex;
  }

  .mode-btn {
    flex: 1;
  }
}
</style>
