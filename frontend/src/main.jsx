import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/*
This code renders our project so it can be viewed in a browser. 
*/
ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
