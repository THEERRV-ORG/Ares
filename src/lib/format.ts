export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Renders the real amount when `visible`, otherwise a fixed placeholder that reveals nothing. */
export function maskedINR(value: number, visible: boolean) {
  return visible ? formatINR(value) : "₹ ******";
}
