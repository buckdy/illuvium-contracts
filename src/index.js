import React from "react";
import ReactDOM from "react-dom";
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import App from "./App.js";

import "assets/scss/material-kit-react.scss?v=1.4.0";
import "./index.css"
ReactDOM.render(
    <I18nextProvider i18n={i18next}>
        <App/>
    </I18nextProvider>,
    document.getElementById('root')
);
