import request from './request'

// 获取预约列表
export function getAppointmentList(params) {
  return request({
    url: '/appointment/list',
    method: 'get',
    params
  })
}

// 获取预约详情
export function getAppointmentDetail(id) {
  return request({
    url: `/appointment/${id}`,
    method: 'get'
  })
}

// 创建预约
export function createAppointment(data) {
  return request({
    url: '/appointment',
    method: 'post',
    data
  })
}

// 取消预约
export function cancelAppointment(id) {
  return request({
    url: `/appointment/${id}/cancel`,
    method: 'put'
  })
}

// 改期预约
export function rescheduleAppointment(id, data) {
  return request({
    url: `/appointment/${id}/reschedule`,
    method: 'put',
    data
  })
}

// 评价预约
export function reviewAppointment(id, data) {
  return request({
    url: `/appointment/${id}/review`,
    method: 'post',
    data
  })
}

// 获取可预约时段
export function getAvailableSlots(params) {
  return request({
    url: '/appointment/slots',
    method: 'get',
    params
  })
}