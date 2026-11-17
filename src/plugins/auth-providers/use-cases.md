## Set the credentials of a single sign-on provider in each environment

Acme's partners log in to its community with their own OpenID Connect identity provider. The Auth. Provider is deployed with the Metadata API, but each environment talks to a different client of the identity provider, and the Metadata API only exports the consumer secret as a placeholder and only deploys a value encrypted by the org itself: the real secret has to be typed in Setup in each environment.

This config sets the **Consumer Key** and the **Consumer Secret** of the Auth. Provider named `TestAuthProvider` (its API name, the key of the entry). The secret comes from the environment variable `PARTNER_SSO_SECRET` of the pipeline, never from the file, and `apply` masks it in its output. Setup never shows a secret back, so Browserforce cannot compare it: every `apply` writes both values again.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "authProviders": {
      "TestAuthProvider": {
        "consumerKey": "acme-portal-production",
        "consumerSecret": "${PARTNER_SSO_SECRET}"
      }
    }
  }
}
```
