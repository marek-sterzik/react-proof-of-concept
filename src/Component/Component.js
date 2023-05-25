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
            if (this.component.isWaiting()) {
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

function resolveWrite(component, object, key, value)
{
    object[key] = value
    if (isPromise(value)) {
        component.waitStart()
        value.finally(() => {
            component.waitFinish()
        }).then((data) => {
            if (object[key] === value) {
                object[key] = data
                component.notifyReactChanged()
            }
        })
    }
}

export default class Component
{
    constructor(parent)
    {
        this.state = {}
        this._internal = {"waiting": 0}
        this._parent = parent
        this._mountedReactComponents = []
        this._reactComponent = createReactComponent(this)
        this.init()
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

    init()
    {
    }

    notifyReactChanged()
    {
        for (var reactComponent of this._mountedReactComponents) {
            reactComponent.updateState()
        }
    }
    
    setState(arg1, arg2)
    {
        if (arg2 !== undefined) {
            arg1 = {[arg1]: arg2}
        }
        for (var key in arg1) {
            this._setState(key, arg1[key])
        }
        this.notifyReactChanged()
    }

    _setState(key, value)
    {
        const keys = parseKey(key)
        const lastKey = keys.pop()
        var obj = this.state
        for (var k in keys) {
            obj = obj[k]
        }
        resolveWrite(this, obj, lastKey, value)
    }

    render()
    {
        throw "Render not implemented"
    }

    createSubComponent(subcomponentClass)
    {
        const instance = new subcomponentClass(this)
        return instance.getReactComponent()
    }

    getReactComponent()
    {
        return this._reactComponent
    }

    parent()
    {
        return this._parent
    }

    disconnect()
    {
        if (this._parent !== null && this._internal.waiting > 0 && !this.canWait()) {
            this._parent.waitFinish()
        }
        this._parent = null
    }

    static createRoot(args)
    {
        return createReactComponent(new this(null))
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
