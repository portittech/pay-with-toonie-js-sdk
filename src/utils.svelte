<script context="module">
  // helper that validates options object and returns true if something is invalid

  export const checkInvalidOptions = options => {
    // options should be an object and should be not null
    if (typeof options !== "object" || options === null) {
      console.warn("options must be an object");
      return true;
    }

    // options.baseUrl is required
    if (!options.baseUrl) {
      console.warn("baseUrl is required");
      return true;
    }

    // options.baseUrl should be a string
    if (typeof options.baseUrl !== "string") {
      console.warn("baseUrl must be a string");
      return true;
    }

    // options.getPaymentData is required
    if (!options.getPaymentData) {
      console.warn("getPaymentData is required");
      return true;
    }

    // options.getPaymentData should be a function type
    if (typeof options.getPaymentData !== "function") {
      console.warn("getPaymentData must be a function");
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

    return false;
  };
</script>
