// Stand-in for an outside AI service that writes order confirmation messages.
// Mode is read from VENDOR_MODE (default "ok"): ok | slow | down | garbage.
// WHY: in real life this is somebody else's server. You cannot make a real vendor
// fail on command, so tonight we own one that can.

function wait(ms) {
  // Timers here are unref'd: once a caller has moved on past its own
  // deadline (see withTimeout in reliability.js), an abandoned "slow"
  // vendor call must not keep the process alive until it finally answers.
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (timer.unref) timer.unref();
  });
}

async function getConfirmationMessage(orderId) {
  const mode = process.env.VENDOR_MODE || "ok";

  if (mode === "ok") {
    await wait(50);
    return `Your order ${orderId} is confirmed and will ship within 2 days.`;
  }

  if (mode === "slow") {
    await wait(10000);
    return `Your order ${orderId} is confirmed and will ship within 2 days.`;
  }

  if (mode === "down") {
    await wait(50);
    const err = new Error("500 Internal Server Error: vendor unavailable");
    err.status = 500;
    throw err;
  }

  if (mode === "garbage") {
    await wait(50);
    return "As an AI I cannot verify this order right now.";
  }

  throw new Error(`Unknown VENDOR_MODE: ${mode}`);
}

module.exports = { getConfirmationMessage };
