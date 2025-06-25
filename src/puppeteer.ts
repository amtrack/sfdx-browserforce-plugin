export const setCheckboxMapFn = (check: boolean) =>
  check
    ? (checkbox: HTMLInputElement) => (checkbox.checked = true)
    : (checkbox: HTMLInputElement) => (checkbox.checked = false);
