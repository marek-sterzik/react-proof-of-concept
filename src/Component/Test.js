import {Component, waiting} from "./Component.js"

class MasterComponent extends Component
{
    init()
    {
        this.setState("status", "ok")
        this.setState("slave", this.createSubComponent(SlaveComponent))
    }

    render()
    {
        return <div>
            <div>status is: { this.state.status }</div>
            {(this.state.status == "ok" && this.state.slave !== null) ? <this.state.slave /> : null}
            { this.state.slave !== null ? <div onClick={this.unmountSlave}>UNMOUNT SLAVE</div> : <div onClick={this.mountSlave}>MOUNT SLAVE</div>}
        </div>
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

    render()
    {
        return <div onClick={this.click}>CLICK {this.state.id}</div>
    }
}

export default MasterComponent.createRoot()
