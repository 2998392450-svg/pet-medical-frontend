<template>
  <div class="pm-page">
    <div class="pm-content">
      <nav class="pm-nav-bar">
        <div class="pm-nav-left">
          <span class="pm-back-btn" @click="goBack">←</span>
          <span class="pm-nav-title">医院详情</span>
        </div>
        <div class="nav-right">
          <button class="favorite-btn" @click="toggleFavorite">
            {{ isFavorite ? '★' : '☆' }}
          </button>
        </div>
      </nav>

      <div v-if="loading" class="pm-loading">加载中...</div>

      <template v-else>
        <div class="hospital-header-card">
          <div class="hospital-icon">🏥</div>
          <div class="hospital-main-info">
            <h1>{{ hospital.name }}</h1>
            <div class="hospital-rating">⭐ {{ hospital.rating }}</div>
          </div>
        </div>

        <div class="info-section">
          <div class="info-item">
            <span class="info-icon">📍</span>
            <span class="info-text">{{ hospital.address }}</span>
          </div>
          <div class="info-item">
            <span class="info-icon">📞</span>
            <span class="info-text">
              <a :href="'tel:' + hospital.phone" class="phone-link">{{ hospital.phone }}</a>
            </span>
          </div>
          <div class="info-item">
            <span class="info-icon">⏰</span>
            <span class="info-text">{{ hospital.businessHours }}</span>
          </div>
        </div>

        <div class="tags-section">
          <span v-if="hospital.nightService" class="pm-tag pm-tag-night">夜间服务</span>
          <span v-if="hospital.exoticAccept" class="pm-tag pm-tag-exotic">接诊异宠</span>
          <span v-if="hospital.emergencySupport" class="pm-tag pm-tag-emergency">急诊</span>
        </div>

        <!-- 地图位置 -->
        <div class="pm-section map-section">
          <h2 class="pm-section-title">医院位置</h2>
          <div class="map-wrapper">
            <div id="hospitalDetailMap" class="map-container"></div>
            <div v-if="mapLoading" class="map-loading">地图加载中...</div>
            <div v-if="mapError" class="map-error">
              <span>{{ mapError }}</span>
              <button @click="initMap">重试</button>
            </div>
          </div>
          <button class="navigate-btn" @click="openNavigation">
            🧭 导航到此
          </button>
        </div>

        <div class="pm-section">
          <h2 class="pm-section-title">医院简介</h2>
          <p class="description">{{ hospital.description || '暂无简介' }}</p>
        </div>

        <div class="pm-section">
          <h2 class="pm-section-title">服务项目</h2>
          <div class="services-list">
            <span v-for="(service, index) in services" :key="index" class="service-item">{{ service }}</span>
            <span v-if="services.length === 0" class="empty-text">暂无服务信息</span>
          </div>
        </div>

        <div class="pm-section">
          <h2 class="pm-section-title">医生团队</h2>
          <div v-if="doctors.length === 0" class="empty-doctors">
            <p>暂无医生信息</p>
          </div>
          <div v-else class="doctors-list">
            <div
              v-for="doctor in doctors"
              :key="doctor.id"
              :class="['doctor-card', { selected: selectedDoctor && selectedDoctor.id === doctor.id }]"
              @click="selectDoctor(doctor)"
            >
              <div class="doctor-avatar">👨‍⚕️</div>
              <div class="doctor-info">
                <h4>{{ doctor.name }} <span class="doctor-title">{{ doctor.title }}</span></h4>
                <p>{{ doctor.specialty }}</p>
                <div class="doctor-meta">
                  <span v-if="doctor.experienceYears">从业{{ doctor.experienceYears }}年</span>
                  <span v-else-if="doctor.workHours">坐诊：{{ doctor.workHours }}</span>
                  <span>⭐ {{ doctor.rating }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pm-bottom-action">
          <button class="pm-btn pm-btn-block appointment-btn" @click="goToAppointment">立即预约</button>
        </div>
      </template>

      <div v-if="!loading && !hospital.id" class="pm-empty">医院信息不存在</div>

      <!-- 导航浮层：全屏百度地图，自动定位并规划路线 -->
      <div v-if="showNavigation" class="nav-overlay">
        <div class="nav-header">
          <span class="nav-title">🧭 导航到 {{ hospital.name }}</span>
          <button class="nav-close-btn" @click="closeNavigation">✕ 退出导航</button>
        </div>
        <!-- 出行方式选择 -->
        <div class="nav-mode-bar">
          <button
            v-for="mode in travelModes"
            :key="mode.key"
            :class="['nav-mode-btn', { active: navTravelMode === mode.key }]"
            @click="changeTravelMode(mode.key)"
          >{{ mode.icon }} {{ mode.label }}</button>
        </div>
        <div id="navMapContainer" class="nav-map-container"></div>
        <div v-if="navLoading" class="nav-loading">
          <div class="nav-spinner"></div>
          <p>{{ navStatusText }}</p>
        </div>
        <div v-if="navError" class="nav-error-tip">
          <button class="nav-error-close" @click="closeNavigation" title="关闭">✕</button>
          <p>{{ navErrorText }}</p>
          <button class="nav-fallback-btn" @click="openInNewTab">在新标签页打开百度地图</button>
          <button class="nav-dismiss-btn" @click="dismissNavError">关闭提醒</button>
        </div>
        <div v-if="navInfo" class="nav-info-bar">
          <span>📍 起点：我的位置</span>
          <span>🏁 终点：{{ hospital.name }}</span>
          <span v-if="navDistance">🛣️ {{ navDistance }}</span>
          <span v-if="navDuration">⏱️ {{ navDuration }}</span>
        </div>
        <!-- 开始真实导航按钮：唤起百度地图 App 或打开网页版导航 -->
        <div v-if="navInfo && navStartPoint" class="nav-start-bar">
          <button class="nav-start-btn" @click="startRealNavigation">
            🧭 开始导航（打开百度地图）
          </button>
        </div>
        <!-- 公交多方案选择列表 -->
        <div v-if="navInfo && navPlans.length > 0" class="nav-plans-bar">
          <div class="nav-plans-title">🚌 共 {{ navPlans.length }} 个公交方案，点击查看：</div>
          <div class="nav-plans-list">
            <div
              v-for="(plan, idx) in navPlans"
              :key="idx"
              :class="['nav-plan-item', { active: navSelectedPlan === idx }]"
              @click="selectNavPlan(idx)"
            >
              <div class="nav-plan-header">
                <span class="nav-plan-no">方案{{ idx + 1 }}</span>
                <span class="nav-plan-transfer">{{ plan.desc }}</span>
              </div>
              <!-- 线路摘要：地铁2号线 → 公交89路 -->
              <div v-if="plan.lineSummary" class="nav-plan-lines">{{ plan.lineSummary }}</div>
              <!-- 详细换乘信息（仅选中方案展开） -->
              <div v-if="navSelectedPlan === idx && plan.lineDetails && plan.lineDetails.length > 0" class="nav-plan-details">
                <div v-for="(seg, sIdx) in plan.lineDetails" :key="sIdx" class="line-seg">
                  <span class="seg-badge">{{ sIdx + 1 }}</span>
                  <span class="seg-name">{{ seg.name }}</span>
                  <span v-if="seg.entry" class="seg-station">🚏 {{ seg.entry }} 上车</span>
                  <span v-if="seg.exit" class="seg-station">🏁 {{ seg.exit }} 下车</span>
                </div>
              </div>
              <div class="nav-plan-meta">
                <span>🛣️ {{ plan.distance }}</span>
                <span>⏱️ {{ plan.duration }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from '../api/axios'
import { useRouter, useRoute } from 'vue-router'
import {
  waitForBMap,
  createMap,
  addMarker,
  geocodeAddress
} from '../utils/map'

const router = useRouter()
const route = useRoute()

const hospital = ref({})
const doctors = ref([])
const isFavorite = ref(false)
const selectedDoctor = ref(null)
const loading = ref(true)
const mapLoading = ref(true)
const mapError = ref('')
let mapInstance = null

// 上海真实宠物医院静态兜底数据
const shanghaiHospitalDetail = {
  1: {
    id: 1, name: '上海宠颐生动物医院(静安店)', address: '上海市静安区南京西路1788号',
    phone: '021-62880001', rating: 4.8, businessHours: '09:00-21:00',
    nightService: false, exoticAccept: true, emergencySupport: true,
    description: '宠颐生动物医院静安旗舰店，设备先进，资深兽医团队坐诊，提供全方位宠物医疗服务。',
    services: '疫苗接种,内外科,口腔,影像,住院',
    lng: 121.458, lat: 31.224
  },
  2: {
    id: 2, name: '上海安安宠物医院(徐汇店)', address: '上海市徐汇区漕溪北路100号',
    phone: '021-64830002', rating: 4.6, businessHours: '09:00-20:00',
    nightService: false, exoticAccept: true, emergencySupport: false,
    description: '安安宠物医院徐汇分院，社区便民宠物诊所，价格亲民，服务贴心。',
    services: '疫苗接种,常规体检,绝育,美容',
    lng: 121.437, lat: 31.195
  },
  3: {
    id: 3, name: '上海芭比堂动物医院(长宁店)', address: '上海市长宁区延安西路2000号',
    phone: '021-62310003', rating: 4.9, businessHours: '24小时',
    nightService: true, exoticAccept: false, emergencySupport: true,
    description: '芭比堂动物医院，24小时急诊服务，随时为爱宠保驾护航，配备ICU重症监护。',
    services: '急诊,外科,内科,ICU,影像',
    lng: 121.422, lat: 31.218
  },
  4: {
    id: 4, name: '上海瑞鹏宠物医院(浦东店)', address: '上海市浦东新区张杨路500号',
    phone: '021-58880004', rating: 4.7, businessHours: '09:00-22:00',
    nightService: true, exoticAccept: true, emergencySupport: false,
    description: '瑞鹏宠物医院浦东分院，专注异宠（爬行、鸟类、小型哺乳）诊疗，专业异宠兽医坐诊。',
    services: '异宠诊疗,疫苗接种,体检',
    lng: 121.524, lat: 31.230
  },
  5: {
    id: 5, name: '上海萌兽医馆(黄浦店)', address: '上海市黄浦区人民大道100号',
    phone: '021-63220005', rating: 4.5, businessHours: '08:30-20:30',
    nightService: false, exoticAccept: false, emergencySupport: false,
    description: '萌兽医馆黄浦店，温馨社区宠物诊所，提供基础医疗服务。',
    services: '疫苗接种,常规体检,绝育',
    lng: 121.474, lat: 31.231
  }
}

const mockDoctors = [
  { id: 1, name: '王医生', title: '主任医师', specialty: '小动物外科', experienceYears: 15, rating: 4.9 },
  { id: 2, name: '李医生', title: '副主任医师', specialty: '内科诊疗', experienceYears: 10, rating: 4.7 },
  { id: 3, name: '赵医生', title: '主治医师', specialty: '影像诊断', experienceYears: 8, rating: 4.6 }
]

const services = computed(() => {
  if (!hospital.value.services) return []
  return hospital.value.services.split(',').filter(s => s.trim())
})

const loadHospital = async () => {
  const id = route.params.id
  // 1. 优先从 sessionStorage 读取（列表页传入的完整数据）
  const cached = sessionStorage.getItem('currentHospital')
  if (cached) {
    try {
      const cachedHospital = JSON.parse(cached)
      if (String(cachedHospital.id) === String(id)) {
        hospital.value = cachedHospital
        return
      }
    } catch (e) {
      console.warn('[HospitalDetail] sessionStorage解析失败')
    }
  }
  // 2. 尝试后端API
  try {
    const res = await axios.get(`/hospitals/${id}`)
    if (res.code === 200) {
      hospital.value = res.data
      return
    }
  } catch (error) {
    console.error('[HospitalDetail] 后端不可用，使用本地数据:', error)
  }
  // 3. 静态兜底数据
  hospital.value = shanghaiHospitalDetail[id] || shanghaiHospitalDetail[1]
}

const loadDoctors = async () => {
  const id = route.params.id
  try {
    const res = await axios.get(`/hospitals/${id}/doctors`)
    if (res.code === 200) {
      doctors.value = res.data
    }
  } catch (error) {
    console.error('[HospitalDetail] 加载医生失败，使用本地数据:', error)
    doctors.value = mockDoctors
  }
}

const checkFavorite = async () => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) return
  // 周边搜索的医院 ID 是字符串（如 nearby_16），后端无法查询收藏状态，直接读 localStorage
  const id = route.params.id
  if (id && String(id).startsWith('nearby_')) {
    const favorites = JSON.parse(localStorage.getItem('mockFavorites') || '[]')
    isFavorite.value = favorites.some(f =>
      f.userId === user.id && f.targetType === 'hospital' && String(f.targetId) === String(id)
    )
    return
  }
  try {
    const res = await axios.get('/favorites/check', {
      params: { userId: user.id, targetType: 'hospital', targetId: route.params.id }
    })
    if (res.code === 200) {
      isFavorite.value = res.data
    }
  } catch (error) {
    // 离线模式：从localStorage读取收藏状态
    const favorites = JSON.parse(localStorage.getItem('mockFavorites') || '[]')
    isFavorite.value = favorites.some(f =>
      f.userId === user.id && f.targetType === 'hospital' && String(f.targetId) === String(route.params.id)
    )
  }
}

