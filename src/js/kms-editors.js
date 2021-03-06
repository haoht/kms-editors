(function($w) {
  var __NAME__ = 'kmseditors'
  var _noop = function() {}
  var __INIT_ZOOM__ = ''
  var logger = (typeof console === 'undefined') ? {
    log: _noop,
    debug: _noop,
    error: _noop,
    warn: _noop,
    info: _noop
  } : console

  if (!logger.debug) logger.debug = _noop

  if (typeof module === 'undefined' || !module.exports) {
    if (typeof $w[__NAME__] !== 'undefined') {
      logger.error(__NAME__ + '已经存在啦啦啦啦~')
      return
    }
  }

  var $contextmenu = '' // 右键菜单ele
  var $currSketch = '' // 当前操作的锚点元素(弹出了右键菜单)

  var kmseditors = { options: {}, isInit: false, $container: '', $position: '' }

  // 初始化函数
  kmseditors.init = function(options) {
    var errMsg = ''
    // console.log('init:', options)
    if (!options || Object.keys(options).length === 0) {
      logger.warn('请对' + __NAME__ + '.init()传入必要的参数')
      return
    }

    if (this.isInit) return

    if (!options.container) return logger.warn('container 不能为空')

    this.isInit = true
    this.$container = $('#' + options.container)
    this.options = options

    if (!options.debug) {
      window.console = {
        log: _noop,
        debug: _noop,
        error: _noop,
        warn: _noop,
        info: _noop
      }
    }

    _initElement()

    var tElement = setInterval(function() {
      if ($(kmseditors.$container).find('.kmseditors').length === 0) return

      clearInterval(tElement)

      if (kmseditors.options.editable) _bind_map_event()

      // 如果有传入图片 则跑初始化函数
      var data = options.data
      if (data) {
        var bgUrl = data.backgroundUrl
        var sketchList = data.sketchList

        if (bgUrl) {
          _hideTips()
          _initPositionConrainer(bgUrl)

          var tSketch = setInterval(function() {
            if (kmseditors.$position.length === 0) return

            clearInterval(tSketch)

            var sLen = sketchList.length
            if (sLen > 0) {
              for (var i = 0; i < sLen; i++) {
                var item = sketchList[i]
                _sketchHandle(item)
              }
            }
          }, 10)


          // 计算编辑器容器与图片的缩放比例
          // 如果图片的宽大于容器的宽，则需要设置zoom比例
          var conWidth = 0
          var imgWidth = 0

          var tZoom = setInterval(function() {
            if (conWidth > 0 && imgWidth > 0) {
              clearInterval(tZoom)
              var zoom = 1
              if (imgWidth > conWidth) zoom = conWidth / imgWidth
              kmseditors.setZoom(zoom)
            } else {
              conWidth = $(kmseditors.$container).width()
              imgWidth = $(kmseditors.$container).find('img[ref=imageMaps]').width()
            }
          }, 10)
        }
      }

      // if (!options.editable) setTimeout(_unEditable, 150) // 处理非编辑模式
      if (!options.editable) _unEditable()

    }, 10)

  }

  // 获取当前视图的数据
  // node 传入则获取具体的一个
  kmseditors.getData = function(node) {
    var dataObj = {
      backgroundUrl: '',
      sketchList: []
    }

    function _objHandle(item) {
      var context = item.context
      var width = typeof item.width === 'number' ? item.width : context.offsetWidth
      var height = typeof item.height === 'number' ? item.height : context.offsetHeight
      return {
        ref: item.attr('ref'),
        top: item.top || context.offsetTop,
        left: item.left || context.offsetLeft,
        width: width,
        height: height
      }
    }

    // 获取背景图片的url
    var $images = $(kmseditors.$container).find('img[ref=imageMaps]')
    if ($images.length > 0) dataObj.backgroundUrl = $images.attr('src')

    // 获取具体的node的数据
    if (typeof node !== 'undefined') {
      dataObj.sketchList = _objHandle(node)
      return dataObj
    }

    // 获取所有node的数据集合
    var $p = this.$position

    if (!$p) return dataObj

    var $arr = $p.find('.map-position[ref]')
    if ($arr.length <= 0) return dataObj

    var arr = []
    for (var i = 0; i < $arr.length; i++) {
      var item = $arr[i]
      arr.push(_objHandle($(item)))
    }

    dataObj.sketchList = arr
    return dataObj
  }

  // 初始化编辑器元素 
  function _initElement() {
    var htmlStr = '<div class="kmseditors"><div id="kmseditors-title" class="kmseditors-title"><div id="kmseditors-fullscreen" class="kmseditors-title-btngroup"><div class="kmseditors-title-btngroup-icon b1"></div><p>全屏</p></div><div id="kmseditors-exitfullscreen" class="kmseditors-title-btngroup"><div class="kmseditors-title-btngroup-icon b5"></div><p>退出全屏</p></div><div id="kmseditors-sketch" class="kmseditors-title-btngroup"><div class="kmseditors-title-btngroup-icon b2"></div><p>热点</p></div><div id="kmseditors-uploadimg" class="kmseditors-title-btngroup"><div class="kmseditors-title-btngroup-icon b4"></div><p>上传图片</p></div></div><div id="kmseditors-contant"><div id="kmseditors-contant-tips"><p>地图绘制操作指引</p><p>第一步：点击上传图片，上传制作好的地图背景</p><p>第二步：根据需求，添加热点加上关联信息</p><p>第三步：绘制完成后，点击完成，填写基本信息即可</p></div><div id="kmseditors-contextmenu"><div id="kmseditors-contextmenu-relation" class="kmseditors-contextmenu-group c1"></div><div id="kmseditors-contextmenu-color" class="kmseditors-contextmenu-group c2"></div><div id="kmseditors-contextmenu-edit" class="kmseditors-contextmenu-group c3"></div><div id="kmseditors-contextmenu-delete" class="kmseditors-contextmenu-group c4"></div></div></div></div>'

    // 初始化各种按钮绑定
    $(function() {
      // 啦啦啦啦啦啦啦啦啦
      $(kmseditors.$container).append(htmlStr)

      _initSidebar()

      // 非编辑模式下，内容区域居中
      if (!kmseditors.options.editable) {
        $(kmseditors.$container).css({
          'text-align': 'center'
        })
      }

      // 内容编辑区点击隐藏提示文字
      $('#kmseditors-contant').on('click', _hideTips)

      // 退出全屏按钮
      var $exitfullscreenbtn = $('#kmseditors-exitfullscreen')
      $exitfullscreenbtn.hide() // 隐藏退出全屏按钮

      // 全屏按钮
      var $fullscreenbtn = $('#kmseditors-fullscreen')

      if (_checkFullScreen() === false) {
        $fullscreenbtn.hide()
      } else {
        // 退出全屏按钮点击处理
        $exitfullscreenbtn.on('click', function() {
          _hideTips()
          _cancelFullScreen()
          $exitfullscreenbtn.hide()
          $fullscreenbtn.show()
        })
        // 全屏按钮点击处理
        $fullscreenbtn.on('click', function() {
          _hideTips()
          _launchFullScreen()
          $fullscreenbtn.hide()
          $exitfullscreenbtn.show()
        })
      }

      // 锚点按钮点击处理
      var $sketchbtn = $('#kmseditors-sketch')
      $sketchbtn.on('click', function(event) {
        // 注意这里不要简写
        // 免得_sketchHandle接收时把even当作了需要入参的obj，免除不得要的麻烦
        _sketchHandle()
      })

      // 上传图片按钮点击处理
      var $uploadImgBtn = $('#kmseditors-uploadimg')
      $uploadImgBtn.on('click', _hideTips)

      // 初始化上传图片
      _initImgUpload()

      // 把右键菜单隐藏掉
      $contextmenu = $('#kmseditors-contextmenu')
      $($contextmenu).hide()

      if (kmseditors.options.editable) {
        // 右键菜单 - 关联
        $($contextmenu).find('#kmseditors-contextmenu-relation').on('click', _relationHandle)
        // 右键菜单 - 颜色
        $($contextmenu).find('#kmseditors-contextmenu-color').on('click', _colorHandle)
        // 右键菜单 - 编辑
        $($contextmenu).find('#kmseditors-contextmenu-edit').on('click', _editHandle)
        // 右键菜单 - 删除
        $($contextmenu).find('#kmseditors-contextmenu-delete').on('click', _deleteHandle)
      }
    })

  }

  //初始化放大缩小的工具栏
  function _initSidebar() {
    if (kmseditors.options.editable) return

    var sidebar = $('<div id="kmseditors-sidebar"></div>'),
      barhtml = '<ul><li class="lui_icon_s lui_icon_s_icon_repeat mui mui-history_handler_back" title="还原" data-opt="zoomReset"></li>' +
      '<li class="lui_icon_s lui_icon_s_icon_zoom_in mui mui-addition" title="放大" data-opt="zoomIn"></li>' +
      '<li class="lui_icon_s lui_icon_s_icon_zoom_out mui mui-delete" title="缩小" data-opt="zoomOut"></li></ul>'
    $(kmseditors.$container).append(sidebar)
    $(kmseditors.$container).css("position", "relative")
    sidebar.append(barhtml)
    sidebar.on('click', function(evt) {
      var target = $(evt.target),
        opt = target.attr('data-opt')
      if (opt && kmseditors[opt]) {
        kmseditors[opt]()
      }
    })
  }

  // 处理非编辑模式
  function _unEditable() {
    // 非编辑模式下隐藏工具栏
    $(kmseditors.$container).find('#kmseditors-title').hide()

    // 给所有锚点隐藏，加上hover手势
    var tPosition = setInterval(function() {
      if (kmseditors.$position.length === 0) return

      clearInterval(tPosition)

      var sketchList = $(kmseditors.$container).find('div.map-position[dtype="0"]')
      var onRelation = kmseditors.options.onRelation || _noop
      var opacity = kmseditors.options.debug === true ? 1 : 0

      if (!sketchList) return

      for (var i = 0; i < sketchList.length; i++) {
        var $item = $(sketchList[i])
        $item.css({
          'opacity': opacity,
          'cursor': 'pointer'
        }).on('click', function() {
          onRelation(kmseditors.getData($(this)))
        })
      }
    }, 10)
  }


  // 绑定事件处理函数
  function _bind_map_event() {
    var currDom = null
    var currDomType = null
    // 全局监听mousemove
    $(document).on('mousemove', function(event) {
      if (!currDomType) return

      var pageX = event.pageX
      var pageY = event.pageY
      var conrainer = kmseditors.$position

      // console.log('pageY', pageY, '|', 'conrainer.height():', conrainer.height())
      if (pageX > conrainer.width() || pageY - 73 > conrainer.height()) {
        currDom = null
        currDomType = null
        return
      }

      // 没变化 return
      var dx = pageX - $(currDom).data('pageX')
      var dy = pageY - $(currDom).data('pageY')
      // console.log('dx:', dx, ', dy:', dy)
      if ((dx == 0) && (dy == 0)) return false

      var map_position = $(currDom).parent()
      var p = $(map_position).position()
      var pLeft = p.left
      var pTop = p.top


      // 计算元素与当前鼠标XY轴误差大于mistakeNum，则不需要再移动，改变大小了，
      // var mistake = 30
      // // debugger
      // if (Math.abs(pageX - $(currDom).data('pageX')) > mistake || Math.abs(pageY - $(currDom).data('pageY')) > mistake) {
      //   console.log('Math.abs(pageX - $(currDom).data('pageX'))', Math.abs(pageX - $(currDom).data('pageX')))
      //   console.log('Math.abs(pageY - pTop)', Math.abs(pageY - pTop - 73))
      //   currDom = null
      //   currDomType = null
      //   return
      // }


      if (currDomType === 'map-position-bg') { // 锚点内移动
        var left = pLeft + dx

        if (left < 0) left = 0

        var top = pTop + dy

        if (top < 0) top = 0

        var bottom = top + map_position.height()
        if (bottom > conrainer.height()) {
          top = top - (bottom - conrainer.height())
        }

        var right = left + map_position.width()
        if (right > conrainer.width()) {
          left = left - (right - conrainer.width())
        }

        $(map_position).css({
          left: left,
          top: top
        })

        $(currDom).data('pageX', pageX)
        $(currDom).data('pageY', pageY)
      } else if (currDomType === 'resize') { // 改变大小时鼠标移动
        var left = pLeft
        var top = pTop

        var height = map_position.height() + dy
        if ((top + height) > conrainer.height()) {
          height = height - ((top + height) - conrainer.height())
        }

        var width = map_position.width() + dx
        if ((left + width) > conrainer.width()) {
          width = width - ((left + width) - conrainer.width())
        }

        if (height < 30) height = 30
        if (width < 50) width = 50

        $(map_position).css({
          width: width,
          height: height
        })

        $(currDom).data('pageX', pageX)
        $(currDom).data('pageY', pageY)
      }
    })

    // 全局点击事件
    $(document).on('click', '#kmseditors-contant', function(event) {
      event.preventDefault()
      var dom = event.target
      var className = dom.className

      // 锚点点击 -> 显示菜单
      if (className === 'map-position-bg') {
        var pageX = event.pageX
        var pageY = event.pageY
        // console.log('event.target', dom)

        $currSketch = $(dom).parent()
        $currSketch.top = pageY
        $currSketch.left = pageX
        $currSketch.width = $($currSketch).width()
        $currSketch.height = $($currSketch).height()

        var dtype = parseInt($currSketch.attr('dtype'))
        var $colorConBtn = $('#kmseditors-contextmenu-color')
        var $editConBtn = $('#kmseditors-contextmenu-edit')

        if (dtype === 0) { // 锚点
          $colorConBtn.hide()
          $editConBtn.hide()
        } else if (dtype === 1) { // 文字
          $colorConBtn.show()
          $editConBtn.show()
        }

        // 取当前鼠标位置
        var cLeft = pageX
        var cTop = pageY

        // 取当前锚点位置，目的是显示到右下角
        var $c0 = $currSketch[0]
        if ($c0) {
          cTop = $c0.offsetTop + $($currSketch).height()
          cLeft = $c0.offsetLeft + $($currSketch).width() - $($contextmenu).width()
        }

        $($contextmenu).show().css({
          left: cLeft,
          top: cTop
        })
      } else {
        $($contextmenu).hide()
      }
    })

    // 锚点按下 -> flag = true
    $(document).on('mousedown', '.map-position-bg', function(event) {
      var dom = event.target
      currDom = dom
      currDomType = 'map-position-bg'
      $(dom).data('pageX', event.pageX)
      $(dom).data('pageY', event.pageY)
      $(dom).css('cursor', 'move')
      $($contextmenu).hide()
    })


    // 改变大小按下 -> flag = true
    $(document).on('mousedown', '.resize', function(event) {
      var dom = event.target
      currDom = dom
      currDomType = 'resize'
      $(dom).data('pageX', event.pageX)
      $(dom).data('pageY', event.pageY)
      $($contextmenu).hide()
    })


    // 全局弹起
    $(document).on('mouseup', function(event) {
      if (currDomType === 'map-position-bg') {
        kmseditors.$position.find('.map-position-bg').css('cursor', 'default')
      }
      currDom = null
      currDomType = null
      $($contextmenu).hide()
    })
  }

  // 检查是否支持全屏
  function _checkFullScreen() {
    var ele = document.documentElement
    return ele.requestFullscreen || ele.msRequestFullscreen || ele.mozRequestFullScreen || ele.webkitRequestFullscreen || false
  }

  // 全屏
  function _launchFullScreen() {
    var ele = document.documentElement
    if (ele.requestFullscreen) {
      ele.requestFullscreen()
    } else if (ele.msRequestFullscreen) {
      ele.msRequestFullscreen()
    } else if (ele.mozRequestFullScreen) {
      ele.mozRequestFullScreen()
    } else if (ele.webkitRequestFullscreen) {
      ele.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
    }
  }

  // 退出全屏
  function _cancelFullScreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    }
  }

  // 生成锚点
  function _sketchHandle(obj) {
    var $images = $(kmseditors.$container).find('img[ref=imageMaps]')
    if ($images.length === 0) {
      var txt = '请先上传图片！'
      if (window.seajs) {
        seajs.use('lui/dialog', function(dialog) {
          dialog.alert(txt)
        })
      } else {
        alert(txt)
      }
      return
    }

    _hideTips()

    var top = '10'
    var left = '10'
    var width = '90'
    var height = '30'
    var len = $(kmseditors.$container).find('div.map-position[dtype="0"]').length
    var index = len + 1
    var isLink = false

    if (obj && typeof obj === 'object') {
      if (obj.top) top = obj.top
      if (obj.left) left = obj.left
      if (obj.width) width = obj.width
      if (obj.height) height = obj.height
      if (obj.ref) index = obj.ref
      if (obj.isLink) isLink = obj.isLink
    }

    var classIsLink = isLink ? ' isLink' : ''

    // 在这里写style是为了初始化就有值
    kmseditors.$position.append('<div ref="' + index + '" dtype="0" class="map-position' + classIsLink + '" style="top:' + top + 'px;left:' + left + 'px;width:' + width + 'px;height:' + height + 'px;"><div class="map-position-bg"></div><span class="resize"></span></div>')

    // <span class="link-number-text">Link ' + index + '</span>
  }


  // 图片上传完成后 - 初始化编辑区域
  function _initPositionConrainer(imgSrc) {
    if (!imgSrc) return

    var $warp = $('<div id="kmseditors-contant-sketch-warp"></div>')
    var $img = $('<img ref="imageMaps">')
    var $container = $('<div class="position-conrainer"></div>')
    $img.on('load', function(evt) {
      var _$img = $(evt.target)
      kmseditors.$position = $(kmseditors.$container).find('.position-conrainer')
      var $kmseditors_contant = $('#kmseditors-contant') // 编辑区
      var $tips_div = $('#kmseditors-contant-tips') // 提示文字区域
      var top = 0
      var left = 0

      kmseditors.$position.css({
        top: top,
        left: left,
        width: _$img.width(),
        height: _$img.height()
      })
    })
    $warp.append($img)
    $warp.append($container)

    $(kmseditors.$container).find('#kmseditors-contant').append($warp)

    if (imgSrc.indexOf('?') !== -1) {
      imgSrc += '&x='
    } else {
      imgSrc += '?x='
    }

    imgSrc += new Date().getTime()

    $img.attr('src', imgSrc)
  }


  // 初始化上传图片
  function _initImgUpload() {
    if (typeof WebUploader === 'undefined') return

    var uploadImgUrl = kmseditors.options.uploadImgUrl
    if (!uploadImgUrl) return logger.error('参数uploadImgUrl 未在init方法中传入')

    var fdModelId = kmseditors.options.fdModelId
    if (!fdModelId) return logger.error('参数fdModelId 未在init方法中传入')

    var BASE_URL = '../../lib/webuploader-0.1.5/'

    var serverURL = uploadImgUrl += '&fdModelId=' + fdModelId

    // 创建Web Uploader实例
    var uploader = WebUploader.create({
       duplicate:true,
      // 选完文件后，是否自动上传。
      auto: true,
      // swf文件路径
      swf: BASE_URL + 'Uploader.swf',
      // 文件接收服务端。
      server: serverURL,
      // 选择文件的按钮。可选。
      // 内部根据当前运行是创建，可能是input元素，也可能是flash.
      pick: '#kmseditors-uploadimg',
      sendAsBinary: true,
      // 只允许选择图片文件。
      accept: {
        title: 'Images',
        extensions: 'gif,jpg,jpeg,bmp,png',
        mimeTypes: 'image/*'
      }
    })

    $(kmseditors.$container).find('#kmseditors-uploadimg').removeClass('webuploader-container')
    $(kmseditors.$container).find('#kmseditors-uploadimg > div.webuploader-pick').removeClass('webuploader-pick')


    // 当文件被加入队列之前触发，此事件的handler返回值为false，则此文件不会被添加进入队列。
    uploader.on('beforeFileQueued', function(file) {
      var $images = $(kmseditors.$container).find('img[ref=imageMaps]')
      if ($images.length > 0 && !confirm('再次上传将会覆盖原来的背景图片，是否继续？')) {
        return uploader.cancelFile(file)
      }
      // 默认清空已有内容
      $images.remove()
    })

    // 文件上传成功，给item添加成功class, 用样式标记上传成功。
    uploader.on('uploadSuccess', function(file, response) {
      // console.log(response)
      var raw = response.path || response._raw
      if (!raw) return logger.error('_raw error', raw)

      if (window.seajs) {
        seajs.use("lui/topic", function(topic) {
          topic.publish("kms.editor.map.img.change", {
            fdAttId: response.fdAttId
          })
        })
      }

      // 清除锚点操作区域
      var $warp = $(kmseditors.$container).find('#kmseditors-contant-sketch-warp')
      if ($warp && $warp.length > 0) $warp.remove()

      var imgSrc = kmseditors.options.host + raw
      _initPositionConrainer(imgSrc)
      // $('#' + file.id).addClass('upload-state-done')
    })

    // 文件上传失败，显示上传出错。
    uploader.on('uploadError', function(file) {
      var $li = $('#' + file.id),
        $error = $li.find('div.error')

      // 避免重复创建
      if (!$error.length) {
        $error = $('<div class="error"></div>').appendTo($li)
      }

      $error.text('上传失败')
    })
  }


  // 右键菜单 - 关联
  function _relationHandle() {
    // console.log($currSketch)
    $($contextmenu).hide()
    var onRelation = kmseditors.options.onRelation || _noop
    onRelation(kmseditors.getData($currSketch))
  }


  // 右键菜单 - 删除
  function _deleteHandle() {
    $($contextmenu).hide()
    $($currSketch).remove() // 最简单的写法
    return
  }

  // 右键菜单 - 编辑
  function _editHandle() {
    $($contextmenu).hide()
  }


  // 右键菜单 - 颜色
  function _colorHandle() {
    $($contextmenu).hide()
  }


  // 隐藏tips
  function _hideTips() {
    $(kmseditors.$container).find('#kmseditors-contant-tips').hide()
  }


  // 设置当前锚点是否为添加链接状态
  kmseditors.setLinkStatus = function(options) {
    var ref = options.ref
    var isLink = options.isLink
    if (!ref || typeof isLink !== 'boolean') return logger.error('setLinkStatus传入参数有误')
    var $dom = $(kmseditors.$container).find('div.map-position[dtype="0"][ref="' + ref + '"]')
    if (!$dom.length === 0) return
    if (isLink) {
      $dom.addClass('isLink')
    } else {
      $dom.removeClass('isLink')
    }
  }


  // 设置整体缩放比例
  kmseditors.setZoom = function(value) {
    var zoom = value || 1

    if (__INIT_ZOOM__ === '') __INIT_ZOOM__ = zoom

    $(kmseditors.$container).find('#kmseditors-contant-sketch-warp').css({
      zoom: zoom,
      '-moz-transform': 'scale(' + zoom + ')'
    })
  }


  // 获取当前zoom的值
  kmseditors.getZoom = function() {
    var $warp = $(kmseditors.$container).find('#kmseditors-contant-sketch-warp')
    var currZoom = $warp.css('zoom')

    if (currZoom) {
      if (/%$/.test(currZoom)) {
        currZoom = parseFloat(currZoom) / 100
      }
    }
    // 特别的浏览器取不到值,如：火狐
    if (!currZoom) {
      var wStr = $warp.attr('style')
      if (wStr) {
        var wArr = wStr.split(';')
        for (var i = 0; i < wArr.length; i++) {
          var item = wArr[i]
          var index = item.indexOf('scale')
          if (index === -1) break
          currZoom = item.substring(index + 6, item.length - 1)
          break
        }
      }
    }

    var obj = {
      initZoom: __INIT_ZOOM__,
      currZoom: parseFloat(currZoom)
    }

    // console.log(obj)

    return obj
  }

  // 放大
  kmseditors.zoomIn = function() {
    var v = kmseditors.getZoom().currZoom + 0.1
    var max = __INIT_ZOOM__ * 2
    if (v >= max) v = max
    kmseditors.setZoom(v)
  }

  // 缩小
  kmseditors.zoomOut = function() {
    var v = kmseditors.getZoom().currZoom - 0.1
    var min = __INIT_ZOOM__ * 0.6
    if (v <= min) v = min
    kmseditors.setZoom(v)
  }

  // 还原
  kmseditors.zoomReset = function() {
    kmseditors.setZoom(__INIT_ZOOM__)
  }


  if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = kmseditors
  } else if (typeof define === 'function' && (define.amd || define.cmd)) {
    define(function() { return kmseditors })
  } else {
    $w[__NAME__] = kmseditors
  }
})(window);