const { envList } = require("../../envList");
const { QuickStartPoints, QuickStartSteps } = require("./constants");

Page({
  data: {
    logoUrl: '../../images/pku-logo.png',
    clickCount: 0,
    lastClickTime: 0
  },
  async onLoad(){
  },

  handleRegister() {
    wx.navigateTo({
      url: '/pages/register/index'
    })
  },

  // 处理logo点击
  handleLogoClick() {
    const currentTime = new Date().getTime()
    
    // 如果距离上次点击超过2秒，重置计数
    if (currentTime - this.data.lastClickTime > 2000) {
      this.setData({
        clickCount: 1,
        lastClickTime: currentTime
      })
      return
    }

    // 累加点击次数
    this.setData({
      clickCount: this.data.clickCount + 1,
      lastClickTime: currentTime
    })

    // 检查是否达到进入管理员模式的条件
    if (this.data.clickCount >= 6) {
      wx.navigateTo({
        url: '/pages/admin/index'
      })
      // 重置点击计数
      this.setData({
        clickCount: 0
      })
    }
  }
});
