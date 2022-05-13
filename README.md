# Pay with Toonie SDK

### Usage

```html
<script src="https://path.to.build.script.js"></script>
<link rel="stylesheet" href="https://path.to.build.script.js"></link>

<div>
  <div id="print-here-toonie-payment-form"></div>
</div>
```

```js
const options = {
    getPaymentData: Promise<{paymentShortReference: string, otp: string, paymentSessionID: string}>
      successPaymentCallback: (data) => void
  failurePaymentCallback: (error: Error) => void
}
// builds the UI for the form
PayWithToonie.render(document.querySelector("#print-here-toonie-payment-form"), options);
```

## JS SDK Integration

Pay With Toonie JS SDK package url: https://link-to-npm-package-here)  
Pay With Toonie JS SDK javascript component: https://link-to-npm-package-here/...js)  
Pay With Toonie JS SDK css styles: https://link-to-npm-package-here/...css)

### Steps
1. Import pay-with-toonie script and css files using the CDN/Package above. You can modify styles using `classNames`
2. Add a place where the button should be shown. ex. `<div id='my-example'></div>`
3. Call the `renderPayWithToonie` method. ex. `renderPayWithToonie(document.querySelector("#my-example"), options)`


`options` is an object with 3 parameters:
* `getPaymentData` is an async function where the create payment session should be called (Authenticated), and should return `paymentShortReference`, `otp` and `paymentSessionID`
* `successPaymentCallback: (data) => void` - (optional)
* `failurePaymentCallback: (error: Error) => void` - (optional)
