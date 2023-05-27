import './App.css';
import Master from './Test.js'
import Cdur from 'cdur'
import React from "react"

class EnableDisable extends React.Component
{
    constructor() {
        super()
        this.state = {"visible": true}
    }

    toggle() {
        this.setState({"visible": !this.state.visible})
    }

    render() {
        return <div>
            <div><button onClick={this.toggle.bind(this)}>{this.state.visible ? 'unmount' : 'mount'}</button></div>
            {this.state.visible ? <div>{this.props.children}</div> : null}
        </div>
    }
}

function App() {
  return (
    <EnableDisable><Cdur.Mount component={Master} /></EnableDisable>
  );
}

export default App;
