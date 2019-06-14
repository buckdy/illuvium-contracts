import React from "react";
import withStyles from "@material-ui/core/styles/withStyles";


import i18n from './../i18n';

import sectionImg1 from "assets/img/subsection/icons8-expensive-price-50.png";
import sectionImg2 from "assets/img/subsection/icons8-mine-cart-50.png";
import sectionImg3 from "assets/img/subsection/icons8-cargo-ship-50.png";
import sectionImg4 from "assets/img/subsection/icons8-bull-50.png";
import sectionImg5 from "assets/img/subsection/icons8-checkout-50.png";
import sectionImg6 from "assets/img/subsection/icons8-loyalty-50.png";
import logo1 from "assets/img/svgs/logo1.svg";


import productStyle from "assets/jss/material-kit-react/views/landingPageSections/productStyle.jsx";

import GridContainer from "components/Grid/GridContainer.jsx";
import GridItem from "components/Grid/GridItem.jsx";
import Card from "components/Card/Card.jsx";
import CardHeader from "components/Card/CardHeader.jsx";
import CardBody from "components/Card/CardBody.jsx";
import CustomInput from "components/CustomInput/CustomInput.jsx";
import Button from "components/CustomButtons/Button.jsx";
import { Fragment } from "react";


class ProductSection extends React.Component {
  constructor(props) {
    super(props)
  }
  componentDidUpdate(preProps) {
      if (this.props.typevalue === "what") {
        var element1 = document.getElementById("whoDiv");
        element1.scrollIntoView();
      }
      if (this.props.typevalue === "how") {
        var element2 = document.getElementById("whatDiv");
        element2.scrollIntoView();
      }
      if (this.props.typevalue === "do") {
        var element3 = document.getElementById("howDiv");
        element3.scrollIntoView();
      }
      if (this.props.typevalue === "mail") {
        var element3 = document.getElementById("doDiv");
        element3.scrollIntoView();
      }
  }

