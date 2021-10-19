# [@root/paypal-checkout](https://git.rootprojects.org/root/paypal-checkout.js)

In contrast to the official PayPal Checkout SDK - which is auto-generated code
with lots of abstraction without much value - this is very little abstraction,
but specificially designed to be (mostly) idiomatic JavaScript / Node.js. \
(excuse the `snake_case` - that's how the PayPal REST API is designed).

![](https://i.imgur.com/brFTseM.png "PayPal Checkout API Flow")

<img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" alt="Check out with PayPal" />

The Good Documentation™ for the PayPal API (a.k.a. PayPal Checkout SDK) is the
"REST API". See

- <https://developer.paypal.com/docs/api/orders/v2/> (one-time payments)
- <https://developer.paypal.com/docs/api/subscriptions/v1/> (recurring
  subscriptions)
- <https://www.paypal.com/webapps/mpp/logos-buttons> (the buttons)

# Table of Contents

- Install
- QuickStart
  - Orders (One-Time Purchases)
  - PayPal Checkout Buttons
- REST API Overview
  - Orders & Subscriptions
  - Enums
  - Redirects
  - Webhooks
- Security & Notes
- Detailed Examples & Glossary

# Install

```bash
npm install --save @root/paypal-checkout
```

Optional, for Type Linting and Auto-Complete

```bash
npm install --save @root/paypal-checkout-product-categories
```

# Quick Start

If you just want to create a "Buy Now" or "Checkout with PayPal" type of button,
here's the gist of what you need to do:

## Order (One-Time Purchase)

1. Initialize the API

   ```js
   "use strict";

   require("dotenv").config({ path: ".env" });

   let PPC = require("@root/paypal-checkout");

   PPC.init(
     process.env.PAYPAL_CLIENT_ID || "xxxx",
     process.env.PAYPAL_CLIENT_SECRET || "****",
     "sandbox" || "live",
     {
       // default query params for endpoints that use them
       prefer: "return=representation",
       total_required: true,
       page_size: 20,
     }
   );
   ```

2. Create a "Buy Now" link (for Approval)

   ```js
   // See https://developer.paypal.com/docs/api/orders/v2/#orders_create
   let myApiUrl = "https://example.com";
   let myOrderId = "local-db-id-for-user-purchasing-product";
   let order = await PPC.Order.createRequest({
     application_context: {
       // What to show on PayPal's Pay Now page
       brand_name: "Bliss via The Root Group, LLC",
       shipping_preference: "NO_SHIPPING",
       landing_page: "LOGIN",
       user_action: PPC.Order.user_actions.PAY_NOW,
       return_url: `${myApiUrl}/api/redirects/paypal-checkout/return`,
       cancel_url: `${myApiUrl}/api/redirects/paypal-checkout/cancel`,
     },
     purchase_units: [
       {
         request_id: "default",
         custom_id: myOrderId,
         // shown in PayPal Checkout Flow UI
         description: "1 year of pure Bliss",
         // on the charge (credit card) statement
         soft_descriptor: "Bliss",
         amount: {
           currency_code: "USD",
           value: "10.00",
         },
       },
     ],
   });

   console.info(
     "Approve URL:",
     order.links.find(function (link) {
       return "approve" === link.rel;
     }).href
   );
   ```

3. Handle the redirect: Verify & Capture

   ```js
   app.get("/api/redirects/paypal-checkout/return", async function (req, res) {
     let orderId = req.query.token;

     // verify that the user has paid
     await PPC.Order.details(orderId)
       .then(async function (order) {
         console.info("Deliver the Product to:", order.payer.email_address);
         if ("APPROVED" !== order.status) {
           throw new Error("spoofed redirect or cancelled order");
         }

         // take the money
         let capture = await PPC.Order.capture(order.id, {
           final_capture: true,
         });
       })
       .catch(next);
   });
   ```

4. [Set](https://developer.paypal.com/developer/applications) and Handle the
   [`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REVERSED`, and `CUSTOMER.DISPUTE.CREATED`](https://developer.paypal.com/docs/api-basics/notifications/webhooks/event-names/)
   WebHooks

   ```js
   // Set webhook at https://developer.paypal.com/developer/applications
   // Descriptions at https://developer.paypal.com/docs/api-basics/notifications/webhooks/event-names/
   app.get("/api/webhooks/paypal-checkout/:secret", async function (req, res) {
     let crypto = require("crypto");
     let secret = process.env.PAYPAL_WEBHOOK_SECRET || "";
     let guess = req.params.secret;
     if (
       !secret ||
       secret.length !== guess.length ||
       !crypto.timingSafeEqual(Buffer.from(guess), Buffer.from(secret))
     ) {
       next(new Error("bad webhook secret value"));
       return;
     }

     let event = req.body;
     switch (event.event_type) {
       case "PAYMENT.CAPTURE.COMPLETED":
         {
           let orderId = event.supplementary_data.related_ids.order_id;
           let localDbId = event.custom_id;
           console.info(
             `Confirm that PayPal Order ${orderId} for ${localDbId} has been paid.`
           );
         }
         break;
       case "PAYMENT.CAPTURE.REVERSED":
         {
           // deduct from user's account
         }
         break;
       case "CUSTOMER.DISPUTE.CREATED":
         {
           // TODO send email to merchant (myself) to check out the dispute
         }
         break;
       case "CUSTOMER.DISPUTE.CREATED":
         {
           // TODO send email to merchant (myself) to review the dispute status
         }
         break;
       default:
         console.log("Ignoring", event.event_type);
         res.json({ sucess: true });
         return;
     }
   });
   ```

## PayPal Checkout Buttons

- <https://www.paypal.com/webapps/mpp/logos-buttons> <== THE ONE YOU WANT
  - <img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" alt="Check out with PayPal" />
- <https://developer.paypal.com/docs/checkout/>
- <https://www.paypal.com/buttons/>

# API Overview

## Init

```js
PayPal.init(client_id, client_secret, "sandbox", defaults);
PayPal.request({ method, url, headers, json });
```

### No Dependencies Needed

If you'd like to keep your code super lightweight, you don't even need an SDK -
you can just use simple HTTP requests:

```js
let qs = require("querystring");
let request = require("@root/request");
let paypalApi = "https://api-m.sandbox.paypal.com";

async function PayPalRequest(
  endpoint = "/v2/checkout/orders",
  query = { page_size: 20 },
  body = { purchase_units: [] },
  requestId // optional id for certain requests
) {
  let search = qs.stringify(query);

  return await request({
    url: `${paypalApi}${endpoint}?${search}`,
    auth: {
      user: process.env.PAYPAL_CLIENT_ID,
      pass: process.env.PAYPAL_CLIENT_SECRET,
    },
    headers: {
      "PayPal-Request-Id": requestId,
    },
    json: body,
  }).then(function (resp) {
    if (rsep.status < 200 || resp.status >= 300) {
      throw new Error("BAD RESPONSE");
    }
    return resp.toJSON().body;
  });
}
```

## Subscriptions (Recurring Payments)

See https://developer.paypal.com/docs/api/subscriptions/v1/#subscriptions

```txt
                                              // Webhook 'event_type':

PayPal.Product.create({ ... });               // CATALOG.PRODUCT.CREATED
PayPal.Product.list();
PayPal.Product.details(id);
PayPal.Product.update(id, { description });   // CATALOG.PRODUCT.UPDATED

PayPal.Plan.create({ ... });                  // BILLING.PLAN.CREATED
PayPal.Plan.list();
PayPal.Plan.details(id);
PayPal.Plan.update(id, { description });      // BILLING.PLAN.UPDATED

PayPal.Subscription.createRequest({ ... });   // BILLING.SUBSCRIPTION.CREATED
// subscription.links[rel="approve"].href     // BILLING.SUBSCRIPTION.ACTIVATED
                                              // PAYMENT.SALE.COMPLETED
PayPal.Subscription.details(id);
PayPal.Subscription.cancel(id, { reason });
```

## Orders (One-Time Payments)

```txt
                                                // Webhook 'event_type':

PayPal.Order.createRequest({ purchase_units }); // CHECKOUT.ORDER.APPROVED
PayPal.Order.capture(id, { final_capture });    // PAYMENT.CAPTURE.COMPLETED
```

See also:

- <https://developer.paypal.com/docs/api/orders/v2/#orders_create>
- <https://developer.paypal.com/docs/api/orders/v2/#definition-purchase_unit_request>
- <https://developer.paypal.com/docs/api/orders/v2/#definition-order_application_context>

## Enums (optional)

For assistance with Type Linting and Auto-Complete, all of the PayPal Checkout
enums (ALL CAPS strings that have a limit set of allow values such as `PAY_NOW`
and `CONTINUE`) are available in code.

They are defined like this:

```js
Order.user_actions = {
  CONTINUE: "CONTINUE",
  PAY_NOW: "PAY_NOW",
};
```

You can inspect them simply like this:

```js
console.log(Order.user_actions);
```

Here's the full list:

```js
PayPal.Order.intents;
PayPal.Order.user_actions;
PayPal.Order.shipping_preferences;
PayPal.Plan.intervals;
PayPal.Plan.tenures;
PayPal.Product.categories; // See note below
PayPal.Product.types;
PayPal.Subscription.actions;
PayPal.Subscription.payee_preferences;
PayPal.Subscription.payer_selections;
PayPal.Subscription.shipping_preferences;
```

The one exception is `PayPal.Product.categories` which provides only a limited
set of generic values for simple products and services if
`@root/paypal-checkout-product-categories` is not installed.

## Redirects

- `return_url`
- `cancel_url`

### `return_url`

**_Order_** and **_Subscription_** requests have a return `return_url` will be
called with some or all of the following params:

```txt
# Order
https://example.com/redirects/paypal-checkout/return
  ?token=XXXXXXXXXXXXXXXXX
  &PayerID=XXXXXXXXXXXXX
```

- `token` is the **_Order ID_**
- `PayerID` is... exactly what it seems (no idea how you can access the Payer
  object though)

```txt
# Subscrption
https://example.com/redirects/paypal-checkout/return
  ?subscription_id=XXXXXXXXXXXXXX
  &ba_token=BA-00000000000000000
  &token=XXXXXXXXXXXXXXXXX
```

- `subscription_id` refers to both the **_Subscription ID_** and the
  `billing_agreement_id` of the corresponding **_Payments_**.
- `ba_token` (deprecated) refers to `/v1/payments/billing-agreements/:ba_token`
- `token` refers to the **_Order ID_** (perhaps created as part of the setup fee
  or first billing cycle payment).

### `cancel_url`

The `cancel_url` will have the same query params as the `return_url`.

Also, PayPal presents the raw `cancel_url` and will NOT update the order or
subscription status. It's up to you to confirm with the user and change the
status to `CANCELLED`.

## Webhooks

Webhooks can be set up in the Application section of the Dashboard:

- <https://developer.paypal.com/developer/applications>

You'll see a list of applications. Click on one to access the webhooks.

**Security**: You must put a `secret` or `token` or your webhook URLs - PayPal
provides no measure of authentication (and otherwise an attacker could just send
random crap to your webhooks making it look like they've paid for all sorts of
things).

# Security

#### User email addresses

Emails addresses available through the PayPal Checkout API guaranteed to have
been verified by PayPal.

See:

- [Is `resource.subscriber.email_address` verified by PayPal?](https://twitter.com/paypaldev/status/1448238655743488008)
- [How do I receive money through PayPal?](https://www.paypal.com/us/smarthelp/article/how-do-i-receive-money-through-paypal-faq1750)

# Notes

My discussions with Twitter Support (@paypaldev):

- <https://twitter.com/search?q=(from%3Acoolaj86)%20(to%3Apaypaldev)&src=typed_query>

Note: Just about everything in the PayPal SDK that uses `ALL_CAPS` is a
`constant`/`enum` representing an option you can pick from limited number of
options.

Sandbox accounts (for creating fake purchases) can be managed at:
<https://developer.paypal.com/developer/accounts>

## Auth vs Capture

> Authorization and capture enables you to authorize fund availability but delay
> fund capture. This can be useful for merchants who have a delayed order
> fulfillment process. Authorize & Capture also enables merchants to change the
> original authorization amount in case the order changes due to shipping,
> taxes, or gratuity.
>
> For any payment type, you can capture less than or the full original
> authorized amount. You can also capture up to 115% of or $75 USD more than the
> original authorized amount, whichever is less.
>
> See
>
> - <https://developer.paypal.com/docs/admin/auth-capture/>
> - <https://developer.paypal.com/docs/api/payments/v2/#authorizations_capture>

You can auth once and capture multiple times (unless you set `final_capture`).

# Examples

### Subscription.createRequest({ ... })

See
https://developer.paypal.com/docs/subscriptions/integrate/#use-the-subscriptions-api

```js
await Subscription.createRequest({
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
    brand_name: "Bliss via The Root Group, LLC",
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

console.info(
  "Approve URL:",
  subscription.links.find(function (link) {
    return "approve" === link.rel;
  }).href
);
```

# Glossary

## Webhook Event: CHECKOUT.ORDER.APPROVED

```json
{
  "id": "WH-1V203642KU442722T-3S346483MF8733038",
  "event_version": "1.0",
  "create_time": "2021-10-17T05:04:22.404Z",
  "resource_type": "checkout-order",
  "resource_version": "2.0",
  "event_type": "CHECKOUT.ORDER.APPROVED",
  "summary": "An order has been approved by buyer",
  "resource": {
    "create_time": "2021-10-17T05:03:26Z",
    "purchase_units": [
      {
        "reference_id": "{purchase-unit-id}",
        "amount": {
          "currency_code": "USD",
          "value": "10.00"
        },
        "payee": {
          "email_address": "sb-a9xvi8075587@business.example.com",
          "merchant_id": "4RXRQC77UD53U",
          "display_data": {
            "brand_name": "Bliss via The Root Group, LLC"
          }
        },
        "description": "1 year of pure Bliss",
        "custom_id": "{my-local-db-purchase-id}",
        "soft_descriptor": "Bliss"
      }
    ],
    "links": [
      {
        "href": "https://api.sandbox.paypal.com/v2/checkout/orders/4K5112848U951142F",
        "rel": "self",
        "method": "GET"
      },
      {
        "href": "https://api.sandbox.paypal.com/v2/checkout/orders/4K5112848U951142F",
        "rel": "update",
        "method": "PATCH"
      },
      {
        "href": "https://api.sandbox.paypal.com/v2/checkout/orders/4K5112848U951142F/capture",
        "rel": "capture",
        "method": "POST"
      }
    ],
    "id": "4K5112848U951142F",
    "intent": "CAPTURE",
    "payer": {
      "name": {
        "given_name": "John",
        "surname": "Doe"
      },
      "email_address": "sb-ka5d18075586@personal.example.com",
      "payer_id": "YTENGYR8PAF9A",
      "address": {
        "country_code": "US"
      }
    },
    "status": "APPROVED"
  },
  "links": [
    {
      "href": "https://api.sandbox.paypal.com/v1/notifications/webhooks-events/WH-1V203642KU442722T-3S346483MF8733038",
      "rel": "self",
      "method": "GET"
    },
    {
      "href": "https://api.sandbox.paypal.com/v1/notifications/webhooks-events/WH-1V203642KU442722T-3S346483MF8733038/resend",
      "rel": "resend",
      "method": "POST"
    }
  ]
}
```

## Webhook Event: PAYMENT.CAPTURE.COMPLETED

```json
{
  "id": "WH-3UT90572MR669760L-7LL94124G5389840D",
  "event_version": "1.0",
  "create_time": "2021-10-17T05:05:03.389Z",
  "resource_type": "capture",
  "resource_version": "2.0",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "summary": "Payment completed for $ 10.0 USD",
  "resource": {
    "amount": {
      "value": "10.00",
      "currency_code": "USD"
    },
    "seller_protection": {
      "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"],
      "status": "ELIGIBLE"
    },
    "supplementary_data": {
      "related_ids": {
        "order_id": "4K5112848U951142F"
      }
    },
    "update_time": "2021-10-17T05:04:29Z",
    "create_time": "2021-10-17T05:04:29Z",
    "final_capture": true,
    "seller_receivable_breakdown": {
      "paypal_fee": {
        "value": "0.84",
        "currency_code": "USD"
      },
      "gross_amount": {
        "value": "10.00",
        "currency_code": "USD"
      },
      "net_amount": {
        "value": "9.16",
        "currency_code": "USD"
      }
    },
    "custom_id": "{my-local-db-purchase-id}",
    "links": [
      {
        "method": "GET",
        "rel": "self",
        "href": "https://api.sandbox.paypal.com/v2/payments/captures/5VK462069F664902F"
      },
      {
        "method": "POST",
        "rel": "refund",
        "href": "https://api.sandbox.paypal.com/v2/payments/captures/5VK462069F664902F/refund"
      },
      {
        "method": "GET",
        "rel": "up",
        "href": "https://api.sandbox.paypal.com/v2/checkout/orders/4K5112848U951142F"
      }
    ],
    "id": "5VK462069F664902F",
    "status": "COMPLETED"
  },
  "links": [
    {
      "href": "https://api.sandbox.paypal.com/v1/notifications/webhooks-events/WH-3UT90572MR669760L-7LL94124G5389840D",
      "rel": "self",
      "method": "GET"
    },
    {
      "href": "https://api.sandbox.paypal.com/v1/notifications/webhooks-events/WH-3UT90572MR669760L-7LL94124G5389840D/resend",
      "rel": "resend",
      "method": "POST"
    }
  ]
}
```
