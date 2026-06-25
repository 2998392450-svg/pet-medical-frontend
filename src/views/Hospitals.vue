<template>
  <div class="hospitals-container">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">附近医院（上海）</span>
      </div>
      <div class="nav-right">
        <button class="locate-btn" @click="locateMe" :disabled="locating">
          {{ locating ? '定位中...' : '📍 定位' }}
        </button>
      </div>
    </nav>

    <!-- 地图区域 -->
    <div class="map-section">
      <div id="hospitalMap" class="map-container"></div>
      <div v-if="mapLoading" class="map-loading">地图加载中...</div>
      <div v-if="mapError" class="map-error">
        <span>{{ mapError }}</span>
        <button @click="initMap">重试</button>
      </div>
    </div>

    <!-- 搜索筛选排序卡片（三行布局） -->
    <div class="search-filter-card">
      <!-- 第一行：搜索 -->
      <div class="search-row">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索医院名称"
            class="search-input"
            @keyup.enter="searchHospitals"
          />
        </div>
        <button class="search-btn" @click="searchHospitals">搜索</button>
      </div>

      <!-- 第二行：筛选标签（多选，小饼干样式） -->
      <div class="filter-row">
        <div class="row-label">筛选</div>
        <div class="chip-row">
          <span
            v-for="opt in filterOptions"
            :key="opt.key"
            :class="['cookie-chip', { active: filters.conditions.includes(opt.key) }]"
            @click="toggleCondition(opt.key)"
          >
            <span class="chip-emoji">{{ opt.icon }}</span>
            <span>{{ opt.label }}</span>
          </span>
        </div>
      </div>

      <!-- 第三行：排序下拉 + 清除按钮 -->
      <div class="sort-row">
        <div class="row-label">排序</div>
        <select v-model="filters.sortBy" class="sort-select" @change="onSortChange">
          <option value="">默认顺序</option>
          <option value="distance">📍 距离优先</option>
          <option value="rating">⭐ 好评优先</option>
          <option value="night">🌙 夜间服务优先</option>
          <option value="exotic">🦎 异宠服务优先</option>
        </select>
        <button
          v-if="filters.conditions.length > 0 || filters.sortBy"
          class="clear-all-btn"
          @click="clearAllFilters"
        >
          ✨ 清除
        </button>
      </div>
    </div>

    <!-- 医院列表 -->
    <div class="hospital-list">
      <div
        v-for="hospital in filteredHospitals"
        :key="hospital.id"
        class="hospital-card"
        @click="goToDetail(hospital)"
      >
        <div class="hospital-header">
          <div class="hospital-logo">🏥</div>
          <div class="hospital-info">
            <h3>{{ hospital.name }}</h3>
            <div class="hospital-rating">⭐ {{ hospital.rating }}</div>
          </div>
          <div v-if="hospital.distance != null" class="hospital-distance">
            {{ hospital.distance }}km
          </div>
        </div>
        <p class="hospital-address">{{ hospital.address }}</p>
        <div class="hospital-tags">
          <span v-if="hospital.nightService" class="tag night">夜间服务</span>
          <span v-if="hospital.exoticAccept" class="tag exotic">接诊异宠</span>
          <span v-if="hospital.emergencySupport" class="tag emergency">急诊</span>
          <span v-if="hospital.isReal" class="tag real">真实商户</span>
        </div>
        <div class="hospital-footer">
          <span class="business-hours">{{ hospital.businessHours }}</span>
        </div>
      </div>

      <div v-if="filteredHospitals.length === 0" class="empty-list">
        <div class="empty-icon">🏥</div>
        <p>暂无符合条件的医院</p>
      </div>
    </div>

    <div class="bottom-nav">
      <div class="nav-item" @click="goToHome">
        <span class="nav-icon">🏠</span>
        <span>首页</span>
      </div>
      <div class="nav-item active">
        <span class="nav-icon">🏥</span>
        <span>医院</span>
      </div>
      <div class="nav-item" @click="goToPets">
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
import { ref, reactive, computed, onMounted } from 'vue'
import axios from '../api/axios'
import { useRouter } from 'vue-router'
import {
  waitForBMap,
  getCurrentLocation,
  createMap,
  addMarker,
  addUserLocationMarker,
  fitView,
  getDistance,
  searchNearbyHospitals
} from '../utils/map'

const router = useRouter()
const hospitals = ref([])
const searchKeyword = ref('')
const locating = ref(false)
const mapLoading = ref(true)
const mapError = ref('')
const userLocation = ref(null)
let mapInstance = null

const filters = reactive({
  conditions: [],   // 多选筛选条件
  sortBy: ''        // 单选排序（下拉框）
})

