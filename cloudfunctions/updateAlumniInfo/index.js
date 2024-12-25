// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { 
    name,          // 姓名
    college,       // 学院
    graduationYear,// 毕业年份
    graduationMonth,// 毕业月份
    major,         // 专业
    gender,        // 性别
    wechat,        // 微信号
    workplace,     // 工作单位（新增）
    photoFileID,   // 个人照片云存储ID
    diplomaFileID, // 毕业证照片云存储ID
    idCardFileID   // 身份证照片云存储ID（新增）
  } = event

  try {
    // 检查所有必填字段
    const missingFields = []
    if (!name) missingFields.push('姓名')
    if (!college) missingFields.push('学院')
    if (!graduationYear) missingFields.push('毕业年份')
    if (!graduationMonth) missingFields.push('毕业月份')
    if (!major) missingFields.push('专业')
    if (!gender) missingFields.push('性别')
    if (!wechat) missingFields.push('微信号')
    if (!workplace) missingFields.push('工作单位')
    if (!photoFileID) missingFields.push('个人照片')
    if (!diplomaFileID) missingFields.push('毕业证照片')
    if (!idCardFileID) missingFields.push('身份证照片')

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `请填写：${missingFields.join('、')}`
      }
    }

    // 获取用户最新的申请记录
    const records = await db.collection('alumni').where({
      _openid: wxContext.OPENID
    }).orderBy('createTime', 'desc').limit(1).get()

    if (!records.data.length) {
      return {
        success: false,
        error: '未找到原始申请记录'
      }
    }

    const oldRecord = records.data[0]

    // 检查是否有实际修改
    const hasChanges = 
      name !== oldRecord.name ||
      college !== oldRecord.college ||
      graduationYear !== oldRecord.graduationYear ||
      graduationMonth !== oldRecord.graduationMonth ||
      major !== oldRecord.major ||
      gender !== oldRecord.gender ||
      wechat !== oldRecord.wechat ||
      workplace !== oldRecord.workplace ||  // 新增
      photoFileID !== oldRecord.photoFileID ||
      diplomaFileID !== oldRecord.diplomaFileID ||
      idCardFileID !== oldRecord.idCardFileID  // 新增

    if (!hasChanges) {
      return {
        success: false,
        error: '信息未发生变化，无需更新'
      }
    }

    // 更新校友信息
    const result = await db.collection('alumni').doc(oldRecord._id).update({
      data: {
        name,
        college,
        graduationYear,
        graduationMonth,
        major,
        gender,
        wechat,
        workplace,     // 新增
        photoFileID,
        diplomaFileID,
        idCardFileID,  // 新增
        updateTime: db.serverDate(),  // 添加更新时间
        status: 'pending',    // 更新后重新设置为待审核状态
        isSubmitted: true     // 添加提交状态
      }
    })

    return {
      success: true,
      data: result._id
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: '系统错误，请稍后重试'
    }
  }
} 