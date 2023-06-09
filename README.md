# Pay with Toonie SDK

## Documentation

Further official integration documentation can be found [here](https://github.com/portittech/pay-with-toonie-doc).

### Usage

```html

<script src="https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.css"/>

<div>
    <div id="print-here-toonie-payment-form"></div>
</div>
```

```js
const getTokenData = async () => {
  // Auth to get token
  // ATTENTION: MAKE SURE NOT TO INCLUDE THIS AUTHENTICATION SNIPPET IN YOUR CLIENTSIDE APPLICATION
  // THIS HAS BEEN DONE FOR DEMONSTRATION PURPOSES ONLY!!!!
  const tokenRes = await fetch(
    "https://<ENVIRONMENT_AUTH_URL>/auth/realms/toonie/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "pay-with-toonie",
        username: "customerusername",
        password: "customerpassword",
      }),
    }
  );

  return await tokenRes.json();
}

const getPaymentData = async () => {
  const tokenData = await getTokenData();

  //Create payment intent
  const res = await fetch("https://<ENVIRONMENT_API_URL>/offers/v1/payments", {
    method: "POST",
    headers: {
      Authorization: ` Bearer ${tokenData.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: "0.05",
      reason: "Test Payment 01",
      destinationWalletId: "<MERCHANTWALLETID>",
      transactionCurrency: "EUR",
    }),
  });

  const data = await res.json();

  // Data to be consumed by the SDK
  return {
    paymentSessionId: data.paymentSessionId,
    otp: data.otp,
    paymentShortReference: data.shortReference,
  };
};

const createCardPaymentIntent = async (paymentSessionId) => {
  const tokenData = await getTokenData();

  const res = await fetch('https://<ENVIRONMENT_API_URL>/acquiring/v1/card/custom', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      "amount": "1.1",
      "walletId": "<MERCHANTWALLETID>",
      "currency": "EUR",
      "paymentSessionId": paymentSessionId,
      "reason": "Test Payment Card 01"
    }),
  });

  const data = await res.json();

  return {
    "clientSecret": data.clientSecret,
    "paymentId": data.paymentIntentId,
  };
}

const approveCardPayment = async (paymentId) => {
  const tokenData = await getTokenData();

  return await fetch(`https://<ENVIRONMENT_API_URL>/acquiring/v1/card/${paymentId}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      "amount": "1.1",
      "walletId": "<MERCHANTWALLETID>",
      "currency": "EUR",
    }),
  });
}

const failurePaymentCallback = err => {
  console.log("userError", err);
};

const successPaymentCallback = data => {
  console.log("Success!!", data);
};

const genericErrorCallback = error => {
  console.error("Error!!", error);
};

const onModalCloseCallback = possiblePaymentStatusInError => {
  if (possiblePaymentStatusInError)
    console.error(possiblePaymentStatusInError);
};

const baseUrl = "https://example_url";

const options = {
  getPaymentData,
  successPaymentCallback,
  failurePaymentCallback,
  genericErrorCallback,
  onModalCloseCallback,
  createCardPaymentIntent,
  approveCardPayment,
  baseUrl,
};
// builds the UI for the form
PayWithToonie.render(
  document.querySelector("#print-here-toonie-payment-form"),
  options
);
PayWithToonie.getStopPollingHandle((stopPollingHandle) => {
  // stopPollingHandle is a function you can call whenever you want to force the polling
})
```

### JS SDK Integration

Pay With Toonie JS SDK [npm package url](https://www.npmjs.com/package/@portittech/pay-with-toonie)  
Pay With Toonie JS
SDK [javascript component](https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.js)  
Pay With Toonie JS SDK [css styles](https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.css)