const toggleFavorite = async () => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (!user) {
    alert('请先登录')
    router.push('/login')
    return
  }

  const id = route.params.id
  // 周边搜索的医院 ID 是字符串（nearby_*），后端无法处理，直接走 localStorage
  const isNearby = String(id).startsWith('nearby_')
  if (isNearby) {
    const favorites = JSON.parse(localStorage.getItem('mockFavorites') || '[]')
    if (isFavorite.value) {
      const filtered = favorites.filter(f =>
        !(f.userId === user.id && f.targetType === 'hospital' && String(f.targetId) === String(id))
      )
      localStorage.setItem('mockFavorites', JSON.stringify(filtered))
    } else {
      favorites.push({
        userId: user.id,
        targetType: 'hospital',
        targetId: id,
        hospitalName: hospital.value.name
      })
      localStorage.setItem('mockFavorites', JSON.stringify(favorites))
    }
    isFavorite.value = !isFavorite.value
    return
  }

  try {
    if (isFavorite.value) {
      await axios.delete('/favorites', {
        params: { userId: user.id, targetType: 'hospital', targetId: id }
      })
    } else {
      await axios.post('/favorites', {
        userId: user.id, targetType: 'hospital', targetId: parseInt(id)
      })
    }
    isFavorite.value = !isFavorite.value
  } catch (error) {
    // 离线模式：保存到localStorage
    const favorites = JSON.parse(localStorage.getItem('mockFavorites') || '[]')
    if (isFavorite.value) {
      const filtered = favorites.filter(f =>
        !(f.userId === user.id && f.targetType === 'hospital' && String(f.targetId) === String(id))
      )
      localStorage.setItem('mockFavorites', JSON.stringify(filtered))
    } else {
      favorites.push({
        userId: user.id,
        targetType: 'hospital',
        targetId: id,
        hospitalName: hospital.value.name
      })
      localStorage.setItem('mockFavorites', JSON.stringify(favorites))
    }
    isFavorite.value = !isFavorite.value
  }
}

