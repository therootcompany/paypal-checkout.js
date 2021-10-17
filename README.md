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

# Install

```bash
npm install --save @root/paypal-checkout
```

# Usage

```js
"use strict";

require("dotenv").config({ path: ".env" });

let PPC = require("@root/paypal-checkout");
PPC.init({
  client_id: "xxxx",
  client_secret: "****",
});

PPC.Subscriptions.createRequest({
  // See https://developer.paypal.com/docs/api/subscriptions/v1/#subscriptions
});
```

# API

```txt
PayPal.init(client_id, client_secret, 'sandbox|live', defaults);
PayPal.request({ method, url, headers, json });
```

### Subscrptions (Recurring Payments)

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

### Orders (One-Time Payments)

```txt
                                                // Webhook 'event_type':

PayPal.Order.createRequest({ purchase_units }); // CHECKOUT.ORDER.APPROVED
PayPal.Order.capture(id, { final_capture });    // PAYMENT.CAPTURE.COMPLETED
```

See also:

- <https://developer.paypal.com/docs/api/orders/v2/#orders_create>
- <https://developer.paypal.com/docs/api/orders/v2/#definition-purchase_unit_request>
- <https://developer.paypal.com/docs/api/orders/v2/#definition-order_application_context>

# Redirects

- `return_url`
- `cancel_url`

#### `return_url`

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

#### `cancel_url`

The `cancel_url` will have the same query params as the `return_url`.

Also, PayPal presents the raw `cancel_url` and will NOT update the order or
subscription status. It's up to you to confirm with the user and change the
status to `CANCELLED`.

# Webhooks

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

## PayPal Checkout Buttons

- <https://www.paypal.com/webapps/mpp/logos-buttons> <== THE ONE YOU WANT
  - <img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" alt="Check out with PayPal" />
- <https://developer.paypal.com/docs/checkout/>
- <https://www.paypal.com/buttons/>

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
