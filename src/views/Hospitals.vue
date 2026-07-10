<template>
  <div class="pm-page hospitals-page">
    <nav class="pm-nav-bar">
      <div class="pm-nav-left">
        <span class="pm-back-btn" @click="goBack">←</span>
        <span class="pm-nav-title">附近医院（上海）</span>
      </div>
      <div class="nav-right">
        <button class="pm-btn pm-btn-outline pm-btn-sm" @click="locateMe" :disabled="locating">
          {{ locating ? '定位中...' : '📍 定位' }}
        </button>
      </div>
    </nav>

    <div class="pm-content">
      <!-- 地图区域 -->
      <div class="pm-section map-section">
        <div id="hospitalMap" class="map-container"></div>
        <div v-if="mapLoading" class="pm-loading">地图加载中...</div>
        <div v-if="mapError" class="map-error">
          <span>{{ mapError }}</span>
          <button class="pm-btn pm-btn-sm" @click="initMap">重试</button>
        </div>
      </div>

      <!-- 搜索筛选排序卡片 -->
      <div class="pm-section search-filter-card">
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
          <button class="pm-btn pm-btn-sm" @click="searchHospitals">搜索</button>
        </div>

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

        <div class="sort-row">
          <div class="row-label">排序</div>
          <select v-model="filters.sortBy" class="pm-select sort-select" @change="onSortChange">
            <option value="">默认顺序</option>
            <option value="distance">📍 距离优先</option>
            <option value="rating">⭐ 好评优先</option>
            <option value="night">🌙 夜间服务优先</option>
            <option value="exotic">🦎 异宠服务优先</option>
          </select>
          <button
            v-if="filters.conditions.length > 0 || filters.sortBy"
            class="pm-btn pm-btn-outline pm-btn-sm"
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
          class="pm-list-card hospital-card"
          @click="goToDetail(hospital)"
        >
          <div class="pm-list-card-header">
            <div class="pm-list-card-icon">🏥</div>
            <div style="flex:1">
              <h3 class="pm-list-card-title">{{ hospital.name }}</h3>
              <div class="pm-rating">⭐ {{ hospital.rating }}</div>
            </div>
            <div v-if="hospital.distance != null" class="hospital-distance">
              {{ hospital.distance }}km
            </div>
          </div>
          <p class="pm-list-card-body">📍 {{ hospital.address }}</p>
          <div style="margin-top:8px">
            <span v-if="hospital.isNearby" class="pm-tag pm-tag-nearby">📍 附近</span>
            <span v-if="hospital.nightService" class="pm-tag pm-tag-night">夜间服务</span>
            <span v-if="hospital.exoticAccept" class="pm-tag pm-tag-exotic">接诊异宠</span>
            <span v-if="hospital.emergencySupport" class="pm-tag pm-tag-emergency">急诊</span>
            <span v-if="hospital.isReal" class="pm-tag pm-tag-real">真实商户</span>
          </div>
          <div class="hospital-footer">
            <span class="business-hours">⏰ {{ hospital.businessHours }}</span>
          </div>
        </div>

        <div v-if="filteredHospitals.length === 0" class="pm-empty">
          <div class="pm-empty-icon">🏥</div>
          <div class="pm-empty-text">暂无符合条件的医院</div>
        </div>
      </div>
    </div>

    <div class="pm-bottom-nav">
      <div class="pm-nav-item" @click="goToHome">
        <span class="pm-nav-icon">🏠</span>
        <span>首页</span>
      </div>
      <div class="pm-nav-item active">
        <span class="pm-nav-icon">🏥</span>
        <span>医院</span>
      </div>
      <div class="pm-nav-item" @click="goToPets">
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../api/axios'
import {
  waitForBMap,
  createMap,
  addMarker,
  searchHospitalsByAgentPlan,
  searchHospitalsByLocation
} from '../utils/map'

const router = useRouter()

const hospitals = ref([])
const searchKeyword = ref('')
const mapLoading = ref(true)
const mapError = ref('')
const locating = ref(false)
let mapInstance = null
let userLocation = null

const filters = reactive({
  conditions: [],
  sortBy: ''
})

const filterOptions = [
  { key: 'night', label: '夜间服务', icon: '🌙' },
  { key: 'exotic', label: '异宠', icon: '🦎' },
  { key: 'emergency', label: '急诊', icon: '🚑' },
  { key: 'real', label: '真实商户', icon: '✓' }
]

