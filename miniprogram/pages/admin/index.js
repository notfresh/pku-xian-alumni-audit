Page({
  data: {
    applications: [],
    tabs: ['待审核', '已通过', '已拒绝'],
    activeTab: 0,
    currentComment: '',
    isLoggedIn: false,
    showPasswordDialog: false,
    password: '',
    showChangePasswordDialog: false,
    newPassword: '',
    showPassword: false,
    showNewPassword: false,
    pageSize: 10,  // 每页显示数量
    currentPage: 0,  // 当前页码
    hasMore: true   // 是否还有更多数据
  },

  async onLoad() {
    // 初始化管理员密码
    try {
      const result = await wx.cloud.callFunction({
        name: 'initAdminPassword'
      })
      console.log('初始化密码结果：', result)  // 添加日志
    } catch (err) {
      console.error('初始化密码失败', err)
    }

    // 检查登录状态
    const isLoggedIn = wx.getStorageSync('adminLoggedIn')
    if (!isLoggedIn) {
      this.setData({ showPasswordDialog: true })
    } else {
      this.setData({ isLoggedIn: true })
      this.loadApplications()
    }
  },

  // 加载申请列表
  async loadApplications(isRefresh = true) {
    if (isRefresh) {
      this.setData({ 
        currentPage: 0,
        applications: [],
        hasMore: true
      })
    }

    if (!this.data.hasMore) return

    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      const status = ['pending', 'approved', 'rejected'][this.data.activeTab]
      
      const { data } = await db.collection('alumni')
        .where({ status: status })
        .orderBy('createTime', 'desc')
        .skip(this.data.currentPage * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()

      this.setData({
        applications: [...this.data.applications, ...data],
        currentPage: this.data.currentPage + 1,
        hasMore: data.length === this.data.pageSize
      })
    } catch (err) {
      console.error('加载申请列表失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
    wx.hideLoading()
  },

  // 切换标签
  handleTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ activeTab: index }, () => {
      this.loadApplications(true)  // true 表示刷新列表
    })
  },

  // 处理审核意见输入
  handleCommentInput(e) {
    this.setData({
      currentComment: e.detail.value
    })
  },

  // 处理审批
  async handleApprove(e) {
    const { id } = e.currentTarget.dataset
    await this.updateApplicationStatus(id, 'approved')
  },

  // 处理拒绝
  async handleReject(e) {
    const { id } = e.currentTarget.dataset
    await this.updateApplicationStatus(id, 'rejected')
  },

  // 更新申请状态
  async updateApplicationStatus(id, status) {
    wx.showLoading({ title: '处理中...' })
    try {
      const result = await wx.cloud.callFunction({
        name: 'updateApplicationStatus',
        data: { 
          id, 
          status,
          ...(this.data.currentComment ? { comment: this.data.currentComment } : {})
        }
      })

      if (result.result.success) {
        wx.showToast({
          title: '操作成功',
          icon: 'success'
        })
        // 清空审核意见
        this.setData({ currentComment: '' })
        // 重新加载列表
        this.loadApplications()
      } else {
        wx.showToast({
          title: result.result.error || '操作失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('更新状态失败', err)
      wx.showToast({
        title: '系统错误',
        icon: 'none'
      })
    }
    wx.hideLoading()
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: [url],
      current: url
    })
  },

  // ���制微信号
  copyWechat(e) {
    const wechat = e.currentTarget.dataset.wechat
    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({
          title: '微信号已复制',
          icon: 'success',
          duration: 1500
        })
      }
    })
  },

  // 处理密码输入
  handlePasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 处理新密码输入
  handleNewPasswordInput(e) {
    this.setData({
      newPassword: e.detail.value
    })
  },

  // 验证密码
  async verifyPassword() {
    if (!this.data.password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return
    }

    try {
      const db = wx.cloud.database()
      
      wx.cloud.callFunction({
        name: 'getAdminConfig',
        success: res => {
          if (res.result.success) {
            const data = res.result.data
            console.log("@Log line180 res ", res)
            if (data.length > 0 && data[0].value === this.data.password) {
              this.setData({ 
                isLoggedIn: true,
                showPasswordDialog: false,
                password: ''
              })
              wx.setStorageSync('adminLoggedIn', true)
              this.loadApplications()
            } else {
              wx.showToast({
                title: '密码错误',
                icon: 'none'
              })
            }
          } else {
            console.error('查询失败:', res.result.error)
          }
        },
        fail: err => {
          console.error('调用云函数失败:', err)
        }
      })
    } catch (err) {
      console.error('验证密码失败', err)
      wx.showToast({
        title: '系统错误',
        icon: 'none'
      })
    }
  },

  // 显示修改密码对话框
  showChangePassword() {
    this.setData({ showChangePasswordDialog: true })
  },

  // 修改密码
  async changePassword() {
    if (!this.data.newPassword) {
      wx.showToast({
        title: '请输入新密码',
        icon: 'none'
      })
      return
    }

    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('admin_config').where({
        type2: 'password'
      }).get()

      if (data.length > 0) {
        // 更新现有密码
        await db.collection('admin_config').doc(data[0]._id).update({
          data: {
            value: this.data.newPassword
          }
        })
      } else {
        // 创建新密码记录
        await db.collection('admin_config').add({
          data: {
            type2: 'password',
            value: this.data.newPassword
          }
        })
      }

      this.setData({ 
        showChangePasswordDialog: false,
        newPassword: ''
      })
      wx.showToast({
        title: '密码已更新',
        icon: 'success'
      })
    } catch (err) {
      console.error('修改密码失败', err)
      wx.showToast({
        title: '系统错误',
        icon: 'none'
      })
    }
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('adminLoggedIn')
    // 直接返回上一页（主界面）
    wx.navigateBack({
      delta: 1
    })
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  // 切换新密码可见性
  toggleNewPasswordVisibility() {
    this.setData({
      showNewPassword: !this.data.showNewPassword
    })
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadApplications(false)  // false 表示加载更多
    }
  }
}) 