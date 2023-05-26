import React from "react"

function createReactComponent(component)
{
    return class extends React.Component
    {
        constructor()
        {
            super()
            this.component = component
            this.state = {"s": 1}
        }

        componentDidMount()
        {
            const index = this.component._mountedReactComponents.indexOf(this);
            if (index <= -1) {
                this.component._mountedReactComponents.push(this)
            }
            this.updateState()
        }

        componentWillUnmount()
        {
            const index = this.component._mountedReactComponents.indexOf(this);
            if (index > -1) {
                this.component._mountedReactComponents.splice(index, 1);
            }
        }

        updateState()
        {
            this.setState({"s": this.state.s + 1})
        }

        render()
        {
            var content = this.renderContent()
            if ("decorate" in this.component) {
                content = this.component.decorate(content)
            }
            return content
        }

        renderContent()
        {
            if (this.component._disconnected) {
                return <>Error: This component was disconnected</>
            } else if (this.component.isWaitingState()) {
                if (this.component.canWait()) {
                    return this.component.renderWait()
                } else {
                    return null
                }
            } else {
                if ("render" in this.component) {
                    return this.component.render()
                } else {
                    throw "Render function not implemented"
                }
            }
        }

        static disconnect()
        {
            return component.disconnect()
        }

        static getId()
        {
            return component.getId()
        }
    }
}

const S_PUSH = Object.freeze({})

function parseKey(key)
{
    var keys = []
    for (var k of key.split(/\./)) {
        if (k.match(/^[0-9]+$/)) {
            k = parseInt(k)
        } else if (k === '@') {
            k = S_PUSH
        }
        keys.push(k)
    }
    return keys
}

function isPromise(p) {
  if (
    p !== null &&
    typeof p === 'object' &&
    typeof p.then === 'function' &&
    typeof p.catch === 'function' &&
    typeof p.finally === 'function'
  ) {
    return true;
  }

  return false;
}

function isCallable(f)
{
    return typeof f === 'function' && !/^class\s/.test(Function.prototype.toString.call(f));
}

function doWrite(object, key, value)
{
    if (value !== undefined) {
        object[key] = value
    } else {
        delete object[key]
    }
}

function resolveWrite(component, recursively, object, key, value, resolveFunction)
{
    if (key === S_PUSH) {
        key = object.length
    }
    if (resolveFunction && isCallable(value)) {
        value = value(object[key])
    }
    doWrite(object, key, value)
    if (isPromise(value)) {
        component.waitStart()
        value.finally(() => {
            component.waitFinish()
        }).then((data) => {
            if (object[key] === value) {
                doWrite(object, key, data)
                notifyReactChanged(component, recursively)
            }
        })
    }
}

function notifyReactChanged(object, recursively)
{
    if (recursively) {
        object.notifyReactChangedRecursively()
    } else {
        object.notifyReactChanged()
    }
}

function parseArgs(args)
{
    if (args.length == 0) {
        throw "Arguments for setState()/setContext() method cannot be empty"
    }

    var writes = []
    var resolveFunction = false

    var arg0 = args.shift()

    if (typeof arg0 === "string") {
        arg0 = parseKey(arg0)
    }

    if (typeof arg0 === "object" && arg0 instanceof Array) {
        if (args.length < 1) {
            throw "Invalid argument count for setState()/setContext()"
        }
        writes.push({"key": arg0, "value": args.shift()})
    } else {
        resolveFunction = false
        for (var key in arg0) {
            writes.push({"key": parseKey(key), "value": arg0[key]})
        }
    }

    if (args.length > 1) {
        throw "Invalid argument count for setState()/setContext()"
    }
    if (args.length == 1) {
        if (args[0] !== true && args[1] !== false) {
            throw "Invalid resolveFunction argument for setState()/setContext()"
        }
        resolveFunction = args[0]
    }

    return {writes, resolveFunction}
}

function changeState(object, variable, recursively, ...args)
{
    args = parseArgs(args)
    for (var write of args.writes) {
        changeStateSingle(object, variable, recursively, write.key, write.value, args.resolveFunction)
    }
    notifyReactChanged(object, recursively)
}

