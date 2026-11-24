# PayVerse readiness for hng1.com

Only the H&G `enchanting-forgiveness` Railway project is in scope. Do not use the
`partscombined-payverse` project or credentials issued for partscombined/patzcom.

## Already prepared

- PayVerse checkout is gated off until the MID, client key, secret key, and
  explicit environment switch are present.
- Sandbox keys may run only outside Railway production. Live keys additionally
  require `PAYVERSE_MODE=live` and `PAYVERSE_LIVE_ENABLED=true` in production.
- The checkout button remains disabled while `/api/payment-provider` does not
  advertise PayVerse.
- SDK callbacks and webhooks do not prove payment. The server confirms the order
  using PayVerse's authenticated OrderID lookup and checks order ID, currency,
  amount, transaction type, status, and TID before recording `paid`.
- Admin-only refund requests use PayVerse's cancel endpoint; a pending refund
  cannot be requested twice. No refund request is made without a verified paid
  order and a PayVerse TID.

## Needed from PayVerse before testing

Ask PayVerse for a **new hng1-specific sandbox** MID, Client Key, Secret Key,
approved test currency and available test payment/refund method. Do not put
secrets in email, chat, source control or frontend code; enter them as Railway
service variables in the H&G sandbox environment. Confirm whether sandbox
credentials can be issued before the business-document review.

In sandbox, set `PAYVERSE_MODE=sandbox`, the three credentials,
`PAYVERSE_CURRENCY` to the currency authorized for this merchant, and only then
`PAYVERSE_ENABLED=true`. Keep `PAYVERSE_LIVE_ENABLED=false`. For production,
leave `PAYVERSE_ENABLED=false` until business approval, live credentials, and
successful sandbox payment **and refund** evidence are available. Never reuse
sandbox keys for production.

Verify one test payment and one refund in both PayVerse's transaction view and
the H&G admin order state. `PROCESSING` and `PENDING` are not final success.
This repository does not contain a successful PayVerse payment/refund receipt.

Official references: [SDK checkout](https://docs.payverseglobal.com/ko/apisdk/v1.0.0/payverse-sdk/payment-ui/),
[authentication and signing](https://docs.payverseglobal.com/ko/apisdk/v1.0.0/integration-pre-check/get-ready-connect/),
[network/webhook setup](https://docs.payverseglobal.com/ko/apisdk/v1.0.0/integration-pre-check/network-configuration/),
[transaction lookup and cancel/refund](https://docs.payverseglobal.com/ko/apisdk/v1.0.0/additional-feature-api/additional-feature/).
