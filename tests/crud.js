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
  let products = await Product.list();
  console.info();
  console.info("Products:", products.products.length);
  //console.info(JSON.stringify(products, null, 2));

  if (products.products.length) {
    let product = await Product.details(products.products[0].id);
    console.info("Product 0:");
    console.info(JSON.stringify(product, null, 2));

    await Product.update(product.id, {
      description: `Product Description 10${Math.random()}`,
    });
  }

  let plans = await Plan.list();
  console.info();
  console.info("Plans:", plans.plans.length);
  //console.info(JSON.stringify(plans, null, 2));

  if (plans.plans.length) {
    let plan = await Plan.details(plans.plans[0].id);
    console.info("Plan 0:");
    console.info(JSON.stringify(plan, null, 2));

    await Plan.update(plan.id, {
      description: `Plan Description 20${Math.random()}`,
    });
  }

  console.info();
}

if (require.main === module) {
  PayPal.init(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  test().catch(function (err) {
    console.error("Something bad happened:");
    console.error(JSON.stringify(err, null, 2));
  });
}
