/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array' // 将被侦听的数组的变更方法进行包裹，使它们也会触发视图更新
import {
  def,
  warn,
  hasOwn,// 对象中有无某个key
  hasProto,// '__proto__' in {}
  isObject,// Object,Array,Function...
  isPlainObject,// Object 严格对象
  isPrimitive,// 是否是简单类型
  isUndef,// undefined或null
  isValidArrayIndex,// 是否是有效的数组index值
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 * 在某些情况下，我们可能希望禁用组件内部的观察更新计算。
 */
export let shouldObserve: boolean = true
// 设置组件内部是否禁止观察更新
export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * 用于监听每一个数据变化
 * Observer会附加到每一个被侦测的data上，给data添加setter,getter来收集属性的依赖
 */
export class Observer {
  value: any;// vue实例中的data
  dep: Dep;// 用于存储管理绑定了data的Node列表
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)// 将data的Observer实例绑定在data的__ob__属性上,方便在其他位置访问Observer实例或Observer.dep或判断data有没有被监听
    if (Array.isArray(value)) {
       // 给每一个数组添加可触发视图更新的'push','pop','shift','unshift','splice','sort','reverse'方法
      if (hasProto) {//  hasProto = '__proto__' in {}
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 给数组的每一项都添加 new Observer
      this.observeArray(value)
    } else {
      // 深度遍历对象的每一项添加new Observer
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历对象所有属性绑定getter、setter来侦测变化
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   * 侦测Array中的每一项
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])// 对每一个item都new Observer
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 * 用于给数组添加可触发视图更新的方法，如push
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  // 对于需要进行侦测的数组，覆盖重写其数组原型方法以便侦测
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 * 用于给数组添加可触发视图更新的方法，如push
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 尝试为value创建一个Observer实例，如果创建成功，直接返回新创建的Observer实例。
 * 如果value已经存在一个Observer实例，则直接返回它，避免重复侦测value变化的问题
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {// __0b__是Oberver对象含有的属性
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 
 * 定义响应式数据，以进行变化追踪
 * 给Vue添加$attrs,$listeners
 * 
 * 调用位置：
 * core/instance/inject  Object.keys(result).forEach(key => {defineReactive(vm, key, result[key])})  注： 初始化注入,init.js中被调用
 * core/instance/render  initRender()
 * core/instance/state  initProps()
 * core/observer/index(当前文件) Observer类中
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()// 这个dep的作用是在get中存储Watcher，方便在set中通知Watcher;

  const property = Object.getOwnPropertyDescriptor(obj, key)// 获取obj上key对应的属性描述符对象。
  if (property && property.configurable === false) {// 如果key值不可配置，则return
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  let childOb = !shallow && observe(val)// 将每个val(数组/部分对象)都转化为Observer对象（如果value已经存在一个Observer实例，则直接返回它自己）
  Object.defineProperty(obj, key, {
    enumerable: true,// 表示遍历obj时，key可以被遍历
    configurable: true,// 表示key可以配置
    get: function reactiveGetter () {// 每次有dom获取key时，就会执行get,收集target(Node/Watcher)。谨记不在定义时执行，只在get事件发生时执行
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {// 在解析html模板的过程中如果发现一个dom中有key（vue实例的data），就会把dom赋值给target
        dep.depend()// 将依赖收集到dep中,在set时通知变化
        // console.log('[/core/observer/index.js defineReactive]',val,childOb)
        if (childOb) {// 如果val是一个有子属性的对象或者是一个数组，会执行代码块,如果val是简单类型，不会执行代码块
          childOb.dep.depend()// 将target存储在Observer实例的dep中方便其他位置访问操作
          console.log('[/core/observer/index.js defineReactive-get]',childOb)
          if (Array.isArray(value)) {
            dependArray(value) //数组每个item全部denpend target
          }
        }
        
      }
      return value
    },
    set: function reactiveSetter (newVal) {// 每次设置key时，就会执行set。谨记不在定义时执行，只在set事件发生时执行
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare 新旧值比较 如果是一样则不执行了 */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)

      console.log('[/core/observer/index.js defineReactive-set]',dep)
      dep.notify()// 通知Watcher更新target列表
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * 给对象或数组的元素赋新值并更新DOM
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {// 如果target是undefined或者简单类型
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)// 更新数组元素的值
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val// 更新对象的值并将触发setter
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )// 避免在运行时将响应属性添加到Vue实例或其根$data-在data选项中预先声明
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 * 删除数组或对象的元素并更新DOM
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {// 如果target是undefined或者简单类型
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)// 从数组中删除key
    return
  }

  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]// 从对象上删除key
  if (!ob) {
    return
  }
  ob.dep.notify()// 通知更新DOM
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 * 数组的元素被获取时收集依赖Watcher。（无法像对象的属性获取器那样拦截对数组元素的访问）
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}