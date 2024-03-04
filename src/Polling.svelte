<script context="module">
  import { get } from 'svelte/store'
  import { forcePollingStop, optionsStore, paymentErrorsStore, pollingStore } from './store'

  const POLL_INTERVAL = 5000
  const MAX_ATTEMPTS = 10
  const REDIRECT_DELAY = 2500;

  const poll = async ({interval, maxAttempts, paymentData, paymentType, successUrl, errorUrl, sessionId}) => {
    const options = get(optionsStore)
    const baseUrl = options?.baseUrl ?? 'https://api.toonieglobal.com'
    const checkPaymentStatusEndpoint = `${baseUrl}/acquiring/v1/payment/${sessionId}/approve`

    let attempts = 0

    const getPaymentStatusData = async () => {
      try {
        const res = await fetch(checkPaymentStatusEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          }
        })

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
      const paymentStatus = await getPaymentStatusData()
      attempts++

      const handleError = () => {
        // Show to user error message
        paymentErrorsStore.set({
          paymentStatus,
          attempts
        })

        setTimeout(() => location.href = errorUrl, REDIRECT_DELAY)

        return reject(new Error('Payment was rejected'))
      }

      if (paymentStatus.provider.status === 'APPROVED') {
        // update payment for BE and show to user success message
        if (options.updatePayment) {
          await options.updatePayment(sessionId, paymentStatus.provider.status)
        }

        if (options.successPaymentCallback) {
          options.successPaymentCallback(paymentStatus, paymentData)
        }
        paymentErrorsStore.set(undefined)

        if (successUrl) {
          setTimeout(() => location.href = successUrl, REDIRECT_DELAY)
        }

        return resolve(paymentStatus)
      } else if (paymentStatus.provider.status === 'REJECTED') {
        // update payment for BE
        if (options.updatePayment) {
          await options.updatePayment(sessionId, paymentStatus.provider.status)
        }

        handleError();

      } else if (maxAttempts && attempts === maxAttempts) {
        handleError()
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
        const res = await options.fetchStreamPaymentIntent(paymentData.intentId)
        if (res.ok) {
          return await res.json();
        } else {
          options.failurePaymentCallback(
            new Error(`Failed to retrieve intent with ID: ${res.id ?? "N/A"}, status: ${res.status}, reason: ${res.reason}`)
          )
        }
      } catch (error) {
        options.failurePaymentCallback(error)
      }
    }

    const executeStreamPoll = async (resolve, reject) => {
      const paymentStatus = await streamPaymentIntentRequest();
      attempts++

      const handleError = () => {
        // Show to user error message
        paymentErrorsStore.set({
          paymentStatus,
          attempts
        })

        setTimeout(() => location.href = errorUrl, REDIRECT_DELAY)

        return reject(new Error('Payment was rejected'))
      }

      if (paymentStatus.status === 'ACCEPTED') {
        // Show to user success message
        if (options.successPaymentCallback) {
          options.successPaymentCallback(paymentStatus, paymentData)
        }
        paymentErrorsStore.set(undefined)

        if (successUrl) {
          location.href = successUrl
        }

        return resolve(paymentStatus)
      } else if (paymentStatus.status === 'REJECTED') {
        if (options.failurePaymentCallback) {
          options.failurePaymentCallback(paymentStatus, paymentData)
        }

        handleError()
      } else if (maxAttempts && attempts === maxAttempts) {
        handleError()
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

  export const pollForNewPayment = (paymentData, paymentType, successUrl, errorUrl, sessionId) =>
    poll({
      interval: POLL_INTERVAL,
      maxAttempts: MAX_ATTEMPTS,
      paymentData,
      paymentType,
      successUrl,
      errorUrl,
      sessionId
    })
</script>
