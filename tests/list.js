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
let { Plan, Product, Subscription } = PayPal;

async function test() {
  let products = await Plan.list();
  console.info();
  console.info("Products:");
  console.info(JSON.stringify(products, null, 2));

  let plans = await Plan.list();
  console.info();
  console.info("Plans:");
  console.info(JSON.stringify(plans, null, 2));

  console.info();
}

if (require.main === module) {
  PayPal.init(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  test().catch(function (err) {
    console.error("Something bad happened:");
    console.error(JSON.stringify(err, null, 2));
  });
}