// 筛选条件选项（小饼干样式）
const filterOptions = [
  { key: 'nightService', label: '夜间服务', icon: '🌙' },
  { key: 'exoticAccept', label: '接诊异宠', icon: '🦎' },
  { key: 'emergencySupport', label: '急诊', icon: '🚑' },
  { key: 'highRating', label: '好评4.5+', icon: '⭐' }
]

const toggleCondition = (key) => {
  const idx = filters.conditions.indexOf(key)
  if (idx === -1) {
    filters.conditions.push(key)
  } else {
    filters.conditions.splice(idx, 1)
  }
}

// 排序下拉框改变时立即生效（computed 自动响应，这里只做日志）
const onSortChange = () => {
  console.log('[Hospitals] 排序方式:', filters.sortBy || '默认')
}

// 清除所有筛选和排序
const clearAllFilters = () => {
  filters.conditions = []
  filters.sortBy = ''
}

// 上海真实宠物医院静态兜底数据（百度地图搜索失败时使用）
const shanghaiFallbackHospitals = [
  {
    id: 1,
    name: '上海宠颐生动物医院(静安店)',
    address: '上海市静安区南京西路1788号',
    phone: '021-62880001',
    rating: 4.8,
    businessHours: '09:00-21:00',
    nightService: false,
    exoticAccept: true,
    emergencySupport: true,
    description: '宠颐生动物医院静安旗舰店，设备先进，资深兽医团队坐诊',
    services: '疫苗接种,内外科,口腔,影像,住院',
    lng: 121.458,
    lat: 31.224
  },
  {
    id: 2,
    name: '上海安安宠物医院(徐汇店)',
    address: '上海市徐汇区漕溪北路100号',
    phone: '021-64830002',
    rating: 4.6,
    businessHours: '09:00-20:00',
    nightService: false,
    exoticAccept: true,
    emergencySupport: false,
    description: '安安宠物医院徐汇分院，社区便民宠物诊所',
    services: '疫苗接种,常规体检,绝育,美容',
    lng: 121.437,
    lat: 31.195
  },
  {
    id: 3,
    name: '上海芭比堂动物医院(长宁店)',
    address: '上海市长宁区延安西路2000号',
    phone: '021-62310003',
    rating: 4.9,
    businessHours: '24小时',
    nightService: true,
    exoticAccept: false,
    emergencySupport: true,
    description: '芭比堂动物医院，24小时急诊服务，随时为爱宠保驾护航',
    services: '急诊,外科,内科,ICU,影像',
    lng: 121.422,
    lat: 31.218
  },
  {
    id: 4,
    name: '上海瑞鹏宠物医院(浦东店)',
    address: '上海市浦东新区张杨路500号',
    phone: '021-58880004',
    rating: 4.7,
    businessHours: '09:00-22:00',
    nightService: true,
    exoticAccept: true,
    emergencySupport: false,
    description: '瑞鹏宠物医院浦东分院，专注异宠诊疗',
    services: '异宠诊疗,疫苗接种,体检',
    lng: 121.524,
    lat: 31.230
  },
  {
    id: 5,
    name: '上海萌兽医馆(黄浦店)',
    address: '上海市黄浦区人民大道100号',
    phone: '021-63220005',
    rating: 4.5,
    businessHours: '08:30-20:30',
    nightService: false,
    exoticAccept: false,
    emergencySupport: false,
    description: '萌兽医馆黄浦店，温馨社区宠物诊所',
    services: '疫苗接种,常规体检,绝育',
    lng: 121.474,
    lat: 31.231
  }
]

const filteredHospitals = computed(() => {
  let list = [...hospitals.value]

  // 关键字搜索
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(h =>
      h.name.toLowerCase().includes(kw) ||
      (h.address && h.address.toLowerCase().includes(kw))
    )
  }

  // 多选筛选
  for (const cond of filters.conditions) {
    if (cond === 'nightService') list = list.filter(h => h.nightService)
    if (cond === 'exoticAccept') list = list.filter(h => h.exoticAccept)
    if (cond === 'emergencySupport') list = list.filter(h => h.emergencySupport)
    if (cond === 'highRating') list = list.filter(h => h.rating >= 4.5)
  }

  // 单选排序（下拉框，选完立即生效）
  if (filters.sortBy === 'distance') {
    list.sort((a, b) => {
      const da = a.distance != null ? a.distance : 9999
      const db = b.distance != null ? b.distance : 9999
      return da - db
    })
  } else if (filters.sortBy === 'rating') {
    list.sort((a, b) => b.rating - a.rating)
  } else if (filters.sortBy === 'night') {
    list.sort((a, b) => (b.nightService ? 1 : 0) - (a.nightService ? 1 : 0))
  } else if (filters.sortBy === 'exotic') {
    list.sort((a, b) => (b.exoticAccept ? 1 : 0) - (a.exoticAccept ? 1 : 0))
  }

  return list
})

