<script>
  import { loadStripe } from '@stripe/stripe-js'
  import { onMount } from "svelte";
  import { Elements } from "svelte-stripe";
  import { get } from 'svelte/store'
  import CardPaymentModal from "./CardPaymentModal.svelte";
  import PaymentModal from './PaymentModal.svelte'
  import { forcePollingStop, optionsStore, paymentErrorsStore } from './store'
  import StreamPaymentModal from "./StreamPaymentModal.svelte";
  import { checkInvalidOptions } from './utils.svelte'

  const options = get(optionsStore)
  const paymentSessionIdUrlKey = "orderId"

  const PUBLIC_STRIPE_KEY = process.env.PUBLIC_STRIPE_KEY
  // SECRET_STRIPE_KEY= TODO: will be valued when ready for prod

  let qrCodeValue
  let paymentDataBySessionId // used to retrieve the payment data from the session id
  let paymentData // used for testing the sdk purposes

  // validating options object provided in the render method
  let loadDataError = checkInvalidOptions(options)

  let pwtModalVisible = false
  let paymentShortReference

  let cardModalVisible = false
  let stripe

  let streamModalVisible = false
  let streamPaymentData

  onMount(async () => {
    stripe = await loadStripe(PUBLIC_STRIPE_KEY);

    const urlParams = new URLSearchParams(location.search);

    if (urlParams.has(paymentSessionIdUrlKey)) {
      const paymentSessionId = urlParams.get(paymentSessionIdUrlKey)

      try {
        paymentDataBySessionId = await options.fetchPaymentDataBySessionId(paymentSessionId)
      } catch (e) {
        options.failurePaymentCallback(e)
        loadDataError = true
        console.warn('There was an issue with loading data for this payment')
      }
    }
  })

  const paymentTypeToProvider = (paymentType) => {
    if (paymentType === "card") return "STRIPE";
    if (paymentType === "pwt") return "TOONIE";
  }

  const onButtonClick = async (selectedPaymentType) => {
    // reset forcePollingStop because it could have been valued from the modal closing
    forcePollingStop.set(undefined);

    try {
      if (selectedPaymentType === "stream") {
        try {
          streamPaymentData = await options.createStreamPaymentIntent(
            paymentDataBySessionId?.amount,
            paymentDataBySessionId?.currency,
          );

          if (streamPaymentData.intentId) {
            loadDataError = false;
          } else {
            loadDataError = true;
            console.warn('Error loading payment data: intentId missing')
          }

          qrCodeValue = JSON.stringify({
            paymentSessionId: streamPaymentData.intentStreamId,
            amount: `${streamPaymentData.amount}`,
            currency: streamPaymentData.currency.toLowerCase(),
            destinationWalledId: streamPaymentData.walletId,
            reason: streamPaymentData.reason,
            $: "Stream",
          })
          streamModalVisible = true
        } catch (error) {
          options.failurePaymentCallback(error)
          loadDataError = true
          console.warn('There was an issue with loading data for this stream')
        }
      } else {
        if (!paymentDataBySessionId) {
          paymentData = await options.createPaymentSession()
        }

        if (paymentData?.paymentSessionId || paymentDataBySessionId?.paymentSessionId) {
          const paymentProvider = paymentTypeToProvider(selectedPaymentType);

          try {
            paymentData = await options.initiatePayment(
              paymentDataBySessionId?.paymentSessionId,
              paymentDataBySessionId?.amount,
              paymentDataBySessionId?.currency,
              paymentProvider,
              paymentDataBySessionId?.reason,
            );

          } catch (error) {
            options.failurePaymentCallback(error)
            loadDataError = true
            console.warn('There was an issue initiating the payment session')
          }

          switch (selectedPaymentType) {
            case "card":
              if (paymentData.clientSecret && paymentData.stripePaymentIntentId) {
                loadDataError = false;
                cardModalVisible = true;
              } else {
                loadDataError = true;
                console.warn('Error on loading payment data: missing clientSecret or paymentId')
              }
              break;
            case "pwt":
              paymentShortReference = paymentData.paymentShortReference
              qrCodeValue = JSON.stringify({
                paymentSessionId: paymentData.offersSessionId,
                otp: paymentData.otp,
                $: 'PWT',
              })
              pwtModalVisible = true
          }
        } else {
          loadDataError = true
          console.warn('Error on loading payment data: missing paymentSessionId')
        }
      }
    } catch (error) {
      options.genericErrorCallback && options.genericErrorCallback(error)
      loadDataError = true
      console.warn(`There was an issue with loading data for this payment: ${error}`)
    }
  }

  const closeModal = () => {
    pwtModalVisible = false
    cardModalVisible = false
    streamModalVisible = false

    const paymentError = get(paymentErrorsStore)
    options.onModalClose(paymentError)

    forcePollingStop.set(true)
  }
