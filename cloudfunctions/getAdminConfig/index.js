// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 获取数据库引用
const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 查询admin_config集合
    const result = await db.collection('admin_config').where({
      type2: 'password2'
    }).get()
    console.log("@Log cloudFunction getAdminConfig Line15 ")
    console.log('查询结果:', result.data)  // 添加日志查看查询结果

    if (result.data.length > 0) {
      return {
        success: true,
        data: result.data
      }
    } else {
      return {
        success: false,
        error: '没有找到匹配的记录'
      }
    }
  } catch (error) {
    console.error('查询失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}