function changeStateSingle(object, variable, recursively, keys, value, resolveFunction)
{
    const lastKey = keys.pop()
    var obj = variable
    var oldKey = null
    for (var k of keys) {
        if (oldKey !== null) {
            if (typeof k === "string") {
                obj[oldKey] = {}
            } else if ((typeof k === "int") || (k === S_PUSH)) {
                obj[oldKey] = []
            }
            obj = obj[oldKey]
            oldKey = null
        }
        if (k !== S_PUSH) {
            if (obj[k] === undefined) {
                oldKey = k
            } else {
                obj = obj[k]
            }
        } else {
            oldKey = obj.length
        }
    }
    resolveWrite(object, recursively, obj, lastKey, value, resolveFunction)
}


function notifyReactChangedNow(component)
{
    for (var reactComponent of component._mountedReactComponents) {
        reactComponent.updateState()
    }
}
    

class LateNotifier
{
    constructor()
    {
        this.notifications = {}
        this.timeoutEnabled = false
    }
    
    notify(object)
    {
        this.notifications[object.id] = object
        if (!this.timeoutEnabled) {
            this.timeoutEnabled = true
            setTimeout(this.execute.bind(this), 0)
        }
    }

    execute()
    {
        this.timeoutEnabled = false
        for (var id in this.notifications) {
            notifyReactChangedNow(this.notifications[id])
        }
        this.notifications = {}
    }
}

var componentId = 1

export default class Component
{
    constructor(parent, args)
    {
        this.id = "" + (componentId++)
        this._disconnected = false
        if (parent) {
            this._notifier = parent._notifier
            this.context = Object.create(parent.context)
            parent._children[this.id] = this
        } else {
            this.context = {}
            this._notifier = new LateNotifier()
        }
        this.state = {}
        this._internal = {"waiting": 0}
        this._parent = parent
        this._mountedReactComponents = []
        const view = createReactComponent(this)
        this.view = () => view
        this._children = {}
        if ("init" in this) {
            this.init(...args)
        }
    }

    canWait()
    {
        return "renderWait" in this;
    }

    isWaitingState()
    {
        return this._internal.waiting > 0
    }

    waitStart()
    {
        if (this._internal.waiting == 0 && !this.canWait()) {
            const parent = this.parent()
            if (parent) {
                parent.waitStart()
            }
        }
        this._internal.waiting++
        this.notifyReactChanged()
    }

    waitFor(promise)
    {
        if (isPromise(promise)) {
            this.waitStart()
            promise.finally(this.waitFinish.bind(this))
        }
    }

    waitFinish()
    {
        if (this._internal.waiting > 0) {
            this._internal.waiting--
            this.notifyReactChanged()
        } else {
            throw "called waitFinish without waitStart"
        }
        if (this._internal.waiting == 0 && !this.canWait()) {
            const parent = this.parent()
            if (parent) {
                parent.waitFinish()
            }
        }
    }

    notifyReactChangedRecursively()
    {
        for (var id in this._children) {
            this._children[id].notifyReactChangedRecursively()
        }
        this.notifyReactChanged()
    }

    notifyReactChanged()
    {
        this._notifier.notify(this)
    }

    setState(...args)
    {
        changeState(this, this.state, false, ...args)
    }

    setContext(...args)
    {
        changeState(this, this.context, false, ...args)
    }

    createSubComponent(subcomponentClass, ...args)
    {
        return (new subcomponentClass(this, args)).view()
    }

    parent()
    {
        return this._parent
    }

    disconnect()
    {
        this._disconnected = true
        delete this._parent._children[this.id]
        if (this._parent !== null && this.isWaitingState() && !this.canWait()) {
            this._parent.waitFinish()
        }
        this.context = {}
        this._parent = null
        this.notifyReactChanged()
    }

    getId()
    {
        return this.id
    }

    static createRootComponent(...args)
    {
        return createReactComponent(new this(null, args))
    }
}

function waiting(data, waitValue)
{
    return data
    if (isPromise(data)) {
        return waitValue
    }
    return data
}

export {Component, waiting, S_PUSH}
