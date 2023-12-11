<script>
  import QrCode from "svelte-qrcode";

  export let codeValue;

  // size of the QrCode square in pixels
  const squareSize = 130;
</script>

<div class="container">
    <QrCode value={codeValue} size={squareSize}/>
</div>