  render() {
    const { classes } = this.props;
    const lng = this.props.flag;

    return (
      <Fragment>
        <div id="whoDiv"></div>
        <div className={classes.section}>
          <GridContainer justify="center" className={classes.sectionGrid}>
            <GridItem xs={12} sm={12} md={8}>
              <h5 className={classes.description}>
                {i18n.t('content.section1', { lng })}
              </h5>
            </GridItem>
          </GridContainer>
          <div id="whatDiv"></div>
          <GridContainer justify="center" className={classes.sectionGrid}>
            <GridItem xs={12} sm={12} md={8}>
              <div className={classes.displayFlex}>
                <img src={logo1} alt="logo" className={classes.logoStyle} />
                <h2 className={classes.title + ' ' + classes.headerColor}>
                  {i18n.t('title.section2', { lng })}
                </h2>
              </div>

              <h5 className={classes.description}>
                {i18n.t('content.section2.primary', { lng })}
              </h5>
            </GridItem>
            <GridItem xs={12} sm={12} md={12}>
              <GridContainer justify="center">
                <GridItem xs={12} sm={12} md={5}>
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section2.subTitle1', { lng })}
                  </h3>
                  <h5 className={classes.description}>
                    {i18n.t('content.section2.subContent1', { lng })}
                  </h5>
                </GridItem>
                <GridItem xs={12} sm={12} md={5}>
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section2.subTitle2', { lng })}
                  </h3>
                  <h5 className={classes.description}>
                    {i18n.t('content.section2.subContent2', { lng })}
                  </h5>
                </GridItem>
              </GridContainer>

            </GridItem>
          </GridContainer>
          <div id="howDiv"></div>
          <GridContainer justify="center" className={classes.sectionGrid}>
            <GridItem xs={12} sm={12} md={8}>
              <div className={classes.displayFlex}>
                <img src={logo1} alt="logo" className={classes.logoStyle} />
                <h2 className={classes.title + ' ' + classes.headerColor}>
                  {i18n.t('title.section3', { lng })}
                </h2>
              </div>
            </GridItem>
            <GridItem xs={12} sm={12} md={10}>
              <GridContainer justify="center">
                <GridItem xs={12} sm={12} md={4}>
                  <h5 className={classes.description}>
                    {i18n.t('content.section3.subContent1', { lng })}
                  </h5>
                </GridItem>
                <GridItem xs={12} sm={12} md={4}>
                  <h5 className={classes.description}>
                    {i18n.t('content.section3.subContent2', { lng })}
                  </h5>
                </GridItem>
                <GridItem xs={12} sm={12} md={4}>
                  <h5 className={classes.description}>
                    {i18n.t('content.section3.subContent3', { lng })}
                  </h5>
                </GridItem>
              </GridContainer>
            </GridItem>
          </GridContainer>
          <GridContainer justify="center" className={classes.sectionGrid}>
            <GridItem xs={12} sm={12} md={8} >
              <div className={classes.displayFlex} >
                <img src={logo1} alt="logo" className={classes.logoStyle} />
                <h2 className={classes.title + ' ' + classes.headerColor}>
                  {i18n.t('title.section4', { lng })}
                </h2>
              </div>
              <h5 className={classes.description}>
                {i18n.t('content.section4.primary', { lng })}
              </h5>
            </GridItem>
            <GridItem xs={12} sm={12} md={10}>
              <GridContainer justify="center">
                <GridItem xs={12} sm={12} md={4} >
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section4.subSection1.primary', { lng })}
                  </h3>
                  <Card className={classes.customSection}>
                    <CardHeader className={classes.displayFlex}>
                      <img src={sectionImg1} alt="price" className={classes.imgStyle} />
                      <h4 className={classes.title1}>
                        {i18n.t('content.section4.subSection1.content.primaryTitle', { lng })}
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className={classes.customStyle}>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection1.content.subTitle1', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection1.content.subContent1', { lng })}
                        </p>
                      </div>
                      <div>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection1.content.subTitle2', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection1.content.subContent2', { lng })}
                        </p>
                      </div>


                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem xs={12} sm={12} md={4} >
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section4.subSection2.primary', { lng })}
                  </h3>
                  <Card className={classes.customSection}>
                    <CardHeader className={classes.displayFlex}>
                      <img src={sectionImg2} alt="mine-cart" className={classes.imgStyle} />
                      <h4 className={classes.title1}>
                        {i18n.t('content.section4.subSection2.content.primaryTitle', { lng })}
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className={classes.customStyle}>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection2.content.subTitle1', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection2.content.subContent1', { lng })}
                        </p>
                      </div>
                      <div>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection2.content.subTitle2', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection2.content.subContent2', { lng })}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem xs={12} sm={12} md={4}>
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section4.subSection3.primary', { lng })}
                  </h3>
                  <Card className={classes.customSection}>
                    <CardHeader className={classes.displayFlex}>
                      <img src={sectionImg3} alt="ship" className={classes.imgStyle} style={{
                        position: "absolute",
                        top: "17px",
                        bottom: 0,
                        left: "55px",
                        right: "20px"
                      }} />
                      <h4 style={{
                        position: "absolute",
                        top: "41px",
                        left: "127px"
                      }} className={classes.title1}>
                        {i18n.t('content.section4.subSection3.content.primaryTitle', { lng })}
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className={classes.customStyle}>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection3.content.subTitle1', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection3.content.subContent1', { lng })}
                        </p>
                      </div>
                      <div>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection3.content.subTitle2', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection3.content.subContent2', { lng })}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem xs={12} sm={12} md={4}>
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section4.subSection4.primary', { lng })}
                  </h3>
                  <Card className={classes.customSection}>
                    <CardHeader className={classes.displayFlex}>
                      <img src={sectionImg4} alt="bull" className={classes.imgStyle} />
                      <h4 className={classes.title1}>
                        {i18n.t('content.section4.subSection4.content.primaryTitle', { lng })}
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className={classes.customStyle}>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection4.content.subTitle1', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection4.content.subContent1', { lng })}
                        </p>
                      </div>
                      <div>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection4.content.subTitle2', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection4.content.subContent2', { lng })}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem xs={12} sm={12} md={4}>
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section4.subSection5.primary', { lng })}
                  </h3>
                  <Card className={classes.customSection}>
                    <CardHeader className={classes.displayFlex}>
                      <img src={sectionImg5} alt="checkout" className={classes.imgStyle} />
                      <h4 className={classes.title1}>
                        {i18n.t('content.section4.subSection5.content.primaryTitle', { lng })}
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className={classes.customStyle}>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection5.content.subTitle1', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection5.content.subContent1', { lng })}
                        </p>
                      </div>
                      <div>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection5.content.subTitle2', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection5.content.subContent2', { lng })}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem xs={12} sm={12} md={4}>
                  <h3 className={classes.fontStyle}>
                    {i18n.t('content.section4.subSection6.primary', { lng })}
                  </h3>
                  <Card className={classes.customSection}>
                    <CardHeader className={classes.displayFlex}>
                      <img src={sectionImg6} alt="loyalty" className={classes.imgStyle} />
                      <h4 className={classes.title1}>
                        {i18n.t('content.section4.subSection6.content.primaryTitle', { lng })}
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className={classes.customStyle}>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection6.content.subTitle1', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection6.content.subContent1', { lng })}
                        </p>
                      </div>
                      <div>
                        <h4 className={classes.title2}>
                          {i18n.t('content.section4.subSection6.content.subTitle2', { lng })}
                        </h4>
                        <p>
                          {i18n.t('content.section4.subSection6.content.subContent2', { lng })}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
              </GridContainer>
            </GridItem>
          </GridContainer>
          <div id="doDiv"></div>
          <GridContainer justify="center" className={classes.sectionGrid}>
            <GridItem xs={12} sm={12} md={8}>
              <div className={classes.displayFlex}>
                <img src={logo1} alt="logo" className={classes.logoStyle} />
                <h2 className={classes.title + ' ' + classes.headerColor}>
                  {i18n.t('title.section5', { lng })}
                </h2>
              </div>
              <h4 className={classes.description}>
                {i18n.t('content.section5.content', { lng })}
              </h4>
            </GridItem>
            <GridItem xs={12} sm={12} md={8}>
              <div id='contact'>
                <GridContainer justify="center">
                  <GridItem xs={12} sm={12} md={12}>
                    <GridContainer justify="center">
                      <GridItem xs={12} sm={12} md={6}>
                        <CustomInput
                          labelText={i18n.t('content.section5.yourName', { lng })}
                          id="name"
                          formControlProps={{
                            fullWidth: true
                          }}
                        />
                      </GridItem>
                      <GridItem xs={12} sm={12} md={6}>
                        <CustomInput
                          labelText={i18n.t('content.section5.yourEmail', { lng })}
                          id="email"
                          formControlProps={{
                            fullWidth: true
                          }}
                        />
                      </GridItem>
                    </GridContainer>
                  </GridItem>
                  <GridItem xs={12} sm={12} md={12}>
                    <CustomInput
                      labelText={i18n.t('content.section5.yourMessage', { lng })}
                      id="message"
                      formControlProps={{
                        fullWidth: true,
                        className: classes.textArea
                      }}
                      inputProps={{
                        multiline: true,
                        rows: 5
                      }}
                    />
                  </GridItem>
                  <GridItem xs={12} sm={12} md={12}>
                    <Button className={classes.btnStyle}>{i18n.t('content.section5.btnText', { lng })}</Button>
                  </GridItem>
                </GridContainer>

              </div>
            </GridItem>
          </GridContainer>
        </div>
      </Fragment>
    );
  }
}

export default withStyles(productStyle)(ProductSection);