// 上海5家宠物医院静态兜底数据
const shanghaiHospitals = [
  {
    id: 1, name: '上海宠颐生动物医院(静安店)', address: '上海市静安区南京西路1788号',
    phone: '021-62880001', rating: 4.8, businessHours: '09:00-21:00',
    nightService: false, exoticAccept: true, emergencySupport: true,
    description: '宠颐生动物医院静安旗舰店，设备先进，资深兽医团队坐诊。',
    services: '疫苗接种,内外科,口腔,影像,住院',
    lng: 121.458, lat: 31.224
  },
  {
    id: 2, name: '上海安安宠物医院(徐汇店)', address: '上海市徐汇区漕溪北路100号',
    phone: '021-64830002', rating: 4.6, businessHours: '09:00-20:00',
    nightService: false, exoticAccept: true, emergencySupport: false,
    description: '安安宠物医院徐汇分院，社区便民宠物诊所，价格亲民。',
    services: '疫苗接种,常规体检,绝育,美容',
    lng: 121.437, lat: 31.195
  },
  {
    id: 3, name: '上海芭比堂动物医院(长宁店)', address: '上海市长宁区延安西路2000号',
    phone: '021-62310003', rating: 4.9, businessHours: '24小时',
    nightService: true, exoticAccept: false, emergencySupport: true,
    description: '芭比堂动物医院，24小时急诊服务，配备ICU重症监护。',
    services: '急诊,外科,内科,ICU,影像',
    lng: 121.422, lat: 31.218
  },
  {
    id: 4, name: '上海瑞鹏宠物医院(浦东店)', address: '上海市浦东新区张杨路500号',
    phone: '021-58880004', rating: 4.7, businessHours: '09:00-22:00',
    nightService: true, exoticAccept: true, emergencySupport: false,
    description: '瑞鹏宠物医院浦东分院，专注异宠诊疗。',
    services: '异宠诊疗,疫苗接种,体检',
    lng: 121.524, lat: 31.230
  },
  {
    id: 5, name: '上海萌兽医馆(黄浦店)', address: '上海市黄浦区人民大道100号',
    phone: '021-63220005', rating: 4.5, businessHours: '08:30-20:30',
    nightService: false, exoticAccept: false, emergencySupport: false,
    description: '萌兽医馆黄浦店，温馨社区宠物诊所。',
    services: '疫苗接种,常规体检,绝育',
    lng: 121.474, lat: 31.231
  }
]

const filteredHospitals = computed(() => {
  let result = [...hospitals.value]

  // 关键词搜索
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    result = result.filter(h =>
      (h.name && h.name.toLowerCase().includes(kw)) ||
      (h.address && h.address.toLowerCase().includes(kw))
    )
  }

  // 条件筛选
  if (filters.conditions.length > 0) {
    result = result.filter(h => {
      return filters.conditions.every(cond => {
        if (cond === 'night') return h.nightService
        if (cond === 'exotic') return h.exoticAccept
        if (cond === 'emergency') return h.emergencySupport
        if (cond === 'real') return h.isReal
        return true
      })
    })
  }

  // 排序
  console.log('[Hospitals] 排序方式:', filters.sortBy)
  if (filters.sortBy === 'distance') {
    result.sort((a, b) => {
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })
  } else if (filters.sortBy === 'rating') {
    result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else if (filters.sortBy === 'night') {
    result.sort((a, b) => (b.nightService ? 1 : 0) - (a.nightService ? 1 : 0))
  } else if (filters.sortBy === 'exotic') {
    result.sort((a, b) => (b.exoticAccept ? 1 : 0) - (a.exoticAccept ? 1 : 0))
  }

  return result
})

const loadHospitals = async () => {
  try {
    const res = await axios.get('/hospitals')
    if (res.code === 200 && res.data && res.data.length > 0) {
      hospitals.value = res.data.map(h => ({ ...h, isReal: true }))
      return
    }
  } catch (error) {
    console.error('[Hospitals] 后端不可用，使用本地数据:', error)
  }
  // 静态兜底
  hospitals.value = shanghaiHospitals.map(h => ({ ...h, isReal: false }))
}

const initMap = async () => {
  mapLoading.value = true
  mapError.value = ''
  try {
    await waitForBMap()
    const center = { lng: 121.474, lat: 31.230 } // 上海市中心
    const result = await createMap('hospitalMap', center, 12)
    mapInstance = result.map

    // 添加医院标记
    for (const h of hospitals.value) {
      if (h.lng && h.lat) {
        try {
          await addMarker(mapInstance, { lng: h.lng, lat: h.lat }, h.name)
        } catch (e) {
          console.warn('[Hospitals] 添加标记失败:', h.name, e)
        }
      }
    }
  } catch (error) {
    console.error('[Hospitals] 地图初始化失败:', error)
    mapError.value = error.message || '地图加载失败'
  } finally {
    mapLoading.value = false
  }
}

