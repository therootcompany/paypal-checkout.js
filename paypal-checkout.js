"use strict";

let request = require("@root/request");

let PayPal = {};
PayPal.init = function (client_id, client_secret) {
  PayPal.__sandboxUrl = "https://api-m.sandbox.paypal.com";
  PayPal.__baseUrl = PayPal.__sandboxUrl;
  PayPal.__id = client_id;
  PayPal.__secret = client_secret;
};
PayPal.request = async function _paypalRequest(reqObj) {
  let headers = {};
  if (reqObj.request_id) {
    // Optional and if passed, helps identify idempotent requests
    headers["PayPal-Request-Id"] = reqObj.request_id;
  }
  // ex: https://api-m.sandbox.paypal.com/v1/billing/subscriptions
  reqObj.url = `${PayPal.__baseUrl}${reqObj.url}`;
  reqObj.headers = Object.assign(headers, reqObj.headers || {});
  reqObj.auth = {
    user: PayPal.__id,
    pass: PayPal.__secret,
  };
  return await request(reqObj).then(sanitize);
};

function justBody(resp) {
  return resp.body;
}

function sanitize(resp) {
  resp = resp.toJSON();
  Object.keys(resp.headers).forEach(function (k) {
    if (k.toLowerCase().match(/Auth|Cookie|Token|Key/i)) {
      resp.headers[k] = "[redacted]";
    }
  });
  Object.keys(resp.request.headers).forEach(function (k) {
    if (k.toLowerCase().match(/Auth|Cookie|Token|Key/i)) {
      resp.request.headers[k] = "[redacted]";
    }
  });
  return resp;
}

function must201or200(resp) {
  if (![200, 201].includes(resp.statusCode)) {
    let err = new Error("[@root/paypal-checkout] bad response");
    err.response = resp;
    throw err;
  }
  return resp;
}

/*
function enumify(obj) {
  Object.keys(obj).forEach(function (k) {
    obj[k] = k;
  });
}
*/

let Product = {};

// SaaS would be type=SERVICE, category=SOFTWARE
Product.types = {
  DIGITAL: "DIGITAL",
  PHYSICAL: "PHYSICAL",
  SERVICE: "SERVICE",
};
Product.__typeNames = Object.keys(Product.types);

// Documented under "categories" at
// https://developer.paypal.com/docs/api/catalog-products/v1/
Product.categories = require("./lib/categories.json");
Product.__categoryNames = Object.keys(Product.categories);
/*
Product.categories = {
  SOFTWARE: "SOFTWARE",
  PHYSICAL_GOOD: "PHYSICAL_GOOD",
  DIGITAL_MEDIA_BOOKS_MOVIES_MUSIC: "DIGITAL_MEDIA_BOOKS_MOVIES_MUSIC",
  DIGITAL_GAMES: "DIGITAL_GAMES",
};
*/

Product.create = async function _createProduct({
  request_id,
  name,
  description,
  type,
  category,
  image_url,
  home_url,
}) {
  if (request_id) {
    if (!request_id.startsWith("PROD-")) {
      console.warn(`Warn: product ID should start with "PROD-"`);
    }
  }
  if (!Product.__typeNames.includes(type)) {
    console.warn(`Warn: unknown product type '${type}'`);
  }
  if (!Product.__categoryNames.includes(category)) {
    console.warn(`Warn: unknown product category '${category}'`);
  }

  return await PayPal.request({
    method: "POST",
    url: "/v1/catalogs/products",
    request_id: request_id,
    json: {
      // ex: "Video Streaming Service"
      name: name,
      // ex: "Video streaming service"
      description: description,
      // ex: "SERVICE", "PHYSICAL", "DIGITAL"
      type: type,
      // ex: "SOFTWARE", "PHYSICAL_GOOD"
      category: category,
      // ex: "https://example.com/streaming.jpg"
      image_url: image_url,
      // ex: "https://example.com/home"
      home_url: home_url,
    },
  })
    .then(must201or200)
    .then(justBody);
};
Product.list = async function _listProducts() {
  return await PayPal.request({
    url: "/v1/catalogs/products",
    json: true,
  })
    .then(must201or200)
    .then(justBody);
};

let Plan = {};
Plan.intervals = {
  DAY: "DAY",
  WEEK: "WEEK",
  MONTH: "MONTH",
  YEAR: "YEAR",
};
Plan.tenures = {
  TRIAL: "TRIAL",
  REGULAR: "REGULAR",
};