const searchHospitals = () => {
  // computed 自动响应
}

// 加载医院数据：优先从后端获取，其次百度地图搜索，最后静态兜底
const loadHospitals = async () => {
  // 1. 尝试后端API
  try {
    const res = await axios.get('/hospitals', {
      params: { city: '上海' }
    })
    if (res.code === 200 && res.data && res.data.length > 0) {
      hospitals.value = res.data
      return
    }
  } catch (error) {
    console.log('[Hospitals] 后端不可用，尝试百度地图搜索')
  }

  // 2. 尝试百度地图本地搜索
  try {
    const searchResults = await searchNearbyHospitals('上海', '宠物医院')
    if (searchResults.length > 0) {
      console.log('[Hospitals] 百度地图搜索到', searchResults.length, '家宠物医院')
      hospitals.value = searchResults
      return
    }
  } catch (error) {
    console.warn('[Hospitals] 百度地图搜索失败:', error.message)
  }

  // 3. 静态兜底数据
  console.log('[Hospitals] 使用静态兜底数据')
  hospitals.value = shanghaiFallbackHospitals
}

// 初始化地图
const initMap = async () => {
  mapLoading.value = true
  mapError.value = ''
  try {
    await waitForBMap()

    // 上海市中心
    const defaultCenter = { lng: 121.474, lat: 31.230 }
    const result = await createMap('hospitalMap', defaultCenter, 12)
    mapInstance = result.map

    // 尝试获取用户位置
    await locateMe()

    // 在地图上添加医院标记
    await addHospitalMarkers()
  } catch (error) {
    console.error('[Hospitals] 地图初始化失败:', error)
    mapError.value = error.message || '地图加载失败'
  } finally {
    mapLoading.value = false
  }
}

// 定位用户位置
const locateMe = async () => {
  locating.value = true
  try {
    const location = await getCurrentLocation()
    userLocation.value = location
    console.log('[Hospitals] 用户位置:', location)

    if (mapInstance) {
      await addUserLocationMarker(mapInstance, location)
    }

    // 计算各医院距离
    await calculateDistances()

    // 调整视野
    if (mapInstance && hospitals.value.length > 0) {
      const hospitalPoints = hospitals.value
        .filter(h => h.lng && h.lat)
        .map(h => ({ lng: h.lng, lat: h.lat }))
      if (hospitalPoints.length > 0) {
        await fitView(mapInstance, [location, ...hospitalPoints])
      }
    }
  } catch (error) {
    console.warn('[Hospitals] 定位失败:', error.message)
  } finally {
    locating.value = false
  }
}

// 计算各医院到用户的距离
const calculateDistances = async () => {
  if (!userLocation.value) return
  for (const hospital of hospitals.value) {
    if (hospital.lng && hospital.lat) {
      try {
        const dist = await getDistance(
          userLocation.value,
          { lng: hospital.lng, lat: hospital.lat }
        )
        hospital.distance = dist
      } catch (e) {
        console.warn('[Hospitals] 距离计算失败:', e)
      }
    }
  }
  hospitals.value = [...hospitals.value]
}

// 在地图上添加医院标记
const addHospitalMarkers = async () => {
  if (!mapInstance) return
  for (const hospital of hospitals.value) {
    if (hospital.lng && hospital.lat) {
      try {
        await addMarker(
          mapInstance,
          { lng: hospital.lng, lat: hospital.lat },
          hospital.name
        )
      } catch (e) {
        console.warn('[Hospitals] 添加标记失败:', e)
      }
    }
  }
}

const goBack = () => router.back()
const goToDetail = (hospital) => {
  // 将医院信息存入 sessionStorage 供详情页使用
  sessionStorage.setItem('currentHospital', JSON.stringify(hospital))
  router.push(`/hospitals/${hospital.id}`)
}
const goToHome = () => router.push('/')
const goToPets = () => router.push('/pets')
const goToAppointments = () => router.push('/appointments')

onMounted(async () => {
  await loadHospitals()
  await initMap()
})
</script>

