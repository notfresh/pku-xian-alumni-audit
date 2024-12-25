Page({
  data: {
    years: [],
    yearIndex: -1,
    months: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    monthIndex: -1,
    isSubmitted: false,
    isApproved: false,
    isEditing: true,
    formData: {},
  },

  async onLoad() {
    // 生成年份数组
    const years = []
    for (let year = 2024; year >= 1950; year--) {
      years.push(year)
    }
    this.setData({ years })

    try {
      const submission = wx.getStorageSync('alumniSubmission')
      if (submission) {
        this.setData({
          formData: submission,
          yearIndex: this.data.years.indexOf(submission.graduationYear),
          monthIndex: this.data.months.indexOf(submission.graduationMonth),
        })
      }
      console.log("@Log Line30 submission is ",submission,  " month index is   ", this.data.monthIndex)
    } catch (err) {
      console.error('读取本地存储失败', err)
    }
    
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('alumni').where({
        _openid: '{openid}'
      }).orderBy('createTime', 'desc').limit(1).get()

      if (data && data.length > 0) {
        const submission = data[0]
        this.setData({
          formData: submission,
          isSubmitted: submission.isSubmitted || false,  // 从服务器读取提交状态
        })
        if(submission.status === "approved"){
          this.setData({
            isEditing: false
          })
        }

        // 保存到本地存储
        try {
          wx.setStorageSync('alumniSubmission', {
            ...submission,
            isSubmitted: submission.isSubmitted || false
          })
        } catch (err) {
          console.error('保存到本地存储失败', err)
        }

        if (submission.status === 'approved') {
          wx.showToast({
            title: '信息已审核通过，无法修改',
            icon: 'none',
            duration: 2000
          })
        }
      }
      wx.hideLoading()
    } catch (err) {
      console.error('加载远程数据失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      wx.hideLoading()
    }
  },

  // 处理输入框变化
  handleInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    console.log(`Updating ${field} to:`, value)  // 添加日志
    this.setData({
      [`formData.${field}`]: value
    })
    try {
      wx.setStorageSync('alumniSubmission', this.data.formData)
    } catch (err) {
      console.error('保存到本地存储失败', err)
    }
  },

  // 处理性别变化
  handleGenderChange(e) {
    if (this.data.isEditing) {
      this.setData({
        'formData.gender': e.detail.value
      })
      try {
        wx.setStorageSync('alumniSubmission', this.data.formData)
      } catch (err) {
        console.error('保存到本地存储失败', err)
      }
    }
  },

  // 处理年份变化
  handleYearChange(e) {
    const yearIndex = e.detail.value
    if (this.data.isEditing) {
      this.setData({
        yearIndex,
        'formData.graduationYear': this.data.years[yearIndex],
        'formData.graduationYearIndex': yearIndex
      })
      try {
        wx.setStorageSync('alumniSubmission', this.data.formData)
      } catch (err) {
        console.error('保存到本地存储失败', err)
      }
    }
  },

  // 处理月份变化
  handleMonthChange(e) {
    const monthIndex = e.detail.value
    if (this.data.isEditing) {
      this.setData({
        monthIndex,
        'formData.graduationMonth': this.data.months[monthIndex],
        'formData.graduationMonthIndex': monthIndex
      })
      try {
        wx.setStorageSync('alumniSubmission', this.data.formData)
      } catch (err) {
        console.error('保存到本地存储失败', err)
      }
    }
  },

  // 保存按钮处理函数
  async handleSave() {
    try {
      wx.showLoading({ title: '保存中...' })

      // 调用云函数更新数据
      const result = await wx.cloud.callFunction({
        name: 'updateAlumniInfo',
        data: {
          ...this.data.formData,
          graduationYearIndex: this.data.yearIndex,
          graduationMonthIndex: this.data.monthIndex,
          isSubmitted: true
        }
      })

      if (result.result.success) {
        this.setData({
          isEditing: false,
          isSubmitted: true
        })

        // 保存到本地存储
        try {
          wx.setStorageSync('alumniSubmission', this.data.formData)
        } catch (err) {
          console.error('保存到本地存储失败', err)
        }

        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.result.error || '保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('保存失败', err)
      wx.showToast({
        title: '系统错误，请稍后重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 修改照片上传函数
  async choosePhoto() {
    if (this.data.isEditing) {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const filePath = res.tempFilePaths[0]
          wx.showLoading({ title: '上传中...' })
          try {
            const fileID = await this.uploadFile(filePath)
            this.setData({
              'formData.photoFileID': fileID
            })
            wx.hideLoading()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        }
      })
    } 
  },

  // 上传毕业证照片
  async chooseDiploma() {
    if (this.data.isEditing) {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const filePath = res.tempFilePaths[0]
          wx.showLoading({ title: '上传中...' })
          try {
            const fileID = await this.uploadFile(filePath)
            this.setData({
              'formData.diplomaFileID': fileID
            })
            wx.hideLoading()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        }
      })
    }
  },

  // 上传身份证照片
  async chooseIdCard() {
    if (this.data.isEditing) {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const filePath = res.tempFilePaths[0]
          wx.showLoading({ title: '上传中...' })
          try {
            const fileID = await this.uploadFile(filePath)
            this.setData({
              'formData.idCardFileID': fileID
            })
            wx.hideLoading()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        }
      })
    }
  },

  // 上传文件到云存储
  async uploadFile(filePath) {
    const cloudPath = `alumni/${Date.now()}-${Math.random().toString(36).slice(-6)}.${filePath.match(/\.(\w+)$/)[1]}`
    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
    return res.fileID
  },

  // 提交函数
  async handleSubmit(e) {
    // 检查是否已审核通过
    if (this.data.formData.status === 'approved') {
      wx.showToast({
        title: '信息已审核通过，无法修改',
        icon: 'none'
      })
      return
    }

    try {
      // 检查所有必填字段
      const missingFields = []
      if (!this.data.formData.name) missingFields.push('姓名')
      if (!this.data.formData.college) missingFields.push('学院')
      if (!this.data.formData.major) missingFields.push('专业')
      if (!this.data.formData.gender) missingFields.push('性别')
      if (!this.data.formData.wechat) missingFields.push('微信号')
      if (!this.data.formData.workplace) missingFields.push('工作单位')
      if (!this.data.formData.photoFileID) missingFields.push('个人照片')
      if (!this.data.formData.diplomaFileID) missingFields.push('毕业证照片')
      if (!this.data.formData.idCardFileID) missingFields.push('身份证照片')
      if (this.data.yearIndex === -1 || this.data.monthIndex === -1) missingFields.push('毕业时间')
      
      console.log("@Log Line477 sumit data is ", this.data.formData)

      if (missingFields.length > 0) {
        wx.showToast({
          title: `请填写：${missingFields.join('、')}`,
          icon: 'none',
          duration: 2000
        })
        return
      }

      wx.showLoading({ title: '提交中...' })

      const result = await wx.cloud.callFunction({
        name: 'saveAlumniInfo',
        data: {
          ...this.data.formData,
          graduationYear: this.data.years[this.data.yearIndex],
          graduationMonth: this.data.months[this.data.monthIndex]
        }
      })

      if (result.result.success) {
        this.setData({
          isSubmitted: true,
          isEditing: false
        })
        
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.result.error || '提交失败',
          icon: 'none'
        })
      }

    } catch (err) {
      console.error(err)
      wx.showToast({
        title: '系统错误，请稍后重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 修改按钮处理函数
  handleEdit() {
    // 检查是否已审核通过
    if (this.data.formData.status === 'approved') {
      wx.showToast({
        title: '信息已审核通过，无法修改',
        icon: 'none'
      })
      return
    }

    this.setData({
      isEditing: true
    })
  },

  // 再次提交按钮处理函数
  handleResubmit() {
    // 检查是否已审核通过
    if (this.data.formData.status === 'approved') {
      wx.showToast({
        title: '信息已审核通过，无法修改',
        icon: 'none'
      })
      return
    }

    this.setData({
      isEditing: false
    })

    // 直接调用提交函数
    this.handleSubmit()
  }
})