// See https://developer.paypal.com/docs/api/subscriptions/v1/
Plan.create = async function _createPlan({
  request_id,
  status = "ACTIVE",
  product_id,
  name,
  description = "",
  billing_cycles,
  payment_preferences,
  taxes, // optional
  quantity_supported = false,
}) {
  if (request_id) {
    if (!request_id.startsWith("PLAN-")) {
      // ex: PLAN-18062020-001
      console.warn(`Warn: plan ID should start with "PLAN-"`);
    }
  }
  return await PayPal.request({
    method: "POST",
    url: "/v1/billing/plans",
    request_id: request_id,
    // TODO should we make this the default?
    headers: {
      Prefer: "return=representation",
    },
    json: {
      // ex: "PROD-6XB24663H4094933M"
      product_id: product_id,
      // ex: "Basic Plan"
      name: name,
      // ex: "Basic plan"
      description: description,
      // ex: "CREATED", "ACTIVE", "INACTIVE"
      status: status,
      // ex: TODO
      billing_cycles: billing_cycles.map(function (cycle, i) {
        // sequence is the index in the array,
        // which should never be out-of-order
        if (!cycle.frequency.interval_count) {
          cycle.frequency.interval_count = 1;
        }
        cycle.sequence = i + 1;
        if (!cycle.tenure_type) {
          cycle.tenure_type = Plan.tenures.REGULAR;
        }
        if (!cycle.total_cycles) {
          cycle.total_cycles = 0;
        }
        return cycle;
      }),
      // TODO ???
      payment_preferences: payment_preferences,
      taxes: taxes,
      quantity_supported: quantity_supported,
    },
  })
    .then(must201or200)
    .then(justBody);
};

Plan.list = async function _listPlans() {
  return await PayPal.request({
    url: "/v1/billing/plans",
    json: true,
  })
    .then(must201or200)
    .then(justBody);
};

let Subscription = {};
Subscription.actions = {
  CONTINUE: "CONTINUE",
  SUBSCRIBE_NOW: "SUBSCRIBE_NOW",
};
Subscription.shipping_preferences = {
  GET_FROM_FILE: "GET_FROM_FILE", // provided, or selectable from PayPal addresses
  SET_PROVIDED_ADDRESS: "SET_PROVIDED_ADDRESS", // user can't change it here
  NO_SHIPPING: "NO_SHIPPING", // duh
};
Subscription.payer_selections = {
  PAYPAL: "PAYPAL",
};
Subscription.payee_preferences = {
  UNRESTRICTED: "UNRESTRICTED",
  IMMEDIATE_PAYMENT_REQUIRED: "IMMEDIATE_PAYMENT_REQUIRED",
};

Subscription.createRequest = async function _createSubscription({
  request_id,
  plan_id,
  start_time,
  quantity,
  shipping_amount,
  subscriber,
  application_context,
}) {
  return await PayPal.request({
    method: "POST",
    url: "/v1/billing/subscriptions",
    request_id: request_id,
    json: {
      // ex: "P-5ML4271244454362WXNWU5NQ"
      plan_id: plan_id,
      // ex: "2018-11-01T00:00:00Z" (must be in the future)
      start_time: start_time,
      // ex: "20"
      quantity: quantity,
      // ex: { currency_code: "USD", value: "10.00", },
      shipping_amount: shipping_amount,
      /* ex:
				{
					name: { given_name: "John", surname: "Doe" },
					email_address: "customer@example.com",
					shipping_address: {
						name: { full_name: "John Doe" },
						address: {
							address_line_1: "123 Sesame Street",
							address_line_2: "Building 17",
							admin_area_2: "San Jose",
							admin_area_1: "CA",
							postal_code: "95131",
							country_code: "US",
						},
					}
				}
      */
      subscriber: subscriber,
      /* ex:
				{
					brand_name: "walmart",
					locale: "en-US",
					shipping_preference: "SET_PROVIDED_ADDRESS",
					user_action: "SUBSCRIBE_NOW",
					payment_method: {
						payer_selected: "PAYPAL",
						payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
					},
					return_url: "https://example.com/returnUrl",
					cancel_url: "https://example.com/cancelUrl",
				}
      */
      application_context: application_context,
    },
  })
    .then(must201or200)
    .then(justBody);
};

Subscription.get = async function _getSubscription(id) {
  return await PayPal.request({
    url: `/v1/billing/subscriptions/${id}`,
    json: true,
  })
    .then(must201or200)
    .then(justBody);
};

module.exports.init = PayPal.init;
module.exports.request = PayPal.request;
module.exports.Plan = Plan;
module.exports.Product = Product;
module.exports.Subscription = Subscription;
