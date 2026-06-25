import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/hospitals',
    name: 'Hospitals',
    component: () => import('../views/Hospitals.vue')
  },
  {
    path: '/hospitals/:id',
    name: 'HospitalDetail',
    component: () => import('../views/HospitalDetail.vue')
  },
  {
    path: '/pets',
    name: 'Pets',
    component: () => import('../views/Pets.vue')
  },
  {
    path: '/pets/add',
    name: 'AddPet',
    component: () => import('../views/AddPet.vue')
  },
  {
    path: '/pets/:id',
    name: 'PetDetail',
    component: () => import('../views/PetDetail.vue')
  },
  {
    path: '/pets/:id/edit',
    name: 'EditPet',
    component: () => import('../views/AddPet.vue')
  },
  {
    path: '/appointments',
    name: 'Appointments',
    component: () => import('../views/Appointments.vue')
  },
  {
    path: '/appointments/:id',
    name: 'AppointmentDetail',
    component: () => import('../views/AppointmentDetail.vue')
  },
  {
    path: '/appointments/create/:hospitalId',
    name: 'CreateAppointment',
    component: () => import('../views/CreateAppointment.vue')
  },
  // 商家端路由
  {
    path: '/merchant/login',
    name: 'MerchantLogin',
    component: () => import('../views/merchant/MerchantLogin.vue')
  },
  {
    path: '/merchant/register',
    name: 'MerchantRegister',
    component: () => import('../views/merchant/MerchantRegister.vue')
  },
  {
    path: '/merchant',
    name: 'MerchantHome',
    component: () => import('../views/merchant/MerchantHome.vue')
  },
  // 管理员后台路由
  {
    path: '/admin',
    name: 'AdminHome',
    component: () => import('../views/merchant/AdminHome.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  // 商家路由：需要商家 token（注册页除外）
  if (to.path.startsWith('/merchant') && to.path !== '/merchant/login' && to.path !== '/merchant/register') {
    const merchantToken = localStorage.getItem('merchantToken')
    if (!merchantToken) {
      next('/merchant/login')
      return
    }
  }
  // 管理员路由：需要管理员 token
  if (to.path.startsWith('/admin')) {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!token || user.role !== 'admin') {
      next('/login')
      return
    }
  }
  // 用户路由：需要用户 token（排除登录/注册/商家入口/管理员入口）
  if (to.path !== '/login' && to.path !== '/register' &&
      !to.path.startsWith('/merchant') && !to.path.startsWith('/admin') && !localStorage.getItem('token')) {
    next('/login')
  } else {
    next()
  }
})

export default router
