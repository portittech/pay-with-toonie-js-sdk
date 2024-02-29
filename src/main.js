import App from "./App.svelte";
import {
  optionsStore,
  pollingStore,
  forcePollingStop,
  paymentErrorsStore,
} from "./store";
import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";

// Initialize the Sentry SDK here
Sentry.init({
  dsn: "https://0809360954ee4c8e8f695f634063221b@o508190.ingest.sentry.io/4506825020080128",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

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