const selectDoctor = (doctor) => {
  selectedDoctor.value = doctor
}

// 初始化地图
const initMap = async () => {
  mapLoading.value = true
  mapError.value = ''
  try {
    await waitForBMap()

    let center = { lng: 121.474, lat: 31.230 } // 上海市中心
    let needGeocode = false

    if (hospital.value.lng && hospital.value.lat) {
      center = { lng: hospital.value.lng, lat: hospital.value.lat }
    } else if (hospital.value.address) {
      needGeocode = true
    }

    if (needGeocode) {
      try {
        center = await geocodeAddress(hospital.value.address)
      } catch (e) {
        console.error('[HospitalDetail] 地址解析失败:', e)
      }
    }

    const result = await createMap('hospitalDetailMap', center, 16)
    mapInstance = result.map
    await addMarker(mapInstance, center, hospital.value.name)
  } catch (error) {
    console.error('[HospitalDetail] 地图初始化失败:', error)
    mapError.value = error.message || '地图加载失败'
  } finally {
    mapLoading.value = false
  }
}

// 导航状态
const showNavigation = ref(false)
const navLoading = ref(false)
const navStatusText = ref('正在加载百度地图...')
const navError = ref(false)
const navErrorText = ref('')
const navInfo = ref(false)
const navDistance = ref('')
const navDuration = ref('')
const navTravelMode = ref('driving') // driving/transit/walking/riding
let navMapInstance = null
let navBMap = null
let navStartPoint = null
let navEndPoint = null

