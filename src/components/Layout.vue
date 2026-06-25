<template>
  <div class="layout">
    <header class="header">
      <div class="header-content">
        <button v-if="showBack" class="back-btn" @click="goBack">
          <span>&lt;</span>
        </button>
        <h1 class="title">{{ pageTitle }}</h1>
        <div class="header-right">
          <button v-if="isLoggedIn" class="logout-btn" @click="handleLogout">退出</button>
        </div>
      </div>
    </header>
    
    <main class="main-content" :class="{ 'with-tabbar': showTabBar }">
      <router-view />
    </main>
    
    <nav v-if="showTabBar" class="tabbar">
      <router-link 
        v-for="item in tabItems" 
        :key="item.path"
        :to="item.path"
        class="tabbar-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="tabbar-icon">{{ item.icon }}</span>
        <span class="tabbar-text">{{ item.name }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabItems = [
  { name: '首页', path: '/home', icon: '🏠' },
  { name: '医院', path: '/hospitals', icon: '🏥' },
  { name: '宠物', path: '/pets', icon: '🐾' },
  { name: '预约', path: '/appointments', icon: '📅' }
]

const isLoggedIn = computed(() => !!localStorage.getItem('token'))
const showTabBar = computed(() => route.meta.showTabBar)
const showBack = computed(() => !route.meta.showTabBar && route.path !== '/home')
const pageTitle = computed(() => route.meta.title || '宠物医疗预约系统')

const isActive = (path) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const goBack = () => {
  router.back()
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  router.push('/login')
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 15px;
}

.back-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 5px 10px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  text-align: center;
}

.header-right {
  width: 60px;
  text-align: right;
}

.logout-btn {
  background: none;
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  padding: 5px 10px;
}

.main-content {
  flex: 1;
  margin-top: 50px;
  padding: 15px;
  overflow-y: auto;
}

.main-content.with-tabbar {
  padding-bottom: 70px;
}

.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #999;
  padding: 5px 15px;
  transition: color 0.3s;
}

.tabbar-item.active {
  color: #4facfe;
}

.tabbar-icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.tabbar-text {
  font-size: 12px;
}
</style>