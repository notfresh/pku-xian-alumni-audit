// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 检查是否已存在密码
    const { data } = await db.collection('admin_config').where({
      type2: 'password2'
    }).get()

    if (data.length === 0) {
      // 如果不存在，创建初始密码
      await db.collection('admin_config').add({
        data: {
          type2: 'password2',
          value: '20241221'  // 设置初始密码
        }
      })
      return {
        success: true,
        message: '初始密码设置成功'
      }
    }

    return {
      success: true,
      message: '密码已存在，无需初始化'
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: '初始化密码失败'
    }
  }
} 