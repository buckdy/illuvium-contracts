import React from "react";
import withStyles from "@material-ui/core/styles/withStyles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Tooltip from "@material-ui/core/Tooltip";
import Button from "components/CustomButtons/Button.jsx";
import Background from '../../assets/img/mail.png'


import headerLinksStyle from "assets/jss/material-kit-react/components/headerLinksStyle.jsx";

class HeaderLinks extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      section: "",
    };

  }

  ChangeLanugage = () => {
    this.props.ChangeLanugage();
  }
  ChangeFocus = event => {
    console.log("event.target.name", event)
    const { name } = event.target;
    this.props.ChangeFocus(name)
  }
  render() {
    const { classes } = this.props;
    return (
      <List className={classes.list}>
        <ListItem className={classes.listItem}>
          {this.props.value === "en" ? <input type="button" className={classes.btnStyle} name="who" value="WHO" onClick={this.ChangeFocus} /> : <input type="button" className={classes.btnStyle} name="who" value="QUIEN" onClick={this.ChangeFocus} />}
        </ListItem>
        <ListItem className={classes.listItem}>
          {this.props.value === "en" ? <input type="button" className={classes.btnStyle} name="what" value="WHAT" onClick={this.ChangeFocus} /> : <input type="button" className={classes.btnStyle} name="what" value="QUE" onClick={this.ChangeFocus} />}
        </ListItem>
        <ListItem className={classes.listItem}>
          {this.props.value === "en" ? <input type="button" className={classes.btnStyle} name="how" value="HOW" onClick={this.ChangeFocus} /> : <input type="button" className={classes.btnStyle} name="how" value="COMO" onClick={this.ChangeFocus} />}
        </ListItem>
        <ListItem className={classes.listItem}>
          {this.props.value === "en" ? <input type="button" className={classes.btnStyle} name="do" value="DO" onClick={this.ChangeFocus} /> : <input type="button" className={classes.btnStyle} name="do" value="HACER" onClick={this.ChangeFocus} />}
        </ListItem>

        <ListItem className={classes.listItem}>
          <Tooltip
            id="mail"
            title="Mail"
            placement={window.innerWidth > 959 ? "top" : "left"}
            classes={{ tooltip: classes.tooltip }}
          >
            {/* <input type="button" name="mail" value={Background} onClick={this.ChangeFocus} ></input> */}

            {/* <button name="mail" className={classes.mailStyle} onClick={this.ChangeFocus}><img src={Background}/></button> */}
            {/* </input> */}
            <Button
              name="mail"
              className={classes.navLink1}
              onClick={this.ChangeFocus}
            >
              <i onClick={(e) => { this.props.ChangeFocus('mail'); e.preventDefault(); e.stopPropagation(); }} className={classes.socialIcons + " far fa-envelope"} />
            </Button>
          </Tooltip>
        </ListItem>
        <ListItem className={classes.listItem}>
          <Tooltip
            id="lang"
            title="Change the Language"
            placement={window.innerWidth > 959 ? "top" : "left"}
            classes={{ tooltip: classes.tooltip }}
          >
            <Button
              color="white"
              target="_blank"
              className={classes.navLink2}
              onClick={this.ChangeLanugage}
            >
              <div className={classes.translate}>{this.props.value === "es" ? "EN" : "ES"}</div>
            </Button>
          </Tooltip>
        </ListItem>
      </List>
    );
  }

}

export default withStyles(headerLinksStyle)(HeaderLinks);
