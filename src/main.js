import App from "./App.svelte";
import { optionsStore } from "./store";

const renderApp = (selector, options) => {
  // set client options to our store
  optionsStore.set(options);

  return new App({ target: selector });
};

const PayWithToonie = Object.freeze({
  render: renderApp
});

window.PayWithToonie = PayWithToonie;
export default PayWithToonie;
