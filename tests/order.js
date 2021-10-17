"use strict";

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.secret" });

if (!process.env.PAYPAL_CLIENT_ID) {
  console.error(
    "Please copy example.env to .env and update the values from the PayPal API Dashboard at https://developer.paypal.com/developer/applications"
  );
  process.exit(1);
}

let PayPal = require("../");
let { Order } = PayPal;

async function test() {
  let ppcOrder = await Order.createRequest({
    application_context: {
      brand_name: "Bliss via The Root Group, LLC",
      shipping_preference: "NO_SHIPPING",
      // ("checkout with paypal") or "BILLING" (credit card) or NO_PREFERENCE
      landing_page: "LOGIN",
      user_action: "PAY_NOW",
      return_url: `https://example.com/api/redirects/paypal-checkout/return`,
      cancel_url: `https://example.com/api/redirects/paypal-checkout/cancel`,
    },
    purchase_units: [
      {
        request_id: 0,
        custom_id: "xxxx", // Our own (User x Product) ID
        description: "1 year of pure Bliss", // shown in PayPal Checkout Flow UI
        soft_descriptor: "Bliss", // on the charge (credit card) statement
        amount: {
          currency_code: "USD",
          value: "10.00",
        },
      },
    ],
  });

  console.info();
  console.info("Order:");
  console.info(JSON.stringify(ppcOrder, null, 2));

  // wait for user to click URL and accept
  await new Promise(function (resolve) {
    console.info();
    console.info("Please approve the order at the following URL:");
    console.info();
    console.info(
      "Approve URL:",
      ppcOrder.links.find(function (link) {
        return "approve" === link.rel;
      }).href
    );
    console.info("Username:", process.env.PAYPAL_SANDBOX_EMAIL);
    console.info("Password:", process.env.PAYPAL_SANDBOX_PASSWORD);
    console.info();
    console.info("Did you approve it? Hit the <any> key to continue...");
    console.info();
    process.stdin.once("data", resolve);
  });
  process.stdin.pause();

  let ppcCapture = await Order.capture(ppcOrder.id, {
    note_to_payer: undefined,
    final_order: true,
  });

  console.info();
  console.info("Capture:");
  console.info(JSON.stringify(ppcCapture, null, 2));

  console.info();
}

if (require.main === module) {
  PayPal.init(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET,
    "sandbox"
  );
  test().catch(function (err) {
    console.error("Something bad happened:");
    console.error(err);
    console.error(JSON.stringify(err, null, 2));
  });
}
