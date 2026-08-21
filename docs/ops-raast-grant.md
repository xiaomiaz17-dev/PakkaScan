# PakkaScan — Raast payment unlock (ops)

1. Customer signs in (same email as scan).
2. Pays via Raast (499 / 1499 / 2999).
3. WhatsApps: email, tier, amount, screenshot.
4. Confirm in JazzCash.
5. Grant (command below).
6. Reply: Unlocked — https://www.pakkascan.com/scan

## Grant (do not commit real secret)

$secret = "PASTE_ADMIN_GRANT_SECRET"
$email  = "customer@email.com"
$tier   = "bayana"
$note   = "txn-or-ref"
Invoke-RestMethod -Method POST -Uri "https://www.pakkascan.com/api/admin/grant-entitlement" -Headers @{ "x-admin-grant-secret" = $secret; "Content-Type" = "application/json" } -Body (@{ email = $email; reportType = $tier; note = $note } | ConvertTo-Json)

Errors: unauthorized = bad secret; user_not_found = must sign in first.
