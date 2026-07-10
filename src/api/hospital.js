import request from './request'

// 获取医院列表
export function getHospitalList(params) {
  return request({
    url: '/hospital/list',
    method: 'get',
    params
  })
}

// 获取医院详情
export function getHospitalDetail(id) {
  return request({
    url: `/hospital/${id}`,
    method: 'get'
  })
}

// 获取附近医院
export function getNearbyHospals(params) {
  return request({
    url: '/hospital/nearby',
    method: 'get',
    params
  })
}

// 搜索医院
export function searchHospitals(params) {
  return request({
    url: '/hospital/search',
    method: 'get',
    params
  })
}

// 获取医院医生列表
export function getHospitalDoctors(hospitalId) {
  return request({
    url: `/hospital/${hospitalId}/doctors`,
    method: 'get'
  })
}

// 获取医生详情
export function getDoctorDetail(doctorId) {
  return request({
    url: `/doctor/${doctorId}`,
    method: 'get'
  })
}

// 获取医生排班
export function getDoctorSchedule(doctorId, params) {
  return request({
    url: `/doctor/${doctorId}/schedule`,
    method: 'get',
    params
  })
}