// 出行方式选项
const travelModes = [
  { key: 'driving', label: '驾车', icon: '🚗' },
  { key: 'transit', label: '公交', icon: '🚌' },
  { key: 'walking', label: '步行', icon: '🚶' },
  { key: 'riding', label: '骑行', icon: '🚲' }
]

// 切换出行方式（重新规划路线）
const changeTravelMode = async (mode) => {
  if (mode === navTravelMode.value) return
  navTravelMode.value = mode
  navPlans.value = []      // 切换模式时清空方案列表
  if (!navBMap || !navMapInstance || !navStartPoint || !navEndPoint) return
  // 清除旧路线（保留起终点标记）
  navMapInstance.clearOverlays()
  // 重新添加起终点标记
  addNavMarkers(navBMap, navMapInstance, navStartPoint, navEndPoint)
  navLoading.value = true
  navStatusText.value = '正在规划路线...'
  navDistance.value = ''
  navDuration.value = ''
  try {
    await planRoute(navBMap, navMapInstance, navStartPoint, navEndPoint, mode)
    navLoading.value = false
    navInfo.value = true
  } catch (err) {
    navLoading.value = false
    navError.value = true
    navErrorText.value = err.message || '路线规划失败'
  }
}

// 选择公交方案（切换显示该方案的路线在地图上）
const selectNavPlan = (idx) => {
  if (idx === navSelectedPlan.value) return
  navSelectedPlan.value = idx
  const plan = navPlans.value[idx]
  if (plan) {
    navDistance.value = plan.distance
    navDuration.value = plan.duration
  }
  // 重新渲染该方案到地图（清除旧路线，保留起终点标记）
  if (navBMap && navMapInstance && navStartPoint && navEndPoint) {
    navMapInstance.clearOverlays()
    addNavMarkers(navBMap, navMapInstance, navStartPoint, navEndPoint)
    // 重新规划该方案并渲染到地图（TransitRoute 的 renderOptions.map 会自动画线）
    const transit = new navBMap.TransitRoute(navMapInstance, {
      renderOptions: { map: navMapInstance, autoViewport: true },
      policy: (navBMap.BMAP_TRANSIT_POLICY_LEAST_TIME != null ? navBMap.BMAP_TRANSIT_POLICY_LEAST_TIME : 0)
    })
    // 通过 pageindex 翻页到对应方案
    try {
      if (typeof transit.setPageIndex === 'function') {
        transit.setPageIndex(idx)
        transit.search(navStartPoint, navEndPoint)
      } else {
        transit.search(navStartPoint, navEndPoint)
      }
    } catch (e) {
      console.warn('[导航] 切换公交方案渲染失败:', e)
    }
  }
}

// 添加导航起终点标记
const addNavMarkers = (BMap, map, startPoint, endPoint) => {
  // 终点标记
  const endMarker = new BMap.Marker(endPoint)
  map.addOverlay(endMarker)
  const endLabel = new BMap.Label(hospital.value.name, { offset: new BMap.Size(-20, -30) })
  endLabel.setStyle({ padding: '4px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #f5576c', color: '#f5576c', fontSize: '12px' })
  endMarker.setLabel(endLabel)
  // 起点标记
  const startMarker = new BMap.Marker(startPoint, new BMap.Icon('https://api.map.baidu.com/images/markers.png', new BMap.Size(25, 40), { offset: new BMap.Size(10, 25), imageOffset: new BMap.Size(-23, -210) }))
  map.addOverlay(startMarker)
  const startLabel = new BMap.Label('我的位置', { offset: new BMap.Size(-20, -30) })
  startLabel.setStyle({ padding: '4px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #4facfe', color: '#4facfe', fontSize: '12px' })
  startMarker.setLabel(startLabel)
}

