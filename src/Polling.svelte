<script context="module">
  import { get } from 'svelte/store'
  import { forcePollingStop, optionsStore, paymentErrorsStore, pollingStore } from './store'

  const POLL_INTERVAL = 5000

  const poll = async ({ interval, maxAttempts, paymentData, paymentType }) => {
    const options = get(optionsStore)
    let attempts = 0

    const BASE_URL = options.baseUrl ?? 'https://api.toonieglobal.com'

    const API_ENDPOINT = `${BASE_URL}/offers/v1/payments/status/`

    const paymentIntentRequest = async () => {
      try {
        const res = await fetch(API_ENDPOINT + paymentData.paymentSessionId)
        if (res.ok) {
          return await res.json()
        } else {
          options.failurePaymentCallback(
            new Error(`${res.status} ${res.statusText}`)
          )
        }
      } catch (error) {
        options.failurePaymentCallback(error)
      }
    }

    const executePoll = async (resolve, reject) => {
      const paymentStatus = await paymentIntentRequest()
      attempts++

      if (paymentStatus.status === 'APPROVED') {
        // Show to user success message
        if (options.successPaymentCallback) {
          options.successPaymentCallback(paymentStatus, paymentData)
        }
        paymentErrorsStore.set(undefined)
        return resolve(paymentStatus)
      } else if (paymentStatus.status === 'REJECTED') {
        // Show to user error message
        paymentErrorsStore.set({
          paymentStatus,
          attempts
        })
        return reject(new Error('Payment was rejected'))
      } else if (maxAttempts && attempts === maxAttempts) {
        // Show to user error message
        paymentErrorsStore.set({
          paymentStatus,
          attempts
        })
        return reject(new Error('Exceeded max attempts'))
      } else {
        // continue polling
        const isForcedFromOutside = get(forcePollingStop);
        if (!isForcedFromOutside) {
          const timeoutId = setTimeout(executePoll, interval, resolve, reject);
          pollingStore.set(timeoutId)
        }

      }
    }

    const streamPaymentIntentRequest = async () => {
      try {
        const res = await options.fetchStreamPaymentIntent(paymentData.paymentIntentStreamId)
        if (res.ok) {
          return await res.json();
        } else {
          options.failurePaymentCallback(
            new Error(`${res.status} ${res.statusText}`)
          )
        }
      } catch (error) {
        options.failurePaymentCallback(error)
      }
    }

    const executeStreamPoll = async (resolve, reject) => {
      const paymentStatus = await streamPaymentIntentRequest();
      attempts++

      if (paymentStatus.status === 'APPROVED') {
        // Show to user success message
        if (options.approveStreamPayment) {
          options.approveStreamPayment(paymentStatus.paymentIntentStreamId)
        }
        paymentErrorsStore.set(undefined)
        return resolve(paymentStatus)
      } else if (paymentStatus.status === 'REJECTED') {
        if (options.rejectStreamPayment) {
          options.rejectStreamPayment(paymentStatus.paymentIntentStreamId)
        }
        // Show to user error message
        paymentErrorsStore.set({
          paymentStatus,
          attempts
        })
        return reject(new Error('Payment was rejected'))
      } else if (maxAttempts && attempts === maxAttempts) {
        // Show to user error message
        paymentErrorsStore.set({
          paymentStatus,
          attempts
        })
        return reject(new Error('Exceeded max attempts'))
      } else {
        // continue polling
        const isForcedFromOutside = get(forcePollingStop);
        if (!isForcedFromOutside) {
          const timeoutId = setTimeout(executeStreamPoll, interval, resolve, reject);
          pollingStore.set(timeoutId)
        }

      }
    }

    if (paymentType === "PWT") return new Promise(executePoll);

    if (paymentType === "stream") return new Promise(executeStreamPoll);
  }

  export const pollForNewPayment = (paymentData, paymentType) =>
    poll({
      interval: POLL_INTERVAL,
      paymentData,
      paymentType,
    })
</script>
