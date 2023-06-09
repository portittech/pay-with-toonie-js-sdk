import App from "./App.svelte";
import {
  optionsStore,
  pollingStore,
  forcePollingStop,
  paymentErrorsStore,
} from "./store";
import { get } from "svelte/store";

const renderApp = (selector, options) => {
  // ensure stores are clean
  pollingStore.set(undefined);
  forcePollingStop.set(undefined);
  paymentErrorsStore.set(undefined);

  // set client options to our store
  optionsStore.set(options);

  return new App({ target: selector });
};

const PayWithToonie = Object.freeze({
  render: renderApp,
  getStopPollingHandle: (stopPollingHandleReceiver) => {
    const stopPolling = () => {
      const currentTimeoutId = get(pollingStore);
      if (currentTimeoutId) {
        forcePollingStop.set(true);
        clearTimeout(currentTimeoutId);
      }
    };

    stopPollingHandleReceiver(stopPolling);
  },
});

window.PayWithToonie = PayWithToonie;
export default PayWithToonie;
