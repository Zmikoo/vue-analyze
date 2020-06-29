/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */
// 此模块作用： 将被侦听的数组的变更方法进行包裹，使它们也会触发视图更新
import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)
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
  const original = arrayProto[method]// 存储js数组原生方法
  /**
   * def作用：将被侦听的数组的变更方法进行包裹，使它们也会触发视图更新
   * def内部实现：Object.defineProperty(obj,key,{value:val,enumerable:!!enumerable,writeable:true,configurable:true})
   */
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args)// 执行js原生的数组方法

    const ob = this.__ob__  // 有__ob__代表这是个Observer对象，this.__ob__就是Observer实例对象自身 相关代码实现：def(value, '__ob__', this)

    // 侦测数组通过push等方法新增元素的变化
    let inserted // 用于存储插入的新元素；
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)// 对插入的新数据的每一项都添加监听 new Observer
    ob.dep.notify()// 数组发生了变化，通知DOM更新
    return result
  })
})
