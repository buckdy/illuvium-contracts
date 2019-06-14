import React from "react";
import classNames from "classnames";
import withStyles from "@material-ui/core/styles/withStyles";

import Header from "components/Header/Header.jsx";
import Footer from "components/Footer/Footer.jsx";
import GridContainer from "components/Grid/GridContainer.jsx";
import GridItem from "components/Grid/GridItem.jsx";
import HeaderLinks from "components/Header/HeaderLinks.jsx";
import Parallax from "components/Parallax/Parallax.jsx";

import landingPageStyle from "assets/jss/material-kit-react/views/landingPage.jsx";

import ProductSection from "./Sections/ProductSection.jsx";

import logo4 from "assets/img/svgs/logo4.svg";

const dashboardRoutes = [];

class LandingPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      flag: "en",
      typevalue: ""
    }
  }
  Changelanguage = () => {
    this.setState({ flag: this.state.flag === "en" ? "es" : "en" },
      () => {
        console.log("this.state.flag", this.state.flag)
      });
  }

  ChangeFocus = (value) => {
    if (value === 'who') {
      var element = document.getElementById("whomDiv");
      element.scrollIntoView();
    } else {
      this.setState({
        typevalue: value
      })
    }
  }
  render() {
    const { classes, ...rest } = this.props;
    return (
      <div>
        <Header
          color="transparent"
          routes={dashboardRoutes}
          brand="DeepSensors"
          rightLinks={<HeaderLinks value={this.state.flag} ChangeLanugage={this.Changelanguage} ChangeFocus={this.ChangeFocus.bind(this)} />}
          fixed
          changeColorOnScroll={{
            height: 400,
            color: "white"
          }}
          {...rest}
        />
        <div id="whomDiv"></div>
        <Parallax filter image={require("assets/img/bg_main.jpg")}>
          <div className={classes.container}>
            <GridContainer justify="center">
              <GridItem xs={12} sm={12} md={6}>
                <img src={logo4} alt="logo" style={{width: "100%"}}/>
              </GridItem>
            </GridContainer>
          </div>
        </Parallax>
        <div className={classNames(classes.main, classes.mainRaised)}>
          <div className={classes.container}>
            <ProductSection flag={this.state.flag} typevalue={this.state.typevalue} />
          </div>
        </div>
        <Footer />
      </div>
    );
  }
}

export default withStyles(landingPageStyle)(LandingPage);

