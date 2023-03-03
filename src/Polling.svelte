<script context="module">
    import {get} from 'svelte/store'
    import {optionsStore, pollingStore, forcePollingStop, paymentErrorsStore} from './store'

    const POLL_INTERVAL = 5000

    const poll = async ({interval, maxAttempts, paymentData}) => {
        const options = get(optionsStore)
        let attempts = 0

        const BASE_URL = options.baseUrl ?? 'https://api.toonieglobal.com'

        const API_ENDPOINT = `${BASE_URL}/offers/v1/payments/status/`

        const paymentIntentRequest = async () => {
            try {
                const res = await fetch(API_ENDPOINT + paymentData.paymentSessionId)
                if (res.ok) {
                    const data = await res.json()
                    return data
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

        return new Promise(executePoll)
    }

    export const pollForNewPayment = (paymentData) =>
        poll({
            interval: POLL_INTERVAL,
            paymentData,
        })
</script>
