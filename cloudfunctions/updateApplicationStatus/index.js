// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { 
    id, 
    status,  // 'approved' 或 'rejected'
    comment = ''  // 审核意见
  } = event

  try {
    // 检查记录是否存在
    const record = await db.collection('alumni').doc(id).get()
    if (!record.data) {
      return {
        success: false,
        error: '记录不存在'
      }
    }

    // 更新状态
    const result = await db.collection('alumni').doc(id).update({
      data: {
        status: status,
        reviewTime: db.serverDate(),  // 审核时间
        reviewBy: wxContext.OPENID,   // 审核人
        ...(comment ? { reviewComment: comment } : {}),  // 只有当有审核意见时才添加这个字段
        updateTime: db.serverDate()
      }
    })

    // 记录审核日志
    await db.collection('audit_logs').add({
      data: {
        alumniId: id,
        operation: status,
        operatorId: wxContext.OPENID,
        ...(comment ? { comment } : {}),  // 只有当有审核意见时才添加这个字段
        createTime: db.serverDate(),
        oldStatus: record.data.status,
        alumniName: record.data.name,
        alumniWechat: record.data.wechat
      }
    })

    // 发送审核结果通知
    const defaultMessage = status === 'approved' ? '恭喜您通过审核' : '很抱歉未能通过审核'
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: record.data._openid,
        templateId: 'YOUR_TEMPLATE_ID',
        page: 'pages/index/index',
        data: {
          thing1: { value: status === 'approved' ? '审核通过' : '审核未通过' },
          time2: { value: new Date().toLocaleString('zh-CN', { hour12: false }) },
          thing3: { value: comment || defaultMessage }  // 如果没有审核意见则使用默认消息
        }
      })
    } catch (err) {
      console.error('发送通知失败：', err)
    }

    return {
      success: true,
      data: result
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: '系统错误，请稍后重试'
    }
  }
} 