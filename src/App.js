import './App.css';
import {MasterComponent, SmallComponent} from './Test.js'
import React from "react"
import Cdur from "cdur"

class EnableDisable extends React.Component
{
    constructor() {
        super()
        this.state = {"visible": true, "displayChildren": true}
    }

    toggle() {
        this.setState({"visible": !this.state.visible})
    }

    toggleChildren() {
        this.setState({"displayChildren": !this.state.displayChildren})
    }

    render() {
        var children = this.state.displayChildren ? this.props.children : (<SmallComponent.View parentSlot="page" />)
        return <div>
            <div>
                <button onClick={this.toggle.bind(this)}>{this.state.visible ? 'unmount' : 'mount'}</button>
                <button onClick={this.toggleChildren.bind(this)}>{this.state.displayChildren ? 'hide children' : 'show children'}</button>
            </div>
            {this.state.visible ? <div>{children}</div> : null}
        </div>
    }
}

function App() {
  return (
    <Cdur.Root.View><EnableDisable><MasterComponent.View parentSlot="page" /></EnableDisable></Cdur.Root.View>
  );
}

export default App;
