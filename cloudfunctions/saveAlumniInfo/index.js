// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { 
    name,          // 姓名
    college,        // 学院
    graduationYear, // 毕业年份
    graduationMonth,// 毕业月份
    major,         // 专业
    gender,        // 性别
    wechat,        // 微信号
    workplace,     // 工作单位
    photoFileID,   // 个人照片云存储ID
    diplomaFileID, // 毕业证照片云存储ID
    idCardFileID  // 身份证照片云存储ID
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

    // 检查是否已经提交过申请
    const existingRecord = await db.collection('alumni').where({
      _openid: wxContext.OPENID,
      status: db.command.in(['pending', 'approved'])  // 使用 in 操作符查询多个状态
    }).get()

    if (existingRecord.data.length > 0) {
      return {
        success: false,
        error: '您已提交过申请，请勿重复提交'
      }
    }

    // 保存校友信息
    const result = await db.collection('alumni').add({
      data: {
        name,         // 添加姓名字段
        college,
        graduationYear,
        graduationMonth,
        major,
        gender,
        wechat,
        workplace,
        photoFileID,
        diplomaFileID,
        idCardFileID,
        status: 'pending',    // 审核状态：pending-待审核，approved-已通过，rejected-已拒绝
        isSubmitted: true,  // 添加提交状态
        createTime: db.serverDate(),
        submitTime: new Date().toLocaleString('zh-CN', { hour12: false }),
        _openid: wxContext.OPENID,
        unionid: wxContext.UNIONID,
        submitIP: event.userIP || '',
        appid: wxContext.APPID
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