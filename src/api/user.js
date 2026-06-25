import request from './request'

// 用户登录（账号密码）
export function login(data) {
  return request({
    url: '/user/login',
    method: 'post',
    data
  })
}

// 用户登录（验证码）
export function loginWithCode(data) {
  return request({
    url: '/user/login/code',
    method: 'post',
    data
  })
}

// 发送验证码
export function sendCode(phone) {
  return request({
    url: '/user/send-code',
    method: 'post',
    data: { phone }
  })
}

// 用户注册
export function register(data) {
  return request({
    url: '/user/register',
    method: 'post',
    data
  })
}

// 获取用户信息
export function getUserInfo() {
  return request({
    url: '/user/info',
    method: 'get'
  })
}

// 更新用户信息
export function updateUserInfo(data) {
  return request({
    url: '/user/info',
    method: 'put',
    data
  })
}

// 修改密码
export function changePassword(data) {
  return request({
    url: '/user/password',
    method: 'put',
    data
  })
}

// 退出登录
export function logout() {
  return request({
    url: '/user/logout',
    method: 'post'
  })
}