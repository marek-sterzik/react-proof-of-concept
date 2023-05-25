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
            if (this.component._disconnected) {
                return <>Error: This component was disconnected</>
            } else if (this.component.isWaiting()) {
                if (this.component.canWait()) {
                    return this.component.renderWait()
                } else {
                    return null
                }
            } else {
                return this.component.render()
            }
        }

        static disconnect()
        {
            return component.disconnect()
        }
    }
}

function parseKey(key)
{
    var keys = []
    for (var k of key.split(/\./)) {
        if (k.match(/^[0-9]+$/)) {
            k = parseInt(k)
        }
        keys.push(k)
    }
    return [key]
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

function resolveWrite(component, recursively, object, key, value)
{
    object[key] = value
    if (isPromise(value)) {
        component.waitStart()
        value.finally(() => {
            component.waitFinish()
        }).then((data) => {
            if (object[key] === value) {
                object[key] = data
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

function changeState(object, variable, recursively, arg1, arg2)
{
    if (arg2 !== undefined) {
        arg1 = {[arg1]: arg2}
    }
    for (var key in arg1) {
        changeStateSingle(object, variable, recursively, key, arg1[key])
    }
    notifyReactChanged(object, recursively)
}

function changeStateSingle(object, variable, recursively, key, value)
{
    const keys = parseKey(key)
    const lastKey = keys.pop()
    var obj = variable
    for (var k in keys) {
        obj = obj[k]
    }
    resolveWrite(object, recursively, obj, lastKey, value)
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
        this._reactComponent = createReactComponent(this)
        this._children = {}
        if ("init" in this) {
            this.init(...args)
        }
    }

    canWait()
    {
        return "renderWait" in this;
    }

    isWaiting()
    {
        return this._internal.waiting > 0
    }

    waitStart()
    {
        if (this._internal.waiting == 0 && ! this.canWait()) {
            const parent = this.parent()
            if (parent) {
                parent.waitStart()
            }
        }
        this._internal.waiting++
        this.notifyReactChanged()
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
        this.notifyReactChanged()
    }

    setContext(...args)
    {
        changeState(this, this.context, true, ...args)
    }


    render()
    {
        throw "Render not implemented"
    }

    createSubComponent(subcomponentClass, ...args)
    {
        const instance = new subcomponentClass(this, args)
        return instance._reactComponent
    }

    parent()
    {
        return this._parent
    }

    disconnect()
    {
        this._disconnected = true
        delete this._parent._children[this.id]
        if (this._parent !== null && this._internal.waiting > 0 && !this.canWait()) {
            this._parent.waitFinish()
        }
        this.context = {}
        this._parent = null
        this.notifyReactChanged()
    }

    static createRoot(...args)
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

export {Component, waiting}
