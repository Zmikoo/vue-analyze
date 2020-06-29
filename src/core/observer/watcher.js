/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * 
 * 实例化位置：
 * core/instance/lifecycle  mountComponent
 * core/instance/state   initComputed -> if (!isSSR)
 * 
 * Dep存储和操作Watcher
 * core/observer/scheduler 处理Watcher队列
 */
export default class Watcher {
  vm: Component;//vm vode
  expression: string;
  cb: Function;// data更新后用于更新DOM的回调函数
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;//激活
  deps: Array<Dep>;// 观察者队列
  newDeps: Array<Dep>;// 新的观察者队列
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;//beforeUpdate钩子函数
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,// data或js表达式或者函数 
    cb: Function,// data更新后用于更新DOM的回调函数
    options?: ?Object,
    isRenderWatcher?: boolean //是否渲染过得观察者
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      // console.log('[/core/observer/watcher.js options]',options)
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy//懒惰 ssr 渲染
      this.sync = !!options.sync //如果是同步
      this.before = options.before // beforeUpdate钩子函数
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb // 一旦数据发生变化，需要调用cb更新dom
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers 对于懒惰的观察者
    this.deps = []// 观察者队列
    this.newDeps = []// 新的观察者队列
    this.depIds = new Set()// 内容不可重复的数组对象
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn// 给数据赋新值，触发getter
    } else {
      // 解析类似obj.a.b的值 赋值给对象的key，触发getter
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        // 报错解析值失败
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()

    console.log(111111,this.cb.toString())
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 计算getter,重新收集依赖
   */
  get () {
    console.log('[/core/observer/watcher.js get]',this)
    pushTarget(this)
    console.log('[/core/observer/watcher.js get]')
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)// 在vm上找data
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 递归遍历找value
      if (this.deep) {
        console.log('[/core/observer/watcher.js get deep]')
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
        console.log('[/core/observer/watcher.js addDep]')
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   * 
   * 当依赖性更改时将被调用
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   * 拆除
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
