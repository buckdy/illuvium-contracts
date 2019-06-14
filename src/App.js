import React from "react";
import { createBrowserHistory } from "history";
import { Router, Route, Switch } from "react-router-dom";
import "assets/scss/material-kit-react.scss?v=1.4.0";

import LandingPage from "views/LandingPage/LandingPage.jsx";

var hist = createBrowserHistory();

class App extends React.Component {
  render() {
    return (
      <Router history={hist}>
        <Switch>
          <Route path="/" component={LandingPage} />
        </Switch>
      </Router>
    )
  }
}
export default App;