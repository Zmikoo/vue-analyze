/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)
console.log('[/core/observer/array.js arrayProto]',Object.create(arrayProto))
console.log('[/core/observer/array.js arrayMethods]',arrayMethods)
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  /**
   * def参数：
   * 1 obj:Object
   * 2 key:string
   * 3 val:any
   * 4 enumerable?:boolean
   * 内部实现：
   * Object.defineProperty(obj,key,{value:val,enumerable:!!enumerable,writeable:true,configurable:true})
   */
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    console.log('[/core/observer/array.js ob]',ob)
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
