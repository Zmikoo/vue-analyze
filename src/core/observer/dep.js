/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * dep对象用于管理所有的订阅者和通知这些订阅者 
 */
export default class Dep {
  static target: ?Watcher;
  id: number;// 数据对应的唯一id
  subs: Array<Watcher>;// 数据对应的dom节点列表（watcher列表）

  constructor () {
    this.id = uid++ 
    this.subs = [] 
  }

  addSub (sub: Watcher) {
    console.log('[/core/observer/dep.js addSub]',sub)
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      //为Watcher 添加 为Watcher.newDeps.push(dep); 一个dep对象
      Dep.target.addDep(this)
    }
  }

  // 通知DOM更新
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()// Watcher.update更新DOM数据
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 全局唯一的观察者
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  // target堆
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()// 后进先出
  Dep.target = targetStack[targetStack.length - 1]
}
