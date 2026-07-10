import request from './request'

// 获取宠物列表
export function getPetList() {
  return request({
    url: '/pet/list',
    method: 'get'
  })
}

// 获取宠物详情
export function getPetDetail(id) {
  return request({
    url: `/pet/${id}`,
    method: 'get'
  })
}

// 添加宠物
export function addPet(data) {
  return request({
    url: '/pet',
    method: 'post',
    data
  })
}

// 更新宠物信息
export function updatePet(data) {
  return request({
    url: '/pet',
    method: 'put',
    data
  })
}

// 删除宠物
export function deletePet(id) {
  return request({
    url: `/pet/${id}`,
    method: 'delete'
  })
}

// 获取宠物医疗记录
export function getPetMedicalRecords(petId) {
  return request({
    url: `/pet/${petId}/records`,
    method: 'get'
  })
}