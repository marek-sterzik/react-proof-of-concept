import Cdur from "cdur"

class SmallComponent extends Cdur.Component
{
    render()
    {
        return <div>This is the small component</div>
    }
}

class RootComponent extends Cdur.Component
{
    init()
    {
    }

    childAdded(child, name)
    {
        console.log("root child added", name, child)
    }

    childRemoved(child, name)
    {
        console.log("root child removed", name, child)
    }

    render() 
    {
        return <div><div>ROOT</div>{this.children()}</div>
    }
}

class MasterComponent extends Cdur.Component
{
    init()
    {
        this.setState("status", "ok")
        this.setState("slaves", [])
        this.setContext("identifier", "MASTER")
    }

    render()
    {
        return <>
            {this.state.slaves.map(Slave => <Slave.View key={Slave.getId()} />)}
            <div><button onClick={this.mountSlave}>MOUNT SLAVE</button></div>
            <div><button onClick={this.invokePromise}>INVOKE PROMISE</button><button onClick={this.invokePromise2}>INVOKE PROMISE 2</button></div>
        </>
    }

    invokePromise = () => {
        const promise = createPromise(100, 1000)
        this.waitFor(promise)
    }

    invokePromise2 = () => {
        var promise = createPromise("ok", 1000)
        promise = Cdur.promise(promise).writeOnWait(() => "waiting")
        this.setState("status", promise)
    }

    decorate(content)
    {
        return <div style={{"border": "1px solid black", "margin": "1em", "padding": "1em", "display": "inline-block"}}>
                <div>status is: { this.state.status }</div>
                {content}
            </div>
    }

    setIdentifier = (data) => {
        this.setContext("identifier", data)
    }

    mountSlave = () => {
        this.setState(["slaves", Cdur.consts.S_PUSH], this.createSubComponent(SlaveComponent))
    }

    unmountSlave = (slave) => {
        this.setState("slaves", function(slaves){
            return slaves.filter(s => (s !== slave))
        }, true)
        slave.disconnect()
    }

    renderWait()
    {
        return <div>Waiting...</div>
    }
}

var slaveId = 1

function createPromise(data, timeout)
{
    return new Promise((finish) => setTimeout(() => finish(data), timeout))
}

class SlaveComponent extends Cdur.Component
{
    init()
    {
        this.setState("id", slaveId++)
        this.setState("clicks", 0)
    }

    click = () => {
        this.setState("clicks", createPromise(this.state.clicks + 1, 300))
    }

    changeContext = (local) => {
        const previousIdentifier = (local ? this.context.identifier : this.parent().context.identifier)
        const newIdentifier = (previousIdentifier === "SLAVE") ? 'MASTER' : 'SLAVE'
        const promise = createPromise(newIdentifier, 1000)
        if (local) {
            this.setContext("identifier", promise)
        } else {
            this.parent().setIdentifier(promise)
        }
    }

    unsetLocalContext = () => {
        this.setContext("identifier", undefined)
    }

    unmount = () => {
        this.parent().unmountSlave(this)
    }

    render()
    {
        return <div style={{"border": "1px solid black", "margin": "1em", "padding": "1em", "display": "inline-block"}}>
            <div>COMPONENT ID: {this.state.id}</div>
            <div>CLICKS: {this.state.clicks}</div>
            <div>CONTEXT: {this.context.identifier}</div>
            <div style={{"textAlign": "center"}}>
                <div><button onClick={this.click}>CLICK</button></div>
                <div><button onClick={() => this.changeContext(false)}>CHANGE CONTEXT GLOBAL</button></div>
                <div><button onClick={() => this.changeContext(true)}>CHANGE CONTEXT LOCAL</button></div>
                { this.context.hasOwnProperty("identifier") ? <div><button onClick={this.unsetLocalContext}>UNSET CONTEXT LOCAL</button></div> : null }
                <div><button onClick={this.unmount}>Unmount</button></div>
            </div>
        </div>
    }
}

export {MasterComponent, RootComponent, SmallComponent}
