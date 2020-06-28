// 递归地遍历对象 深度追踪
const seenObjects = new Set()
const VNode = {}

function isObject(obj) {
    //判断是否是对象
    return obj !== null && typeof obj === 'object'
}

traverse(1)

function traverse (val) {// val为任意类型的值
    _traverse(val, seenObjects)
    seenObjects.clear()// 清空set中的所有元素
}
  
function _traverse (val,seen) {
    let i, keys
    const isA = Array.isArray(val)
    if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
      return
    }
    if (val.__ob__) {
      const depId = val.__ob__.dep.id
      if (seen.has(depId)) {
        return
      }
      seen.add(depId)
    }
    if (isA) {// 如果是数组
      i = val.length
      while (i--) _traverse(val[i], seen)
    } else {
      keys = Object.keys(val)
      i = keys.length
      while (i--) _traverse(val[keys[i]], seen)
    }
  }