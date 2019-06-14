import { title } from "assets/jss/material-kit-react.jsx";
import imagesStyle from "assets/jss/material-kit-react/imagesStyles.jsx";
// import { withTheme } from "@material-ui/core";

const productStyle = {
  section: {
    padding: "70px 0",
    textAlign: "center",
  },
  title: {
    ...title,
    // marginBottom: "1rem",
    margin: 0,
    minHeight: "25px",
    textDecoration: "none"
  },
  title1: {
    color: "white",
    fontWeight: "600",
    fontFamily: `"Roboto Slab", "Times New Roman", serif`,
    margin: 0,
    textDecoration: "none"
  },
  title2: {
    color: "white",
    fontWeight: "500",
    fontFamily: `"Roboto Slab", "Times New Roman", serif`,
    margin: 0,
    textDecoration: "none"
  },
  headerColor: {
    color: "#1d8e88",
  },
  ...imagesStyle,
  description: {
    color: "#999",
    textTransform: 'none',
    minHeight: "80px"
  },
  customSection: {
    border: "1px solid #1D8E88",
    borderRadius: "50px",
    padding: "0px 5px 5px 5px",
    boxShadow: "5px 5px 5px 5px #aaaaaa",
    background: "#05b8a5",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: '500px',
    color: "white"

  },
  displayFlex: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgStyle: {
    marginRight: '10px',
    height: '60px',
  },
  fontStyle: {
    ...title,
    color: '#444444'
  },
  logoStyle: {
    width: '10%',
    height: '36px',
  },
  sectionGrid: {
    paddingBottom: "80px"
  },
  btnStyle: {
    background: "#05b8a5",
    border: "1px solid #05b8a5",
    borderRadius: "25px"
  },
  customStyle: {
    background: "#05b8a5",
    border: "1px solid #05b8a5",
    borderRadius: "25px",
    marginBottom: "25px"
  }
};

export default productStyle;
