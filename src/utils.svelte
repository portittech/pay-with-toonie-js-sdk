<script context="module">
  // helper that validates options object and returns true if something is invalid

  export const checkInvalidOptions = options => {
    // options should be an object and should be not null
    if (typeof options !== "object" || options === null) {
      console.warn("options must be an object");
      return true;
    }

    // options.baseUrl should be a string
    if (options.baseUrl && typeof options.baseUrl !== "string") {
      console.warn("baseUrl must be a string");
      return true;
    }

    // options.createPaymentSession is required
    if (!options.createPaymentSession) {
      console.warn("createPaymentSession is required");
      return true;
    }

    // options.createPaymentSession should be a function type
    if (typeof options.createPaymentSession !== "function") {
      console.warn("createPaymentSession must be a function");
      return true;
    }

    // options.failurePaymentCallback is provided it should be a function
    if (
      options.failurePaymentCallback &&
      typeof options.failurePaymentCallback !== "function"
    ) {
      console.warn("failurePaymentCallback must be a function");
      return true;
    }

    // options.successPaymentCallback is provided it should be a function
    if (
      options.successPaymentCallback &&
      typeof options.successPaymentCallback !== "function"
    ) {
      console.warn("successPaymentCallback must be a function");
      return true;
    }

    // if options.genericErrorCallback is provided it should be a function
    if (
      options.genericErrorCallback &&
      typeof options.genericErrorCallback !== "function"
    ) {
      console.warn("genericErrorCallback must be a function");
      return true;
    }

    // if options.genericErrorCallback is provided it should be a function
    if (
      options.onModalClose &&
      typeof options.onModalClose !== "function"
    ) {
      console.warn("onModalClose must be a function");
      return true;
    }

    return false;
  };
</script>
