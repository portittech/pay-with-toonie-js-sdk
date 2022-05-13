<script context="module">
  import { get } from "svelte/store";
  import { optionsStore } from "./store";

  const POLL_INTERVAL = 5000;
  const API_ENDPOINT =
    "https://api.develop.toonie.portit.io/offers/v1/payments/status/";

  const poll = async ({ interval, maxAttempts, sessionId }) => {
    const options = get(optionsStore);
    let attempts = 0;

    const paymentIntentRequest = async () => {
      try {
        const res = await fetch(API_ENDPOINT + sessionId);
        if (res.ok) {
          const data = await res.json();
          return data;
        } else {
          options.failurePaymentCallback(
            new Error(`${res.status} ${res.statusText}`)
          );
        }
      } catch (error) {
        options.failurePaymentCallback(error);
      }
    };

    const executePoll = async (resolve, reject) => {
      const paymentStatus = await paymentIntentRequest();
      attempts++;

      if (paymentStatus.status === "APPROVED") {
        // Show to user success message
        return resolve(paymentStatus);
      } else if (paymentStatus.status === "REJECTED") {
        // Show to user error message
        return reject(new Error("Payment was rejected"));
      } else if (maxAttempts && attempts === maxAttempts) {
        // Show to user error message
        return reject(new Error("Exceeded max attempts"));
      } else {
        // continue polling
        setTimeout(executePoll, interval, resolve, reject);
      }
    };

    return new Promise(executePoll);
  };

  export const pollForNewPayment = sessionId =>
    poll({
      interval: POLL_INTERVAL,
      sessionId,
    });
</script>