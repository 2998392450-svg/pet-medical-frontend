<template>
  <div class="detail-container">
    <nav class="nav-bar">
      <div class="nav-left">
        <span class="back-btn" @click="goBack">←</span>
        <span class="title">医院详情</span>
      </div>
      <div class="nav-right">
        <button class="favorite-btn" @click="toggleFavorite">
          {{ isFavorite ? '★' : '☆' }}
        </button>
      </div>
    </nav>

    <div v-if="loading" class="loading">加载中...</div>

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
        <span v-if="hospital.nightService" class="tag night">夜间服务</span>
        <span v-if="hospital.exoticAccept" class="tag exotic">接诊异宠</span>
        <span v-if="hospital.emergencySupport" class="tag emergency">急诊</span>
      </div>

      <!-- 地图位置 -->
      <div class="section map-section">
        <h2 class="section-title">医院位置</h2>
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

      <div class="section">
        <h2 class="section-title">医院简介</h2>
        <p class="description">{{ hospital.description || '暂无简介' }}</p>
      </div>

      <div class="section">
        <h2 class="section-title">服务项目</h2>
        <div class="services-list">
          <span v-for="(service, index) in services" :key="index" class="service-item">{{ service }}</span>
          <span v-if="services.length === 0" class="empty-text">暂无服务信息</span>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">医生团队</h2>
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

      <div class="bottom-action">
        <button class="appointment-btn" @click="goToAppointment">立即预约</button>
      </div>
    </template>

    <div v-if="!loading && !hospital.id" class="empty">医院信息不存在</div>

    <!-- 导航浮层：全屏百度地图，自动定位并规划路线 -->
    <div v-if="showNavigation" class="nav-overlay">
      <div class="nav-header">
        <span class="nav-title">🧭 导航到 {{ hospital.name }}</span>
        <button class="nav-close-btn" @click="closeNavigation">✕ 退出导航</button>
      </div>
      <div id="navMapContainer" class="nav-map-container"></div>
      <div v-if="navLoading" class="nav-loading">
        <div class="nav-spinner"></div>
        <p>{{ navStatusText }}</p>
      </div>
      <div v-if="navError" class="nav-error-tip">
        <p>{{ navErrorText }}</p>
        <button class="nav-fallback-btn" @click="openInNewTab">在新标签页打开百度地图</button>
      </div>
      <div v-if="navInfo" class="nav-info-bar">
        <span>📍 起点：我的位置</span>
        <span>🏁 终点：{{ hospital.name }}</span>
        <span v-if="navDistance">🚗 {{ navDistance }}</span>
        <span v-if="navDuration">⏱️ {{ navDuration }}</span>
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

  try {
    if (isFavorite.value) {
      await axios.delete('/favorites', {
        params: { userId: user.id, targetType: 'hospital', targetId: route.params.id }
      })
    } else {
      await axios.post('/favorites', {
        userId: user.id, targetType: 'hospital', targetId: parseInt(route.params.id)
      })
    }
    isFavorite.value = !isFavorite.value
  } catch (error) {
    // 离线模式：保存到localStorage
    const favorites = JSON.parse(localStorage.getItem('mockFavorites') || '[]')
    if (isFavorite.value) {
      const filtered = favorites.filter(f =>
        !(f.userId === user.id && f.targetType === 'hospital' && String(f.targetId) === String(route.params.id))
      )
      localStorage.setItem('mockFavorites', JSON.stringify(filtered))
    } else {
      favorites.push({
        userId: user.id,
        targetType: 'hospital',
        targetId: parseInt(route.params.id),
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

// 打开导航：自动获取用户定位 → 规划驾车路线
const showNavigation = ref(false)
const navLoading = ref(false)
const navStatusText = ref('正在加载百度地图...')
const navError = ref(false)
const navErrorText = ref('')
const navInfo = ref(false)
const navDistance = ref('')
const navDuration = ref('')
let navMapInstance = null
let navRoutePlan = null

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
  navLoading.value = true
  navStatusText.value = '正在加载百度地图...'
  showNavigation.value = true

  // 等待 DOM 渲染后再初始化地图
  await nextTick()

  try {
    const BMap = await waitForBMap()
    // 创建导航地图，初始中心点为医院
    const endPoint = new BMap.Point(hospital.value.lng, hospital.value.lat)
    navMapInstance = new BMap.Map('navMapContainer')
    navMapInstance.centerAndZoom(endPoint, 15)
    navMapInstance.enableScrollWheelZoom(true)
    navMapInstance.addControl(new BMap.NavigationControl())
    navMapInstance.addControl(new BMap.ScaleControl())

    // 终点标记
    const endMarker = new BMap.Marker(endPoint)
    navMapInstance.addOverlay(endMarker)
    const endLabel = new BMap.Label(hospital.value.name, {
      offset: new BMap.Size(-20, -30)
    })
    endLabel.setStyle({ padding: '4px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #f5576c', color: '#f5576c', fontSize: '12px' })
    endMarker.setLabel(endLabel)

    // 获取用户定位
    navStatusText.value = '正在获取您的位置...'
    const userPoint = await getUserLocation(BMap)

    // 起点标记
    const startPoint = new BMap.Point(userPoint.lng, userPoint.lat)
    const startMarker = new BMap.Marker(startPoint, new BMap.Icon('https://api.map.baidu.com/images/markers.png', new BMap.Size(25, 40), { offset: new BMap.Size(10, 25), imageOffset: new BMap.Size(-23, -210) }))
    navMapInstance.addOverlay(startMarker)
    const startLabel = new BMap.Label('我的位置', {
      offset: new BMap.Size(-20, -30)
    })
    startLabel.setStyle({ padding: '4px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #4facfe', color: '#4facfe', fontSize: '12px' })
    startMarker.setLabel(startLabel)

    // 规划驾车路线
    navStatusText.value = '正在规划路线...'
    await planDrivingRoute(BMap, navMapInstance, startPoint, endPoint)

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

// 规划驾车路线
const planDrivingRoute = (BMap, map, startPoint, endPoint) => {
  return new Promise((resolve, reject) => {
    const driving = new BMap.DrivingRoute(map, {
      renderOptions: { map: map, autoViewport: true },
      onSearchComplete: (results) => {
        if (driving.getStatus() === BMAP_STATUS_SUCCESS) {
          const plan = results.getPlan(0)
          if (plan) {
            // 提取距离和时间
            const km = (plan.getDistance(false) / 1000).toFixed(2)
            navDistance.value = km + ' 公里'
            const minutes = Math.ceil(plan.getDuration(false) / 60)
            navDuration.value = minutes + ' 分钟'
          }
          resolve()
        } else {
          reject(new Error('路线规划失败，请稍后重试'))
        }
      }
    })
    driving.search(startPoint, endPoint)
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
.detail-container {
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

.nav-right {
  display: flex;
  align-items: center;
}

.favorite-btn {
  font-size: 26px;
  background: none;
  border: none;
  cursor: pointer;
  color: #ff9800;
  padding: 5px;
  transition: transform 0.2s;
}

.favorite-btn:active {
  transform: scale(0.9);
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.hospital-header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  color: white;
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

.info-section {
  background: white;
  margin: 10px;
  border-radius: 15px;
  padding: 15px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.info-text {
  color: #666;
  font-size: 14px;
  flex: 1;
}

.phone-link {
  color: #4facfe;
  text-decoration: none;
}

.tags-section {
  display: flex;
  gap: 10px;
  padding: 0 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.tag {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 20px;
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

.section {
  background: white;
  margin: 10px;
  border-radius: 15px;
  padding: 15px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.description {
  color: #666;
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

.navigate-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.navigate-btn:active {
  transform: scale(0.98);
}

.services-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.service-item {
  background: #f5f7fa;
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 13px;
  color: #666;
}

.empty-text {
  color: #999;
  font-size: 14px;
}

.empty-doctors {
  text-align: center;
  padding: 20px;
  color: #999;
}

.doctors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doctor-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.doctor-card.selected {
  background: #e6f7ff;
  border-color: #4facfe;
}

.doctor-avatar {
  font-size: 36px;
}

.doctor-info h4 {
  font-size: 15px;
  margin-bottom: 4px;
  color: #333;
}

.doctor-title {
  font-size: 12px;
  color: #667eea;
  margin-left: 5px;
}

.doctor-info p {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
}

.doctor-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #999;
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

.appointment-btn {
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

.appointment-btn:active {
  transform: scale(0.98);
}

/* ===== 导航浮层 ===== */
.nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
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
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
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

/* 导航地图容器：占满浮层剩余空间 */
.nav-map-container {
  flex: 1;
  width: 100%;
  min-height: 300px;
  background: #e8eef5;
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
  color: #666;
  font-size: 14px;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.85);
  padding: 20px;
  margin: 0 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav-error-tip {
  pointer-events: auto;
}

.nav-error-tip p {
  margin: 0 0 8px;
  color: #ff4d4f;
}

.nav-spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 12px;
  border: 3px solid #e0e0e0;
  border-top-color: #4facfe;
  border-radius: 50%;
  animation: nav-spin 0.8s linear infinite;
}

@keyframes nav-spin {
  to { transform: rotate(360deg); }
}

.nav-fallback-btn {
  margin-top: 12px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
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
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.nav-info-bar span {
  white-space: nowrap;
}
</style>