<style scoped>
.hospitals-container {
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

.nav-right {
  display: flex;
  align-items: center;
}

.locate-btn {
  padding: 6px 14px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.locate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.map-section {
  position: relative;
  margin: 10px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.map-container {
  width: 100%;
  height: 220px;
  background: #e8eef5;
}

.map-loading,
.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  color: #666;
  font-size: 14px;
  gap: 10px;
}

.map-error button {
  padding: 6px 16px;
  background: #4facfe;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* ===== 搜索筛选排序卡片（三行布局，粉色淡紫色可爱风） ===== */
.search-filter-card {
  margin: 12px 10px;
  padding: 16px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(255, 163, 204, 0.12);
  border: 1px solid rgba(255, 200, 230, 0.3);
}

/* 第一行：搜索 */
.search-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 15px;
  opacity: 0.6;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 16px 0 38px;
  border: 1.5px solid #f0d9eb;
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  background: #fffafc;
  box-sizing: border-box;
  transition: all 0.3s;
  color: #5a4a5e;
}

.search-input::placeholder {
  color: #c9b8c4;
}

.search-input:focus {
  border-color: #ff9ecd;
  background: white;
  box-shadow: 0 0 0 4px rgba(255, 158, 205, 0.12);
}

.search-btn {
  padding: 0 22px;
  height: 42px;
  background: linear-gradient(135deg, #ffb6d9 0%, #c8a2ff 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s;
  box-shadow: 0 3px 10px rgba(200, 162, 255, 0.3);
}

.search-btn:active {
  transform: scale(0.96);
}

/* 第二行：筛选标签（小饼干样式） */
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.row-label {
  font-size: 12px;
  color: #b59cb8;
  font-weight: 600;
  padding-top: 7px;
  min-width: 32px;
}

.chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.cookie-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  background: #faf5ff;
  color: #9b7bbf;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s;
  border: 2px solid #f0e6ff;
  user-select: none;
  font-weight: 500;
}

.cookie-chip:hover {
  background: #f3e8ff;
  transform: translateY(-1px);
}

.cookie-chip.active {
  background: linear-gradient(135deg, #ffb6d9 0%, #c8a2ff 100%);
  color: white;
  border-color: transparent;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(200, 162, 255, 0.4);
}

.chip-emoji {
  font-size: 14px;
}

/* 第三行：排序下拉框 */
.sort-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.sort-select {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  border: 1.5px solid #f0d9eb;
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  background: #fffafc;
  color: #5a4a5e;
  cursor: pointer;
  transition: all 0.3s;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c8a2ff' stroke-width='3'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 38px;
}

.sort-select:focus {
  border-color: #ff9ecd;
  box-shadow: 0 0 0 4px rgba(255, 158, 205, 0.12);
}

.clear-all-btn {
  padding: 8px 14px;
  background: #fff0f5;
  color: #e88aa8;
  border: 1.5px solid #ffd6e7;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s;
  font-weight: 500;
}

.clear-all-btn:hover {
  background: #ffe0ec;
  color: #d96b8f;
}

/* 定位行 */
.location-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px dashed #f0e0f0;
}

.locate-chip {
  padding: 7px 16px;
  background: linear-gradient(135deg, #a8edea 0%, #c8a2ff 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 3px 10px rgba(168, 237, 234, 0.3);
}

.locate-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.locate-chip:active:not(:disabled) {
  transform: scale(0.96);
}

.location-text {
  font-size: 11px;
  color: #b59cb8;
}

.hospital-list {
  padding: 0 10px;
}

.hospital-card {
  background: white;
  border-radius: 15px;
  padding: 15px;
  margin-bottom: 15px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.hospital-card:active {
  transform: scale(0.98);
}

.hospital-header {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  align-items: center;
}

.hospital-logo {
  font-size: 40px;
}

.hospital-info {
  flex: 1;
}

.hospital-info h3 {
  font-size: 16px;
  margin-bottom: 3px;
  color: #333;
}

.hospital-rating {
  font-size: 13px;
  color: #ff9800;
}

.hospital-distance {
  font-size: 13px;
  color: #667eea;
  font-weight: 600;
  background: #eef2ff;
  padding: 4px 10px;
  border-radius: 12px;
}

.hospital-address {
  font-size: 13px;
  color: #999;
  margin-bottom: 10px;
}

.hospital-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 15px;
}

.tag.night {
  background: #ffe4b5;
  color: #d4a017;
}

.tag.exotic {
  background: #e6f7ff;
  color: #1890ff;
}

.tag.emergency {
  background: #fff2f0;
  color: #ff4d4f;
}

.tag.real {
  background: #e8f5e9;
  color: #4caf50;
}

.hospital-footer {
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.business-hours {
  font-size: 12px;
  color: #999;
}

.empty-list {
  text-align: center;
  padding: 50px 20px;
  color: #999;
}

.empty-icon {
  font-size: 50px;
  margin-bottom: 10px;
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
