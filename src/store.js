import { writable } from "svelte/store";

export const optionsStore = writable();
export const pollingStore = writable();
export const forcePollingStop = writable();

export const paymentErrorsStore = writable();