const locateMe = () => {
  if (!navigator.geolocation) {
    alert('您的浏览器不支持定位功能')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      userLocation = { lat: latitude, lng: longitude }
      console.log('[Hospitals] 用户位置:', userLocation)

      // 计算距离
      hospitals.value = hospitals.value.map(h => {
        if (h.lng && h.lat) {
          h.distance = calcDistance(latitude, longitude, h.lat, h.lng)
        }
        return h
      })

      // 周边搜索：优先 Agent Plan（语义化 AI 搜索，精准返回宠物医院，避免居民楼）
      console.log('[Hospitals] 搜索周边宠物医院（Agent Plan 优先）...')
      try {
        let nearby = []
        try {
          nearby = await searchHospitalsByAgentPlan(userLocation, '上海市')
          console.log('[Hospitals] Agent Plan 搜索到', nearby.length, '家宠物医院')
        } catch (agentErr) {
          console.warn('[Hospitals] Agent Plan 不可用，降级到 JS API 周边搜索:', agentErr.message)
          nearby = await searchHospitalsByLocation(userLocation, '宠物医院', 3000)
          console.log('[Hospitals] JS API 周边搜索到', nearby.length, '家宠物医院')
        }
        // 合并周边搜索结果（去重）
        const existingIds = new Set(hospitals.value.map(h => String(h.id)))
        const nearbyFiltered = nearby
          .filter(h => !existingIds.has(String(h.id)))
          .map(h => ({
            ...h,
            isNearby: true,
            isReal: true,
            distance: h.distance != null ? h.distance : calcDistance(latitude, longitude, h.lat, h.lng)
          }))
        hospitals.value = [...nearbyFiltered, ...hospitals.value]
      } catch (e) {
        console.warn('[Hospitals] 周边搜索失败:', e)
      }

      // 地图移动到用户位置
      if (mapInstance && window.BMap) {
        const point = new BMap.Point(longitude, latitude)
        mapInstance.centerAndZoom(point, 14)
        const marker = new BMap.Marker(point)
        mapInstance.addOverlay(marker)
      }

      locating.value = false
    },
    (error) => {
      console.error('[Hospitals] 定位失败:', error)
      alert('定位失败：' + (error.message || '请检查定位权限'))
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// 计算两点间距离（Haversine 公式），返回 km
const calcDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

const searchHospitals = () => {
  // filteredHospitals 是 computed，会自动响应 searchKeyword 变化
  console.log('[Hospitals] 搜索关键词:', searchKeyword.value)
}

const toggleCondition = (key) => {
  const idx = filters.conditions.indexOf(key)
  if (idx === -1) {
    filters.conditions.push(key)
  } else {
    filters.conditions.splice(idx, 1)
  }
}

const onSortChange = () => {
  console.log('[Hospitals] 排序方式:', filters.sortBy)
}

const clearAllFilters = () => {
  filters.conditions = []
  filters.sortBy = ''
  searchKeyword.value = ''
}

const goToDetail = (hospital) => {
  sessionStorage.setItem('currentHospital', JSON.stringify(hospital))
  router.push(`/hospitals/${hospital.id}`)
}

const goBack = () => router.back()
const goToHome = () => router.push('/')
const goToPets = () => router.push('/pets')
const goToAppointments = () => router.push('/appointments')
const goToProfile = () => router.push('/profile')

onMounted(async () => {
  await loadHospitals()
  initMap()
})
</script>

<style scoped>
/* 页面专属样式（基础样式由全局 theme.css 提供） */

.map-section {
  position: relative;
  margin: 10px 12px;
  border-radius: 20px;
  overflow: hidden;
  padding: 0;
  background: transparent;
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.1);
}

.map-container {
  width: 100%;
  height: 280px;
  background: #f5f0f5;
}

.map-error {
  text-align: center;
  padding: 20px;
  color: #d6709f;
}

.map-error button {
  margin-top: 10px;
}

.search-filter-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-row {
  display: flex;
  gap: 10px;
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 14px;
  border: 2px solid #ffe8f0;
  padding: 0 12px;
  transition: all 0.3s;
}

.search-box:focus-within {
  border-color: #ffb3c8;
  box-shadow: 0 0 0 4px rgba(255, 179, 200, 0.12);
}

.search-icon {
  font-size: 14px;
  opacity: 0.6;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  height: 40px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: #5a4a5a;
}

.search-input::placeholder {
  color: #c8b0c0;
}

.filter-row,
.sort-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.row-label {
  font-size: 12px;
  color: #b094b8;
  font-weight: 600;
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
  padding: 6px 12px;
  background: #fff;
  border: 1.5px solid #ffe8f0;
  border-radius: 16px;
  font-size: 12px;
  color: #b094b8;
  cursor: pointer;
  transition: all 0.2s;
}

.cookie-chip:hover {
  border-color: #ffb3c8;
  color: #d6709f;
}

.cookie-chip.active {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border-color: transparent;
  box-shadow: 0 3px 10px rgba(214, 112, 159, 0.25);
}

.chip-emoji {
  font-size: 13px;
}

.sort-select {
  width: auto;
  min-width: 140px;
  height: 36px;
  font-size: 13px;
}

.hospital-list {
  padding: 0 12px;
}

.hospital-card {
  margin-bottom: 12px;
}

.hospital-distance {
  background: rgba(214, 112, 159, 0.1);
  color: #d6709f;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.hospital-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(214, 112, 159, 0.15);
}

.business-hours {
  font-size: 12px;
  color: #b094b8;
}
</style>
