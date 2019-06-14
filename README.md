# [Material Kit React](https://demos.creative-tim.com/material-kit-react) [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/home?status=Material%20Kit%20PRO%20is%20a%20Bootstrap%20UI%20Kit%20with%20a%20fresh,%20new%20design%20inspired%20by%20Google's%20Material%20Design%20%E2%9D%A4%EF%B8%8Fhttps%3A//demos.creative-tim.com/material-kit-pro/presentation.html%20%23bootstrap%20%23material%20%23design%20%23uikit%20%23premium%20%20via%20%40CreativeTim)


 ![version](https://img.shields.io/badge/version-1.4.0-blue.svg) ![license](https://img.shields.io/badge/license-MIT-blue.svg) [![GitHub issues open](https://img.shields.io/github/issues/creativetimofficial/material-kit-react.svg?maxAge=2592000)](https://github.com/creativetimofficial/material-kit-react/issues?q=is%3Aopen+is%3Aissue) [![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/creativetimofficial/material-kit-react.svg?maxAge=2592000)](https://github.com/creativetimofficial/material-kit-react/issues?q=is%3Aissue+is%3Aclosed) [![Join the chat at https://gitter.im/NIT-dgp/General](https://badges.gitter.im/NIT-dgp/General.svg)](https://gitter.im/creative-tim-general/Lobby) [![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg)](https://discord.gg/E4aHAQy)
 
 
 [<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/html-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-kit?ref=mkr-readme)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/vue-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/vue-material-kit?ref=mkr-readme)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/react-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-kit-react?ref=mkr-readme)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/react-native-logo.jpg?raw=true" width="60" height="60" />](https://www.creative-tim.com/product/material-kit-react-native?ref=mkr-readme)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/figma-logo.jpg?raw=true" width="60" height="60" />](https://demos.creative-tim.com/material-kit-figma/presentation.html?ref=mkr-readme)[<img src="https://github.com/creativetimofficial/public-assets/blob/master/logos/wordpress-logo.jpg?raw=true" width="60" height="60" />](https://themeisle.com/themes/hestia/?ref=creativetim)[<img src="https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/photoshop-logo.jpg" width="60" height="60" />](https://github.com/creativetimofficial/material-kit/tree/photoshop)[<img src="https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/sketch-logo.jpg" width="60" height="60" />](https://github.com/creativetimofficial/material-kit/tree/sketch)
 
 ## Quick start

- `npm i material-kit-react`

## Documentation
The documentation for the Material Kit React is hosted at our [website](https://demos.creative-tim.com/material-kit-react/#/documentation/tutorial).


## File Structure
Within the download you'll find the following directories and files:

```
material-kit-react
.
├── CHANGELOG.md
├── Documentation
│   ├── assets
│   │   ├── css
│   │   ├── img
│   │   │   └── faces
│   │   └── js
│   │       ├── bootstrap.min.js
│   │       └── jquery-3.2.1.min.js
│   └── tutorial-components.html
├── ISSUE_TEMPLATE.md
├── LICENSE.md
├── README.md
├── bower.json
├── package.json
├── public
│   ├── favicon.ico
│   ├── index.html
│   └── manifest.json
└── src
    ├── index.js
    ├── logo.svg
    ├── assets
    │   ├── css
    │   ├── img
    │   │   ├── examples
    │   │   └── faces
    │   ├── jss
    │   │   ├── material-kit-react
    │   │   │   ├── components
    │   │   │   └── views
    │   │   │       ├── componentsSections
    │   │   │       ├── landingPageSections
    │   │   └── material-kit-react.jsx
    │   └── scss
    │       ├── core
    │       │   ├── mixins
    │       │   └── variables
    │       ├── plugins
    │       └── material-kit-react.scss
    ├── components
    │   ├── Badge
    │   │   └── Badge.jsx
    │   ├── Card
    │   │   ├── Card.jsx
    │   │   ├── CardBody.jsx
    │   │   ├── CardFooter.jsx
    │   │   └── CardHeader.jsx
    │   ├── Clearfix
    │   │   └── Clearfix.jsx
    │   ├── CustomButtons
    │   │   └── Button.jsx
    │   ├── CustomDropdown
    │   │   └── CustomDropdown.jsx
    │   ├── CustomInput
    │   │   └── CustomInput.jsx
    │   ├── CustomLinearProgress
    │   │   └── CustomLinearProgress.jsx
    │   ├── CustomTabs
    │   │   └── CustomTabs.jsx
    │   ├── Footer
    │   │   └── Footer.jsx
    │   ├── Grid
    │   │   ├── GridContainer.jsx
    │   │   └── GridItem.jsx
    │   ├── Header
    │   │   ├── Header.jsx
    │   │   └── HeaderLinks.jsx
    │   ├── InfoArea
    │   │   └── InfoArea.jsx
    │   ├── NavPills
    │   │   └── NavPills.jsx
    │   ├── Pagination
    │   │   └── Pagination.jsx
    │   ├── Parallax
    │   │   └── Parallax.jsx
    │   ├── Snackbar
    │   │   └── SnackbarContent.jsx
    │   └── Typography
    │       ├── Danger.jsx
    │       ├── Info.jsx
    │       ├── Muted.jsx
    │       ├── Primary.jsx
    │       ├── Quote.jsx
    │       ├── Small.jsx
    │       ├── Success.jsx
    │       └── Warning.jsx
    └── views
        ├── Components
        │   ├── Components.jsx
        │   └── Sections
        │       ├── SectionBasics.jsx
        │       ├── SectionCarousel.jsx
        │       ├── SectionCompletedExamples.jsx
        │       ├── SectionDownload.jsx
        │       ├── SectionExamples.jsx
        │       ├── SectionJavascript.jsx
        │       ├── SectionLogin.jsx
        │       ├── SectionNavbars.jsx
        │       ├── SectionNotifications.jsx
        │       ├── SectionPills.jsx
        │       ├── SectionTabs.jsx
        │       └── SectionTypography.jsx
        ├── LandingPage
        │   ├── LandingPage.jsx
        │   └── Sections
        │       ├── ProductSection.jsx
        │       ├── TeamSection.jsx
        │       └── WorkSection.jsx
        ├── LoginPage
        │   └── LoginPage.jsx
        └── ProfilePage
            └── ProfilePage.jsx
```