</script>

<div>
    {#if options.renderPayWithToonieButton}
        <button on:click={() => onButtonClick("pwt")} class="primary-btn">
            <span class="primary-btn__text">Pay with</span>
            <svg
                    width="92"
                    height="27"
                    viewBox="0 0 92 27"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
            >
                <path
                        d="M0 7.908C0 7.1205 0.638152 6.52036 1.38764 6.52036H3.3727V3.14766C3.3727 2.28683 4.04615 1.64868 4.87168 1.64868C5.7325 1.64868 6.37066 2.28683 6.37066 3.14766V6.52036H11.3184C12.0679 6.52036 12.706 7.1205 12.706 7.908C12.706 8.65749 12.0679 9.29564 11.3184 9.29564H6.37066V17.7654C6.37066 21.2495 8.35572 23.1232 11.3184 23.1232C12.0679 23.1232 12.706 23.7613 12.706 24.5108C12.706 25.2983 12.0679 25.9338 11.3184 25.9338C6.67208 25.9338 3.3727 22.7864 3.3727 17.7654V9.29564H1.38764C0.638152 9.29564 0 8.65749 0 7.908Z"
                        fill="#F4B31D"
                />
                <path
                        d="M11.582 16.0782C11.582 10.5331 15.8536 6.14746 21.4747 6.14746C27.0959 6.14746 31.3294 10.5331 31.3294 16.0782C31.3294 21.6233 27.0959 26.0089 21.4747 26.0089C15.8536 26.0089 11.582 21.6233 11.582 16.0782ZM28.2935 16.0782C28.2935 12.1054 25.3335 8.92003 21.472 8.92003C17.6132 8.92003 14.6153 12.1054 14.6153 16.0782C14.6153 20.013 17.6132 23.2364 21.472 23.2364C25.3335 23.2336 28.2935 20.013 28.2935 16.0782Z"
                        fill="#F4B31D"
                />
                <path
                        d="M31.4434 16.0782C31.4434 10.5331 35.7149 6.14746 41.3361 6.14746C46.9572 6.14746 51.1908 10.5331 51.1908 16.0782C51.1908 21.6233 46.9572 26.0089 41.3361 26.0089C35.7176 26.0089 31.4434 21.6233 31.4434 16.0782ZM48.1575 16.0782C48.1575 12.1054 45.1976 8.92003 41.3361 8.92003C37.4773 8.92003 34.4793 12.1054 34.4793 16.0782C34.4793 20.013 37.4773 23.2364 41.3361 23.2364C45.1976 23.2336 48.1575 20.013 48.1575 16.0782Z"
                        fill="#F4B31D"
                />
                <path
                        d="M52.166 14.8024C52.166 9.36861 55.8021 6.14526 60.3724 6.14526C64.9806 6.14526 68.6167 9.36861 68.6167 14.8024V24.3964C68.6167 25.2572 67.9433 25.9334 67.1178 25.9334C66.2569 25.9334 65.6188 25.2599 65.6188 24.3964V14.7291C65.6188 10.9056 63.2943 8.92055 60.3724 8.92055C57.4858 8.92055 55.164 10.9056 55.164 14.7291V24.3964C55.164 25.2572 54.4905 25.9334 53.665 25.9334C52.8042 25.9334 52.166 25.2599 52.166 24.3964V14.8024Z"
                        fill="#F4B31D"
                />
                <path
                        d="M70.0352 1.87372C70.0352 0.825524 70.8607 0 71.9089 0C72.9218 0 73.7826 0.825524 73.7826 1.87372C73.7826 2.88662 72.9218 3.74744 71.9089 3.74744C70.8607 3.74744 70.0352 2.88662 70.0352 1.87372ZM70.4099 7.72028C70.4099 6.89475 71.0481 6.2213 71.9089 6.2213C72.7344 6.2213 73.4078 6.89475 73.4078 7.72028V24.3964C73.4078 25.2572 72.7344 25.9334 71.9089 25.9334C71.0481 25.9334 70.4099 25.2599 70.4099 24.3964V7.72028Z"
                        fill="#F4B31D"
                />
                <path
                        d="M74.3496 16.0782C74.3496 10.5331 78.6212 6.14746 84.2423 6.14746C86.9769 6.14746 89.2633 7.19566 90.7243 8.54528C91.061 8.84399 91.2864 9.25675 91.2864 9.70753C91.2864 10.0823 91.1751 10.419 90.8003 10.8318L84.131 18.8127C83.8323 19.1495 83.4928 19.2988 83.0828 19.2988C82.2573 19.2988 81.6598 18.7367 81.6598 17.9492C81.6598 17.6125 81.7359 17.2757 81.9966 17.0123L87.8431 10.1176C86.8682 9.29206 85.4833 8.91731 84.245 8.91731C80.4216 8.91731 77.3883 12.0646 77.3883 16.0755C77.3883 20.0483 80.3863 23.2336 84.245 23.2336C86.3822 23.2336 88.0685 22.2968 89.228 20.9852C89.6408 20.6104 89.9775 20.3117 90.5016 20.3117C91.3625 20.3117 92.0006 20.9119 92.0006 21.7347C92.0006 22.0334 91.8132 22.4461 91.5498 22.7476C89.9748 24.6213 87.3896 26.0089 84.2423 26.0089C78.6592 26.0089 74.3496 21.6233 74.3496 16.0782Z"
                        fill="#F4B31D"
                />
            </svg>
        </button>

        <PaymentModal
                {pwtModalVisible}
                {paymentShortReference}
                {qrCodeValue}
                {loadDataError}
                {paymentData}
                sessionId={paymentDataBySessionId?.paymentSessionId}
                {closeModal}
                successUrl="{paymentDataBySessionId?.successUrl}"
                errorUrl="{paymentDataBySessionId?.errorUrl}"
        />
    {/if}

    {#if options.renderStreamWithToonieButton}
        <button on:click={() => onButtonClick("stream")} class="primary-btn">
            <span class="primary-btn__text">Stream with</span>
            <svg
                    width="92"
                    height="27"
                    viewBox="0 0 92 27"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
            >
                <path
                        d="M0 7.908C0 7.1205 0.638152 6.52036 1.38764 6.52036H3.3727V3.14766C3.3727 2.28683 4.04615 1.64868 4.87168 1.64868C5.7325 1.64868 6.37066 2.28683 6.37066 3.14766V6.52036H11.3184C12.0679 6.52036 12.706 7.1205 12.706 7.908C12.706 8.65749 12.0679 9.29564 11.3184 9.29564H6.37066V17.7654C6.37066 21.2495 8.35572 23.1232 11.3184 23.1232C12.0679 23.1232 12.706 23.7613 12.706 24.5108C12.706 25.2983 12.0679 25.9338 11.3184 25.9338C6.67208 25.9338 3.3727 22.7864 3.3727 17.7654V9.29564H1.38764C0.638152 9.29564 0 8.65749 0 7.908Z"
                        fill="#F4B31D"
                />
                <path
                        d="M11.582 16.0782C11.582 10.5331 15.8536 6.14746 21.4747 6.14746C27.0959 6.14746 31.3294 10.5331 31.3294 16.0782C31.3294 21.6233 27.0959 26.0089 21.4747 26.0089C15.8536 26.0089 11.582 21.6233 11.582 16.0782ZM28.2935 16.0782C28.2935 12.1054 25.3335 8.92003 21.472 8.92003C17.6132 8.92003 14.6153 12.1054 14.6153 16.0782C14.6153 20.013 17.6132 23.2364 21.472 23.2364C25.3335 23.2336 28.2935 20.013 28.2935 16.0782Z"
                        fill="#F4B31D"
                />
                <path
                        d="M31.4434 16.0782C31.4434 10.5331 35.7149 6.14746 41.3361 6.14746C46.9572 6.14746 51.1908 10.5331 51.1908 16.0782C51.1908 21.6233 46.9572 26.0089 41.3361 26.0089C35.7176 26.0089 31.4434 21.6233 31.4434 16.0782ZM48.1575 16.0782C48.1575 12.1054 45.1976 8.92003 41.3361 8.92003C37.4773 8.92003 34.4793 12.1054 34.4793 16.0782C34.4793 20.013 37.4773 23.2364 41.3361 23.2364C45.1976 23.2336 48.1575 20.013 48.1575 16.0782Z"
                        fill="#F4B31D"
                />
                <path
                        d="M52.166 14.8024C52.166 9.36861 55.8021 6.14526 60.3724 6.14526C64.9806 6.14526 68.6167 9.36861 68.6167 14.8024V24.3964C68.6167 25.2572 67.9433 25.9334 67.1178 25.9334C66.2569 25.9334 65.6188 25.2599 65.6188 24.3964V14.7291C65.6188 10.9056 63.2943 8.92055 60.3724 8.92055C57.4858 8.92055 55.164 10.9056 55.164 14.7291V24.3964C55.164 25.2572 54.4905 25.9334 53.665 25.9334C52.8042 25.9334 52.166 25.2599 52.166 24.3964V14.8024Z"
                        fill="#F4B31D"
                />
                <path
                        d="M70.0352 1.87372C70.0352 0.825524 70.8607 0 71.9089 0C72.9218 0 73.7826 0.825524 73.7826 1.87372C73.7826 2.88662 72.9218 3.74744 71.9089 3.74744C70.8607 3.74744 70.0352 2.88662 70.0352 1.87372ZM70.4099 7.72028C70.4099 6.89475 71.0481 6.2213 71.9089 6.2213C72.7344 6.2213 73.4078 6.89475 73.4078 7.72028V24.3964C73.4078 25.2572 72.7344 25.9334 71.9089 25.9334C71.0481 25.9334 70.4099 25.2599 70.4099 24.3964V7.72028Z"
                        fill="#F4B31D"
                />
                <path
                        d="M74.3496 16.0782C74.3496 10.5331 78.6212 6.14746 84.2423 6.14746C86.9769 6.14746 89.2633 7.19566 90.7243 8.54528C91.061 8.84399 91.2864 9.25675 91.2864 9.70753C91.2864 10.0823 91.1751 10.419 90.8003 10.8318L84.131 18.8127C83.8323 19.1495 83.4928 19.2988 83.0828 19.2988C82.2573 19.2988 81.6598 18.7367 81.6598 17.9492C81.6598 17.6125 81.7359 17.2757 81.9966 17.0123L87.8431 10.1176C86.8682 9.29206 85.4833 8.91731 84.245 8.91731C80.4216 8.91731 77.3883 12.0646 77.3883 16.0755C77.3883 20.0483 80.3863 23.2336 84.245 23.2336C86.3822 23.2336 88.0685 22.2968 89.228 20.9852C89.6408 20.6104 89.9775 20.3117 90.5016 20.3117C91.3625 20.3117 92.0006 20.9119 92.0006 21.7347C92.0006 22.0334 91.8132 22.4461 91.5498 22.7476C89.9748 24.6213 87.3896 26.0089 84.2423 26.0089C78.6592 26.0089 74.3496 21.6233 74.3496 16.0782Z"
                        fill="#F4B31D"
                />
            </svg>
        </button>

        <StreamPaymentModal
                {streamModalVisible}
                {qrCodeValue}
                {loadDataError}
                {streamPaymentData}
                {closeModal}
                successUrl="{paymentDataBySessionId?.successUrl}"
                errorUrl="{paymentDataBySessionId?.errorUrl}"
        />
    {/if}

    {#if stripe && options.renderPayWithCardButton}
        <Elements {stripe}>
            <button on:click={() => onButtonClick("card")} class="primary-btn primary-btn--card">
                <span class="primary-btn__text">Pay with Card</span>
            </button>
            {#if cardModalVisible}
                <CardPaymentModal
                        {cardModalVisible}
                        {loadDataError}
                        {stripe}
                        {paymentData}
                        {closeModal}
                        successUrl="{paymentDataBySessionId?.successUrl}"
                        errorUrl="{paymentDataBySessionId?.errorUrl}"
                />
            {/if}
        </Elements>
    {/if}
</div>

<style lang="scss">
  @import url('https://fonts.googleapis.com/css2?family=Comfortaa&display=swap');

  :root {
    --toonie-primary-color: #133d59;
    --toonie-secondary-color: #f4b31d;
    --toonie-main-white: #fff;
    --toonie-error-color: #b22929;
    --toonie-grey-color: #797979;
  }

  .primary-btn {
    background-color: var(--toonie-primary-color);
    color: var(--toonie-secondary-color);
    cursor: pointer;
    padding: 0.5rem 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 30px;
    font-family: 'Comfortaa', cursive;
    transition: 0.3s;
    margin-top: 1rem;

    &:hover {
      background-color: var(--toonie-secondary-color);
      color: var(--toonie-primary-color);

      path {
        fill: var(--toonie-primary-color);
      }
    }

    &__text {
      padding-top: 5px;
      padding-right: 5px;
    }

    &--card {
      background-color: var(--toonie-secondary-color);
      color: var(--toonie-primary-color);

      &:hover {
        background-color: #e8a520;
        color: var(--toonie-primary-color);
      }
    }
  }
</style>