// 打开导航：自动获取用户定位 → 规划路线
const openNavigation = async () => {
  if (!hospital.value.lng || !hospital.value.lat) {
    alert('无法获取医院位置信息')
    return
  }
  // 重置状态
  navError.value = false
  navInfo.value = false
  navDistance.value = ''
  navDuration.value = ''
  navTravelMode.value = 'driving'
  navLoading.value = true
  navStatusText.value = '正在加载百度地图...'
  showNavigation.value = true

  await nextTick()

  try {
    const BMap = await waitForBMap()
    navBMap = BMap
    // 创建导航地图，初始中心点为医院
    navEndPoint = new BMap.Point(hospital.value.lng, hospital.value.lat)
    navMapInstance = new BMap.Map('navMapContainer')
    navMapInstance.centerAndZoom(navEndPoint, 15)
    navMapInstance.enableScrollWheelZoom(true)
    navMapInstance.addControl(new BMap.NavigationControl())
    navMapInstance.addControl(new BMap.ScaleControl())

    // 获取用户定位
    navStatusText.value = '正在获取您的位置...'
    const userPoint = await getUserLocation(BMap)
    navStartPoint = new BMap.Point(userPoint.lng, userPoint.lat)

    // 添加起终点标记
    addNavMarkers(BMap, navMapInstance, navStartPoint, navEndPoint)

    // 规划路线
    navStatusText.value = '正在规划路线...'
    await planRoute(BMap, navMapInstance, navStartPoint, navEndPoint, navTravelMode.value)

    navLoading.value = false
    navInfo.value = true
  } catch (err) {
    console.error('[导航] 失败:', err)
    navLoading.value = false
    navError.value = true
    navErrorText.value = err.message || '导航加载失败，可点击下方按钮在新标签页打开'
  }
}

// 获取用户定位（优先用百度地图 Geolocation，返回 BD09 坐标）
const getUserLocation = (BMap) => {
  return new Promise((resolve, reject) => {
    // 优先尝试百度地图 SDK 定位
    if (BMap.Geolocation) {
      const geo = new BMap.Geolocation()
      geo.enableSDKLocation()
      geo.getCurrentPosition((result) => {
        if (result && result.point) {
          resolve({ lng: result.point.lng, lat: result.point.lat })
        } else {
          // 回退到浏览器原生定位（WGS84 → 用百度 Convertor 转 BD09）
          fallbackBrowserGeolocation(BMap, resolve, reject)
        }
      }, { enableHighAccuracy: true, timeout: 8000 })
    } else {
      fallbackBrowserGeolocation(BMap, resolve, reject)
    }
  })
}

// 浏览器原生定位 + WGS84 → BD09 转换
const fallbackBrowserGeolocation = (BMap, resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('浏览器不支持定位功能'))
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const wgsLng = pos.coords.longitude
      const wgsLat = pos.coords.latitude
      const convertor = new BMap.Convertor()
      convertor.translate([new BMap.Point(wgsLng, wgsLat)], 1, 5, (data) => {
        if (data && data.status === 0 && data.points && data.points[0]) {
          resolve({ lng: data.points[0].lng, lat: data.points[0].lat })
        } else {
          reject(new Error('坐标转换失败，无法精确定位'))
        }
      })
    },
    (err) => {
      const msgMap = { 1: '定位权限被拒绝，请在浏览器设置中允许定位', 2: '位置信息不可用', 3: '定位超时' }
      reject(new Error(msgMap[err.code] || '定位失败'))
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  )
}

// 规划路线（支持驾车/公交/步行/骑行）
const navPlans = ref([])        // 公交多方案列表
const navSelectedPlan = ref(0)  // 当前选中的方案索引

