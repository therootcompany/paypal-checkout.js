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
PayPal.Order.createRequest({ ... });          // ??
```

See also:

- <https://developer.paypal.com/docs/api/orders/v2/#orders_create>
- <https://developer.paypal.com/docs/api/orders/v2/#definition-purchase_unit_request>
- <https://developer.paypal.com/docs/api/orders/v2/#definition-order_application_context>

# Redirects

- `return_url`
- `cancel_url`

### Orders

#### `return_url`

Order Request `return_url` will be called with the `token` query param as the
`order_id`:

```txt
https://example.com/redirects/paypal-checkout/return
  ?token=XXXXXXXXXXXXXXXXX
  &PayerID=XXXXXXXXXXXXX
```

Again, `token` is the `order_id`.

#### `cancel_url`

The `cancel_url` will have the same query params as the `return_url`.

Also, PayPal presents the raw `cancel_url` and will NOT update the order status.
It's up to you to confirm with the user and change the status to `CANCELLED`.

### Subscriptions

#### `return_url`

Subscription Request `return_url` will include the following:

```txt
https://example.com/redirects/paypal-checkout/return
  ?subscription_id=XXXXXXXXXXXXXX
  &ba_token=BA-00000000000000000
  &token=XXXXXXXXXXXXXXXXX
```

#### `cancel_url`

The `cancel_url` will have the same query params as the `return_url`.

Also, PayPal presents the raw `cancel_url` and will NOT update the subscription
status. It's up to you to confirm with the user and change the status to
`CANCELLED`.

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

Note: Just about everything in the PayPal SDK that uses `ALL_CAPS` is a
`constant`/`enum` representing an option you can pick from limited number of
options.

Sandbox accounts (for creating fake purchases) can be managed at:
<https://developer.paypal.com/developer/accounts>

Note on Auth + Capture:

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

Buttons:

- <https://www.paypal.com/webapps/mpp/logos-buttons> <== THE ONE YOU WANT
  - <img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" alt="Check out with PayPal" />
- <https://developer.paypal.com/docs/checkout/>
- <https://www.paypal.com/buttons/>
