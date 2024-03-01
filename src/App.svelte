<script>
  import { loadStripe } from '@stripe/stripe-js'
  import { onMount } from "svelte";
  import { Elements } from "svelte-stripe";
  import { get, readable } from 'svelte/store'
  import packageJson from "../package.json"
  import CardPaymentModal from "./CardPaymentModal.svelte";
  import PaymentModal from './PaymentModal.svelte'
  import { forcePollingStop, optionsStore, paymentErrorsStore } from './store'
  import StreamPaymentModal from "./StreamPaymentModal.svelte";
  import { checkInvalidOptions } from './utils.svelte'


  const options = get(optionsStore)
  const paymentSessionIdUrlKey = "orderId"
  const toonieRedirectUrl = "https://www.toonieglobal.com/"

  const PUBLIC_STRIPE_KEY = process.env.PUBLIC_STRIPE_KEY

  const version = readable(packageJson.version);

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

  let isPaymentAlreadyCompleted = false

  onMount(async () => {
    stripe = await loadStripe(PUBLIC_STRIPE_KEY);

    const urlParams = new URLSearchParams(location.search);

    if (urlParams.has(paymentSessionIdUrlKey)) {
      const paymentSessionId = urlParams.get(paymentSessionIdUrlKey)

      try {
        paymentDataBySessionId = await options.fetchPaymentDataBySessionId(paymentSessionId)

        // TODO: change this into a "content not allowed" like page
        //  if a user come back to the same page after the payment, it should not see any info of the last payment
        if (paymentDataBySessionId.status === "SUCCEEDED" || paymentDataBySessionId.status === "APPROVED") isPaymentAlreadyCompleted = true;
      } catch (e) {
        options.failurePaymentCallback(e)
        loadDataError = true
        console.warn('There was an issue with loading data for this payment')
      }
    } else window.location.href = toonieRedirectUrl
  })

  const getProviderNameFromPaymentType = (paymentType) => {
    if (paymentType === "card") return "STRIPE";
    if (paymentType === "pwt") return "TOONIE";
  }

  const formatAmountToDisplay = (amount, currency) => {
    if (!(amount && currency)) return "---";

    return new Intl.NumberFormat('it-IT', {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  const onPaymentButtonClick = async (selectedPaymentType) => {
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
          const paymentProvider = getProviderNameFromPaymentType(selectedPaymentType);

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

  const onCloseModal = () => {
    pwtModalVisible = false
    cardModalVisible = false
    streamModalVisible = false

    const paymentError = get(paymentErrorsStore)
    options.onModalClose(paymentError)

    forcePollingStop.set(true)
  }
</script>

<div class="main">
  <div class="left-side">
    <svg class="position-top-left" fill="none" height="439" viewBox="0 0 261 439" width="261"
         xmlns="http://www.w3.org/2000/svg">
      <path
              d="M163.548 -51.0905C185.852 -31.0771 224.049 11.8994 226.686 62.6258C229.356 113.979 208.372 169.318 164.368 176.005C126.875 181.703 94.4245 125.828 106.695 97.8878C118.301 71.4586 170.812 94.8658 193.769 112.364C225.228 136.343 276.114 205.812 255.844 268.047C241.976 310.626 199.352 360.259 143.048 350.255C84.2086 339.802 43.4329 189.742 97.162 208.398C132.872 220.797 154.378 257.817 143.048 302.102C132.161 344.657 71.7345 420.832 -60.9003 438.481"
              stroke="#86BBD8" stroke-linecap="round" stroke-opacity="0.7" stroke-width="0.5"/>
    </svg>
    <div class="card">
      <!-- TODO: Show the user merchant name initials as the icon when it will be returned by the API -->
      <div class="icon">--</div>
      <h1 class="title">{isPaymentAlreadyCompleted ? "---" : formatAmountToDisplay(paymentDataBySessionId?.amount, paymentDataBySessionId?.currency)}</h1>
      <h3 class="subtitle">Total cart</h3>
      <div class="row">
        <p class="label">Reason:</p>
        <p class="value">{isPaymentAlreadyCompleted ? "---" : paymentDataBySessionId?.reason}</p>
      </div>
      <div class="row">
        <p class="label">Checkout Total:</p>
        <p class="value">
          {isPaymentAlreadyCompleted ? "---" : formatAmountToDisplay(paymentDataBySessionId?.amount, paymentDataBySessionId?.currency)}
        </p>
      </div>
    </div>
    <!-- TODO: will be implemented another card with info about cashback -->
    <!-- <div class="card"> -->
    <!-- </div> -->
  </div>

  <div class="right-side">
    <svg class="position-bottom-right" fill="none" height="570" viewBox="0 0 295 570" width="295"
         xmlns="http://www.w3.org/2000/svg">
      <path
              d="M311.596 0.399892C272.341 10.7911 199.745 39.0869 165.276 98.6661C130.38 158.981 121.567 238.695 170.537 273.905C212.261 303.905 285.879 256.502 288.307 215.222C290.604 176.174 212.808 172.029 174.315 178.982C121.567 188.511 17.3208 240.946 3.39266 328.54C-6.13661 388.47 14.6804 474.646 88.786 497.304C166.229 520.982 307.983 365.072 231.648 354.442C180.913 347.376 132.13 378.781 118.486 439.203C105.375 497.263 131.302 626.446 280.452 729.549"
              stroke="#86BBD8" stroke-linecap="round" stroke-opacity="0.7" stroke-width="0.5"/>
    </svg>

    <svg class="position-bottom-right" fill="none" height="291" viewBox="0 0 276 291" width="276"
         xmlns="http://www.w3.org/2000/svg">
      <circle cx="269.5" cy="269.5" fill="url(#paint0_radial_2123_300)" opacity="0.2" r="269.5"/>
      <defs>
        <radialGradient cx="0" cy="0" gradientTransform="translate(269.5 269.5) rotate(90) scale(269.5)"
                        gradientUnits="userSpaceOnUse" id="paint0_radial_2123_300"
                        r="1">
          <stop stop-color="#F4B31D"/>
          <stop offset="1" stop-color="#F4B31D" stop-opacity="0"/>
        </radialGradient>
      </defs>
    </svg>

    <div class="right-side-content">
      <svg class="pwt-svg-title" fill="none" height="65" viewBox="0 0 230 65" width="230"
           xmlns="http://www.w3.org/2000/svg">
        <path
                d="M0 19.7618C0 17.7937 1.5948 16.2939 3.46784 16.2939H8.42869V7.86523C8.42869 5.71394 10.1117 4.11914 12.1748 4.11914C14.3261 4.11914 15.9209 5.71394 15.9209 7.86523V16.2939H28.2857C30.1587 16.2939 31.7535 17.7937 31.7535 19.7618C31.7535 21.6348 30.1587 23.2296 28.2857 23.2296H15.9209V44.3963C15.9209 53.1033 20.8817 57.7859 28.2857 57.7859C30.1587 57.7859 31.7535 59.3807 31.7535 61.2537C31.7535 63.2218 30.1587 64.8098 28.2857 64.8098C16.6742 64.8098 8.42869 56.9444 8.42869 44.3963V23.2296H3.46784C1.5948 23.2296 0 21.6348 0 19.7618Z"
                fill="#F4B31D"/>
        <path
                d="M28.9434 40.1821C28.9434 26.3243 39.6183 15.3643 53.6662 15.3643C67.714 15.3643 78.294 26.3243 78.294 40.1821C78.294 54.0399 67.714 64.9999 53.6662 64.9999C39.6183 64.9999 28.9434 54.0399 28.9434 40.1821ZM70.7068 40.1821C70.7068 30.2536 63.3096 22.2932 53.6594 22.2932C44.0159 22.2932 36.5238 30.2536 36.5238 40.1821C36.5238 50.0156 44.0159 58.071 53.6594 58.071C63.3096 58.0642 70.7068 50.0156 70.7068 40.1821Z"
                fill="#F4B31D"/>
        <path
                d="M78.5723 40.1821C78.5723 26.3243 89.2473 15.3643 103.295 15.3643C117.343 15.3643 127.923 26.3243 127.923 40.1821C127.923 54.0399 117.343 64.9999 103.295 64.9999C89.254 64.9999 78.5723 54.0399 78.5723 40.1821ZM120.342 40.1821C120.342 30.2536 112.945 22.2932 103.295 22.2932C93.6516 22.2932 86.1594 30.2536 86.1594 40.1821C86.1594 50.0156 93.6516 58.071 103.295 58.071C112.945 58.0642 120.342 50.0156 120.342 40.1821Z"
                fill="#F4B31D"/>
        <path
                d="M130.367 36.9929C130.367 23.4134 139.454 15.3579 150.876 15.3579C162.392 15.3579 171.479 23.4134 171.479 36.9929V60.9692C171.479 63.1205 169.796 64.8103 167.733 64.8103C165.582 64.8103 163.987 63.1273 163.987 60.9692V36.8097C163.987 27.2544 158.178 22.2936 150.876 22.2936C143.662 22.2936 137.859 27.2544 137.859 36.8097V60.9692C137.859 63.1205 136.176 64.8103 134.113 64.8103C131.962 64.8103 130.367 63.1273 130.367 60.9692V36.9929Z"
                fill="#F4B31D"/>
        <path
                d="M175.035 4.68261C175.035 2.06306 177.098 0 179.718 0C182.249 0 184.4 2.06306 184.4 4.68261C184.4 7.21393 182.249 9.36521 179.718 9.36521C177.098 9.36521 175.035 7.21393 175.035 4.68261ZM175.972 19.2937C175.972 17.2306 177.566 15.5476 179.718 15.5476C181.781 15.5476 183.464 17.2306 183.464 19.2937V60.9689C183.464 63.1202 181.781 64.81 179.718 64.81C177.566 64.81 175.972 63.127 175.972 60.9689V19.2937Z"
                fill="#F4B31D"/>
        <path
                d="M185.805 40.1821C185.805 26.3243 196.48 15.3643 210.527 15.3643C217.361 15.3643 223.076 17.9838 226.727 21.3566C227.568 22.1031 228.131 23.1347 228.131 24.2612C228.131 25.1977 227.853 26.0392 226.917 27.0708L210.249 47.016C209.503 47.8575 208.654 48.2307 207.63 48.2307C205.567 48.2307 204.074 46.8259 204.074 44.8579C204.074 44.0164 204.264 43.1749 204.915 42.5166L219.526 25.286C217.09 23.2229 213.629 22.2864 210.534 22.2864C200.979 22.2864 193.399 30.1518 193.399 40.1753C193.399 50.1038 200.891 58.0642 210.534 58.0642C215.875 58.0642 220.09 55.7229 222.987 52.4451C224.019 51.5086 224.86 50.7621 226.17 50.7621C228.321 50.7621 229.916 52.2618 229.916 54.3181C229.916 55.0646 229.448 56.0962 228.79 56.8494C224.854 61.532 218.393 64.9999 210.527 64.9999C196.575 64.9999 185.805 54.0399 185.805 40.1821Z"
                fill="#F4B31D"/>
      </svg>

      <div class="right-side-content" style="margin-bottom: 120px">
        <h2 class="subtitle">Choose your payment method</h2>

        {#if options.renderPayWithToonieButton}
          <button on:click={() => onPaymentButtonClick("pwt")} class:disabled={isPaymentAlreadyCompleted} class="primary-btn">
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
                  {onCloseModal}
                  successUrl="{paymentDataBySessionId?.successUrl}"
                  errorUrl="{paymentDataBySessionId?.errorUrl}"
          />
        {/if}

        {#if options.renderStreamWithToonieButton}
          <button on:click={() => onPaymentButtonClick("stream")} class:disabled={isPaymentAlreadyCompleted} class="primary-btn">
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
                  {onCloseModal}
                  successUrl="{paymentDataBySessionId?.successUrl}"
                  errorUrl="{paymentDataBySessionId?.errorUrl}"
          />
        {/if}

        {#if stripe && options.renderPayWithCardButton}
          <Elements {stripe}>
            <button on:click={() => onPaymentButtonClick("card")} class:disabled={isPaymentAlreadyCompleted} class="primary-btn primary-btn--card">
              <span class="primary-btn__text">Pay with card</span>
            </button>
            {#if cardModalVisible}
              <CardPaymentModal
                      {cardModalVisible}
                      {loadDataError}
                      {stripe}
                      {paymentData}
                      sessionId={paymentDataBySessionId?.paymentSessionId}
                      {onCloseModal}
                      successUrl="{paymentDataBySessionId?.successUrl}"
                      errorUrl="{paymentDataBySessionId?.errorUrl}"
              />
            {/if}
          </Elements>
        {/if}
      </div>
      <div class="footer">
        <span>Powered by</span>
        <svg
                fill="none"
                height="27"
                viewBox="0 0 92 27"
                width="92"
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
      </div>
      <div class="footer" style="margin-top: 10px">
        <span>Version: {$version}</span>
      </div>
    </div>
  </div>
</div>


<style lang="scss">
  @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap');

  :root {
    --toonie-primary-color: #133d59;
    --toonie-secondary-color: #f4b31d;
    --toonie-secondary-color-variant: #e8a520;
    --toonie-grey-color: #797979;
    --toonie-light-grey-color: #91a1ad;
    --main-white-color: #fff;
    --secondary-white-color: #F5F5F5;
    --error-color: #b22929;
    --font-family: 'Comfortaa', sans-serif;
  }

  .disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .primary-btn {
    width: 20rem;
    height: 3rem;
    background-color: var(--toonie-primary-color);
    color: var(--toonie-secondary-color);
    cursor: pointer;
    padding: 0.5rem 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 30px;
    border: 1px solid var(--toonie-primary-color);
    font-family: var(--font-family);
    font-size: 1rem;
    transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    margin-top: 1rem;

    &:hover {
      background-color: var(--toonie-secondary-color);
      color: var(--toonie-primary-color);
      border: 1px solid var(--toonie-secondary-color);

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
      border: 1px solid var(--toonie-secondary-color);

      &:hover {
        background-color: var(--toonie-secondary-color-variant);
        color: var(--toonie-primary-color);
        border: 1px solid var(--toonie-secondary-color-variant);
      }
    }
  }

  .main {
    margin: 0;
    padding: 0;
    font-family: var(--font-family);
    display: flex;
    height: 100%;
    width: 100%;
  }

  .left-side, .right-side {
    box-sizing: border-box;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  .left-side {
    width: 50%;
    background-color: var(--secondary-white-color);
    color: var(--main-white-color);

    .card {
      width: 20rem;
      min-height: 16rem;
      background-color: var(--main-white-color);
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      color: var(--toonie-primary-color);
      position: relative;
      margin-bottom: 1rem;

      p {
        margin: 0;
      }

      .title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 0.6rem;
      }

      .subtitle {
        font-size: 1.25rem;
        font-weight: bold;
        margin-top: 0;
      }

      .icon {
        position: absolute;
        top: -32px;
        left: 50%;
        transform: translateX(-50%);
        width: 3.6rem;
        height: 3.6rem;
        background-color: var(--toonie-secondary-color);
        color: var(--main-white-color);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 1.2rem;
        font-weight: bold;
      }

      .row {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        padding: 0.8rem 1rem;

        .label {
          font-size: 1rem;
          text-align: start;
        }

        .value {
          font-size: 1.125rem;
          font-weight: 600;
          text-align: end;
        }
      }
    }

    .position-top-left {
      position: absolute;
      top: 0;
      left: 0;
    }
  }

  .right-side {
    width: 50%;
    background-color: var(--main-white-color);

    .position-bottom-right {
      position: absolute;
      bottom: 0;
      right: 0;
    }
  }

  .right-side-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .footer {
    margin-top: auto;
    color: var(--toonie-light-grey-color);
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      height: 15px;
      width: 70px;
    }

    span {
      padding-top: 3px;
    }
  }

  .pwt-svg-title {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 3rem;
  }
</style>