const planRoute = (BMap, map, startPoint, endPoint, mode) => {
  return new Promise((resolve, reject) => {
    let routeAPI
    const renderOpts = { map: map, autoViewport: true }
    switch (mode) {
      case 'transit':
        routeAPI = new BMap.TransitRoute(map, { renderOptions: renderOpts, policy: (BMap.BMAP_TRANSIT_POLICY_LEAST_TIME != null ? BMap.BMAP_TRANSIT_POLICY_LEAST_TIME : 0) })
        break
      case 'walking':
        routeAPI = new BMap.WalkingRoute(map, { renderOptions: renderOpts })
        break
      case 'riding':
        routeAPI = new BMap.RidingRoute(map, { renderOptions: renderOpts })
        break
      default:
        routeAPI = new BMap.DrivingRoute(map, { renderOptions: renderOpts, policy: (BMap.BMAP_DRIVING_POLICY_LEAST_TIME != null ? BMap.BMAP_DRIVING_POLICY_LEAST_TIME : 0) })
    }
    routeAPI.setSearchCompleteCallback((results) => {
      const STATUS_SUCCESS = (typeof BMAP_STATUS_SUCCESS !== 'undefined') ? BMAP_STATUS_SUCCESS : 0
      if (routeAPI.getStatus() === STATUS_SUCCESS) {
        // 公交模式：收集多方案
        if (mode === 'transit') {
          const plans = []
          const num = (typeof results.getNumPlans === 'function') ? results.getNumPlans() : 1
          for (let i = 0; i < num; i++) {
            const p = results.getPlan(i)
            if (p) {
              const dist = p.getDistance(false)
              const dur = p.getDuration(false)
              // 公交方案描述：换乘次数 + 具体线路名（地铁X号线/公交X路）
              let transferCount = 0
              const lineNames = []   // 每段线路名（带类型前缀）
              const lineDetails = [] // 每段详细信息（含上下车站）
              try {
                if (typeof p.getNumLines === 'function') {
                  const lineCount = p.getNumLines()
                  transferCount = Math.max(lineCount - 1, 0)
                  for (let j = 0; j < lineCount; j++) {
                    try {
                      const line = p.getLine(j)
                      if (!line) continue
                      // 线路名：优先 getName()，其次 title
                      let name = ''
                      if (typeof line.getName === 'function') name = line.getName()
                      if (!name && line.name) name = line.name
                      if (!name && line.title) name = line.title
                      // 线路类型：0=公交，1=地铁，2=步行（部分版本），其它未知
                      let vType = -1
                      try {
                        if (typeof line.getType === 'function') vType = line.getType()
                        else if (typeof line.type === 'number') vType = line.type
                      } catch (e) {}
                      // 给线路名加类型前缀，便于一眼分辨
                      let prettyName = name
                      if (vType === 1 && name && !/地铁|轻轨/.test(name)) {
                        prettyName = '地铁' + name
                      } else if (vType === 0 && name && !/路|线|地铁|轻轨/.test(name)) {
                        prettyName = '公交' + name
                      }
                      if (prettyName) lineNames.push(prettyName)
                      // 详细信息：上车站 → 下车站
                      let entry = '', exit = ''
                      try {
                        if (typeof line.getEntryStation === 'function') entry = line.getEntryStation() || ''
                        if (typeof line.getExitStation === 'function') exit = line.getExitStation() || ''
                      } catch (e) {}
                      if (entry || exit) {
                        lineDetails.push({ name: prettyName, entry, exit })
                      }
                    } catch (e) {
                      console.warn('[导航] 解析第', j, '段线路失败:', e)
                    }
                  }
                }
              } catch (e) {
                console.warn('[导航] 解析方案线路失败:', e)
              }
              // 拼接线路摘要：地铁2号线 → 公交89路
              const lineSummary = lineNames.length > 0 ? lineNames.join(' → ') : ''
              const desc = '换乘 ' + transferCount + ' 次'
              plans.push({
                index: i,
                distance: (typeof dist === 'number') ? (dist / 1000).toFixed(2) + ' 公里' : dist,
                distanceMeters: (typeof dist === 'number') ? dist : 0,
                duration: (typeof dur === 'number') ? Math.ceil(dur / 60) + ' 分钟' : dur,
                desc: desc,
                transferCount: transferCount,
                lineSummary: lineSummary,
                lineNames: lineNames,
                lineDetails: lineDetails
              })
            }
          }

          // 距离过近检测：无方案 或 第一方案距离 < 500 米
          if (plans.length === 0) {
            navPlans.value = []
            navInfo.value = false
            reject(new Error('距离过近，未找到公交方案。建议选择步行或骑行模式。'))
            return
          }
          const firstDistMeters = plans[0].distanceMeters || 0
          if (firstDistMeters > 0 && firstDistMeters < 500) {
            // 距离过近仍然显示方案，但给出提示
            navPlans.value = plans
            navSelectedPlan.value = 0
            navDistance.value = plans[0].distance
            navDuration.value = plans[0].duration
            // 显示距离过近提示（可关闭）
            navError.value = true
            navErrorText.value = '距离仅 ' + plans[0].distance + '，距离较近建议步行或骑行。如需公交方案可点击下方查看。'
            resolve()
            return
          }

          navPlans.value = plans
          navSelectedPlan.value = 0
          if (plans.length > 0) {
            navDistance.value = plans[0].distance
            navDuration.value = plans[0].duration
          }
        } else {
          // 其他模式：单方案
          navPlans.value = []
          navSelectedPlan.value = 0
          const plan = results.getPlan(0)
          if (plan) {
            const dist = plan.getDistance(false)
            const km = (typeof dist === 'number') ? (dist / 1000).toFixed(2) : dist
            navDistance.value = km + ' 公里'
            const dur = plan.getDuration(false)
            const minutes = (typeof dur === 'number') ? Math.ceil(dur / 60) : dur
            navDuration.value = minutes + ' 分钟'
          }
        }
        resolve()
      } else {
        navPlans.value = []
        const modeName = { driving: '驾车', transit: '公交', walking: '步行', riding: '骑行' }[mode] || '路线'
        reject(new Error(modeName + '路线规划失败，可尝试切换其他出行方式'))
      }
    })
    routeAPI.search(startPoint, endPoint)
  })
}

const closeNavigation = () => {
  showNavigation.value = false
  navLoading.value = false
  navError.value = false
  navInfo.value = false
  navDistance.value = ''
  navDuration.value = ''
  // 清理地图实例
  if (navMapInstance) {
    try { navMapInstance.clearOverlays() } catch (e) {}
    navMapInstance = null
  }
  navBMap = null
  navStartPoint = null
  navEndPoint = null
}

// 仅关闭错误提醒（保留导航浮层和地图）
const dismissNavError = () => {
  navError.value = false
  navErrorText.value = ''
}

const openInNewTab = () => {
  const lng = hospital.value.lng
  const lat = hospital.value.lat
  const name = encodeURIComponent(hospital.value.name || '医院')
  const address = encodeURIComponent(hospital.value.address || '')
  let url
  if (lng && lat) {
    url = `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${name}&content=${address}&output=html&src=webapp.petMedical`
  } else {
    url = `https://api.map.baidu.com/place/search?query=${name}&region=上海&output=html&src=webapp.petMedical`
  }
  window.open(url, '_blank')
}

