import {Component, waiting} from "./Component.js"

class MasterComponent extends Component
{
    init()
    {
        this.setState("status", "ok")
        this.setState("slave", this.createSubComponent(SlaveComponent))
        this.setContext("identifier", "MASTER")
    }

    render()
    {
        return <div>
            <div>status is: { this.state.status }</div>
            {(this.state.status == "ok" && this.state.slave !== null) ? <this.state.slave /> : null}
            { this.state.slave !== null ? <button onClick={this.unmountSlave}>UNMOUNT SLAVE</button> : <button onClick={this.mountSlave}>MOUNT SLAVE</button>}
        </div>
    }

    setIdentifier = (data) => {
        this.setContext("identifier", data)
    }

    unmountSlave = () => {
        var slave = this.state.slave
        this.setState("slave", null)
        slave.disconnect()
    }

    mountSlave = () => {
        this.setState("slave", this.createSubComponent(SlaveComponent))
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

class SlaveComponent extends Component
{
    init()
    {
        this.setState("id", slaveId++)
    }

    click = () => {
        this.setState("id", createPromise(this.state.id + 1, 1000))
    }

    changeContext = () => {
        const newIdentifier = (this.context.identifier == "SLAVE") ? 'MASTER' : 'SLAVE'
        this.parent().setIdentifier(createPromise(newIdentifier, 1000))
    }

    render()
    {
        return <>
            <button onClick={this.click}>CLICK {this.state.id}</button>
            <div>CONTEXT: {this.context.identifier}</div>
            <button onClick={this.changeContext}>CHANGE CONTEXT</button>
        </>
    }
}

export default MasterComponent.createRoot()
