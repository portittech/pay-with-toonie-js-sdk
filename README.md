# Pay with Toonie SDK

### Documentation

Further official integration documentation can be found [here](https://github.com/portittech/pay-with-toonie-doc).

### Usage

```html
<script src="https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.js"></script>
<link
  rel="stylesheet"
  href="https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.css"
/>

<div>
  <div id="print-here-toonie-payment-form"></div>
</div>
```

```js
const getPaymentData = async () => {
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

  const tokenData = await tokenRes.json();

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

const failurePaymentCallback = err => {
  console.log("userError", err);
};

const successPaymentCallback = data => {
  console.log("Success!!", data);
};
const options = {
  getPaymentData,
  successPaymentCallback,
  failurePaymentCallback,
};
// builds the UI for the form
PayWithToonie.render(
  document.querySelector("#print-here-toonie-payment-form"),
  options
);
```

### JS SDK Integration

Pay With Toonie JS SDK [npm package url](https://www.npmjs.com/package/@portittech/pay-with-toonie)  
Pay With Toonie JS SDK [javascript component](https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.js)  
Pay With Toonie JS SDK [css styles](https://unpkg.com/@portittech/pay-with-toonie/dist/pay-with-toonie.dist.css)