// 开始真实导航：优先唤起百度地图 App（移动端），失败则打开网页版导航
// 当前选中的出行方式决定导航模式（driving/transit/walking/riding）
const startRealNavigation = () => {
  if (!navStartPoint) {
    alert('请先获取您的位置')
    return
  }
  const startLng = navStartPoint.lng
  const startLat = navStartPoint.lat
  const endLng = hospital.value.lng
  const endLat = hospital.value.lat
  const endName = encodeURIComponent(hospital.value.name || '目的地')
  // 百度地图导航模式：driving/transit/walking/riding
  const mode = navTravelMode.value || 'driving'
  // 起点坐标使用导航时获取的 BD09 坐标
  const origin = `latlng:${startLat},${startLng}|name:我的位置`
  const destination = `latlng:${endLat},${endLng}|name:${endName}`

  // 1. 优先尝试唤起百度地图 App（移动端浏览器/微信小程序 webview 内有效）
  // 百度地图 URL Scheme: baidumap://map/direction?origin=...&destination=...&mode=...
  const appScheme = `baidumap://map/direction?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&coord_type=bd09ll&src=webapp.petMedical`
  // 2. 网页版兜底：百度地图网页版路线规划
  const webUrl = `https://api.map.baidu.com/direction?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&coord_type=bd09ll&output=html&src=webapp.petMedical`

  // 检测是否为移动端
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  if (isMobile) {
    // 移动端：尝试唤起 App，3 秒后未跳转则打开网页版
    let hasApp = false
    const start = Date.now()
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = appScheme
    document.body.appendChild(iframe)
    const timer = setTimeout(() => {
      document.body.removeChild(iframe)
      if (!hasApp && Date.now() - start < 2500) {
        // App 未安装，打开网页版
        window.location.href = webUrl
      }
    }, 2000)
    // 监听页面可见性变化（App 唤起成功后页面会隐藏）
    const onVisChange = () => {
      if (document.hidden) {
        hasApp = true
        clearTimeout(timer)
        document.removeEventListener('visibilitychange', onVisChange)
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
  } else {
    // 桌面端：直接打开网页版导航
    window.open(webUrl, '_blank')
  }
}

const goBack = () => router.back()
const goToAppointment = () => {
  const doctorId = selectedDoctor.value?.id || null
  router.push(`/appointments/create/${route.params.id}?doctorId=${doctorId}`)
}

onMounted(async () => {
  loading.value = true
  await loadHospital()
  await loadDoctors()
  checkFavorite()
  loading.value = false
  // 等待DOM渲染后初始化地图
  setTimeout(() => {
    initMap()
  }, 100)
})
</script>

<style scoped>
/* 收藏按钮（保留在导航栏右侧） */
.nav-right {
  display: flex;
  align-items: center;
}

.favorite-btn {
  font-size: 26px;
  background: none;
  border: none;
  cursor: pointer;
  color: #d6709f;
  padding: 5px;
  transition: transform 0.2s;
}

.favorite-btn:active {
  transform: scale(0.9);
}

/* 医院头部卡片 - 粉色渐变 */
.hospital-header-card {
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  padding: 30px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  color: white;
  margin: 12px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(214, 112, 159, 0.25);
}

.hospital-icon {
  font-size: 60px;
}

.hospital-main-info h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.hospital-rating {
  font-size: 16px;
  opacity: 0.9;
}

/* 信息区块 - 玻璃拟态粉色卡片 */
.info-section {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  margin: 10px 12px;
  border-radius: 20px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(214, 112, 159, 0.1);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #ffe8f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.info-text {
  color: #5a4a5a;
  font-size: 14px;
  flex: 1;
}

.phone-link {
  color: #d6709f;
  text-decoration: none;
  font-weight: 500;
}

/* 标签区 */
.tags-section {
  display: flex;
  gap: 10px;
  padding: 0 12px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

/* 描述文字 */
.description {
  color: #5a4a5a;
  line-height: 1.6;
  font-size: 14px;
}

/* 地图区域 */
.map-section .map-wrapper {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.map-container {
  width: 100%;
  height: 200px;
  background: #ffe8f0;
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
  color: #b094b8;
  font-size: 14px;
  gap: 10px;
}

.map-error button {
  padding: 6px 16px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.navigate-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(214, 112, 159, 0.25);
}

.navigate-btn:active {
  transform: scale(0.98);
}

/* 服务列表 */
.services-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.service-item {
  background: rgba(214, 112, 159, 0.08);
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 13px;
  color: #d6709f;
}

.empty-text {
  color: #b094b8;
  font-size: 14px;
}

.empty-doctors {
  text-align: center;
  padding: 20px;
  color: #b094b8;
}

.doctors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 医生列表卡片 - 粉色主题 */
.doctor-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.doctor-card.selected {
  background: rgba(214, 112, 159, 0.08);
  border-color: #ff9ec7;
  box-shadow: 0 2px 10px rgba(214, 112, 159, 0.12);
}

.doctor-avatar {
  font-size: 36px;
}

.doctor-info h4 {
  font-size: 15px;
  margin-bottom: 4px;
  color: #5a4a5a;
}

.doctor-title {
  font-size: 12px;
  color: #d6709f;
  margin-left: 5px;
}

.doctor-info p {
  font-size: 13px;
  color: #b094b8;
  margin-bottom: 5px;
}

.doctor-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #b094b8;
}

/* 预约按钮 - 补充高度（pm-btn 已提供基础样式） */
.appointment-btn {
  height: 48px;
  font-size: 16px;
}

.appointment-btn:active {
  transform: scale(0.98);
}

/* ===== 导航浮层（全屏，z-index 高于底部按钮 999） ===== */
.nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.nav-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ff9ec7 0%, #d6709f 100%);
  color: #fff;
  box-shadow: 0 2px 10px rgba(214, 112, 159, 0.25);
}

.nav-title {
  font-size: 15px;
  font-weight: 600;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-close-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-close-btn:hover,
.nav-close-btn:active {
  background: rgba(255, 255, 255, 0.4);
}

/* 出行方式选择栏 */
.nav-mode-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #ffe8f0;
  gap: 6px;
}

.nav-mode-btn {
  flex: 1;
  padding: 8px 4px;
  background: rgba(214, 112, 159, 0.04);
  border: 1px solid #ffe8f0;
  border-radius: 18px;
  color: #b094b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-mode-btn:hover {
  background: rgba(214, 112, 159, 0.1);
  border-color: #ffb3c8;
  color: #d6709f;
}

/* 选中态：粉色渐变 */
.nav-mode-btn.active {
  background: linear-gradient(135deg, #ff9ec7 0%, #d6709f 100%);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(214, 112, 159, 0.4);
}

/* 公交多方案列表 */
.nav-plans-bar {
  flex-shrink: 0;
  background: #fff5f7;
  border-top: 1px solid #ffe8f0;
  padding: 10px 12px;
  max-height: 260px;
  overflow-y: auto;
}

.nav-plans-title {
  font-size: 12px;
  color: #b094b8;
  margin-bottom: 8px;
}

.nav-plans-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-plan-item {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #ffe8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-plan-item:hover {
  border-color: #ffb3c8;
  box-shadow: 0 2px 8px rgba(214, 112, 159, 0.15);
}

/* 选中态：粉色边框 */
.nav-plan-item.active {
  border-color: #d6709f;
  background: linear-gradient(135deg, #fff5f7 0%, #fef0f5 100%);
  box-shadow: 0 2px 10px rgba(214, 112, 159, 0.25);
}

.nav-plan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.nav-plan-no {
  font-size: 13px;
  font-weight: 600;
  color: #5a4a5a;
}

.nav-plan-transfer {
  font-size: 11px;
  color: #d6709f;
  background: rgba(214, 112, 159, 0.12);
  padding: 1px 6px;
  border-radius: 8px;
}

.nav-plan-lines {
  font-size: 12px;
  color: #d6709f;
  font-weight: 500;
  margin-bottom: 6px;
  line-height: 1.4;
  word-break: break-all;
}

.nav-plan-details {
  background: rgba(214, 112, 159, 0.06);
  border-left: 3px solid #d6709f;
  padding: 6px 8px;
  margin: 6px 0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line-seg {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 11px;
  color: #b094b8;
}

.seg-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9ec7, #d6709f);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

.seg-name {
  color: #d6709f;
  font-weight: 500;
}

.seg-station {
  color: #b094b8;
  font-size: 11px;
}

.nav-plan-desc {
  font-size: 11px;
  color: #b094b8;
  margin-bottom: 4px;
}

.nav-plan-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #b094b8;
}

/* 导航地图容器：占满浮层剩余空间 */
.nav-map-container {
  flex: 1;
  width: 100%;
  min-height: 300px;
  background: #ffe8f0;
  display: block;
}

/* 加载与错误提示覆盖在地图上 */
.nav-loading,
.nav-error-tip {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  text-align: center;
  color: #b094b8;
  font-size: 14px;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.85);
  padding: 20px;
  margin: 0 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(214, 112, 159, 0.15);
}

.nav-error-tip {
  pointer-events: auto;
}

.nav-error-tip p {
  margin: 0 0 8px;
  color: #d6709f;
}

.nav-spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 12px;
  border: 3px solid #ffe8f0;
  border-top-color: #d6709f;
  border-radius: 50%;
  animation: nav-spin 0.8s linear infinite;
}

@keyframes nav-spin {
  to { transform: rotate(360deg); }
}

.nav-fallback-btn {
  margin-top: 12px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #ff9ec7 0%, #d6709f 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(214, 112, 159, 0.3);
}

/* 错误提醒关闭按钮（右上角 ×） */
.nav-error-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(214, 112, 159, 0.12);
  color: #d6709f;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-error-close:hover {
  background: rgba(214, 112, 159, 0.25);
  color: #b85a85;
}

/* "关闭提醒"按钮（仅关闭错误提示，保留导航浮层） */
.nav-dismiss-btn {
  margin-top: 8px;
  margin-left: 8px;
  padding: 8px 20px;
  background: rgba(214, 112, 159, 0.08);
  color: #d6709f;
  border: 1px solid rgba(214, 112, 159, 0.2);
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-dismiss-btn:hover {
  background: rgba(214, 112, 159, 0.15);
}

.nav-error-tip {
  position: relative;
}

/* 底部路线信息栏：起点/终点/距离/时长 */
.nav-info-bar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: center;
  gap: 8px 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ff9ec7 0%, #d6709f 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 -2px 10px rgba(214, 112, 159, 0.2);
}

.nav-info-bar span {
  white-space: nowrap;
}

/* 开始导航按钮栏 */
.nav-start-bar {
  flex-shrink: 0;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #ffe8f0;
}

.nav-start-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #ff9ec7 0%, #d6709f 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(214, 112, 159, 0.4);
  transition: all 0.2s;
}

.nav-start-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 6px rgba(214, 112, 159, 0.3);
}
</style>
