"use strict";

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.secret" });

if (!process.env.PAYPAL_CLIENT_ID) {
  console.error(
    "Please copy example.env to .env and update the values from the PayPal API Dashboard at https://developer.paypal.com/developer/applications"
  );
  process.exit(1);
}

let PayPal = require("./");
let { Plan, Product, Subscription } = PayPal;

async function test() {
  console.info();

  let product = await Product.create({
    id: "PROD-test-product-10",
    name: "Test Product #10",
    description: "A great widget for gizmos and gadgets of all ages!",
    type: Product.types.SERVICE,
    category: Product.categories.SOFTWARE,
    image_url: undefined,
    home_url: undefined,
  });
  console.info("Product:");
  console.info(JSON.stringify(product, null, 2));
  console.info();

  let plan = await Plan.create({
    id: "PLAN-test-plan-001",
    product_id: "PROD-2TS60422HM5801517", // product.id,
    name: "Test Plan #1",
    description: "A great plan for pros of all ages!",
    billing_cycles: [
      {
        frequency: {
          interval_unit: Plan.intervals.DAY,
          interval_count: 1,
        },
        tenure_type: Plan.tenures.TRIAL,
        total_cycles: 14,
      },
      {
        frequency: {
          interval_unit: Plan.intervals.YEAR,
          interval_count: 1,
        },
        tenure_type: Plan.tenures.REGULAR,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: "10.00",
            currency_code: "USD",
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: {
        value: "10",
        currency_code: "USD",
      },
      setup_fee_failure_action: "CONTINUE",
      // suspend the subscription after N attempts
      payment_failure_threshold: 3,
    },
    taxes: {
      percentage: "10",
      // was tax included?
      inclusive: false,
    },
  });
  console.info("Plan:");
  console.info(JSON.stringify(plan, null, 2));
  console.info();

  let subscription = await Subscription.createRequest({
    // See https://developer.paypal.com/docs/subscriptions/integrate/#use-the-subscriptions-api
    plan_id: plan.id,
    //start_time: "2018-11-01T00:00:00Z", (must be in the future)
    //quantity: "20",
    //shipping_amount: { currency_code: "USD", value: "10.00" },
    subscriber: {
      name: { given_name: "James", surname: "Doe" },
      email_address: "customer@example.com",
      /*
      shipping_address: {
        name: { full_name: "James Doe" },
        address: {
          address_line_1: "123 Sesame Street",
          address_line_2: "Building 17",
          admin_area_2: "San Jose",
          admin_area_1: "CA",
          postal_code: "95131",
          country_code: "US",
        },
      },
      */
    },
    application_context: {
      brand_name: "root",
      locale: "en-US",
      shipping_preference: Subscription.shipping_preferences.NO_SHIPPING,
      user_action: Subscription.actions.SUBSCRIBE_NOW,
      payment_method: {
        payer_selected: Subscription.payer_selections.PAYPAL,
        payee_preferred:
          Subscription.payee_preferences.IMMEDIATE_PAYMENT_REQUIRED,
      },
      return_url:
        "https://example.com/api/paypal-checkout/return?my_token=abc123",
      cancel_url:
        "https://example.com/api/paypal-checkout/cancel?my_token=abc123",
    },
  });
  console.info("Subscription (Before Approval):");
  console.info(JSON.stringify(subscription, null, 2));
  console.info();

  // wait for user to click URL and accept
  await new Promise(function (resolve) {
    console.info();
    console.info("Please approve the subscription at the following URL:");
    console.info();
    console.info(
      "Approve URL:",
      subscription.links.find(function (link) {
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

  let s = await Subscription.get(subscription.id);
  console.info("Subscription: (After Approval)");
  console.info(JSON.stringify(s, null, 2));
  console.info();
}

if (require.main === module) {
  PayPal.init(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  test().catch(function (err) {
    console.error("Something bad happened:");
    console.error(JSON.stringify(err, null, 2));
  });
}
