## Import a certificate and its private key from a keystore

Acme signs the SAML assertions of its identity provider with a certificate issued by its own certificate authority, and the same certificate and private key must exist in every org that acts as identity provider. Salesforce does not let any API import a private key: the only way in is the **Import from Keystore** button of Certificate and Key Management, which uploads a Java keystore (JKS).

This config uploads the keystore file at `filePath`, relative to the folder where `apply` runs, and the certificate appears as **Dummy**, the name Salesforce gives it from the keystore alias (in lowercase unless `name` changes its case). The same config can create self-signed certificates with `certificates`, although the Metadata API can do that too. The org must act as an identity provider first.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "security": {
      "certificateAndKeyManagement": {
        "importFromKeystore": [
          {
            "name": "Dummy",
            "filePath": "./src/plugins/security/certificate-and-key-management/Dummy.jks",
            "password": ""
          }
        ],
        "certificates": [
          {
            "name": "AcmeSelfSigned",
            "label": "Acme Self Signed",
            "keysize": 2048,
            "exportable": true
          }
        ]
      }
    }
  }
}
```

## Offer single sign-on on the login page of My Domain

Acme's employees log in to Salesforce through the company's identity provider, set up as an Auth. Provider, while a few administrators keep a password as a fallback. The buttons of the My Domain login page come from its **Authentication Configuration** section, which no Metadata API setting holds: after each deployment of the Auth. Provider, an admin had to tick it there.

This config ticks the Auth. Provider **TestAuthMethod**, named by its API name with `authProviderApiName`, and keeps the **Login Form** ticked, named by the label Setup shows with `label`. Services the config does not list stay as they are.

```json
{
  "$schema": "https://raw.githubusercontent.com/amtrack/sfdx-browserforce-plugin/main/src/plugins/schema.json",
  "settings": {
    "security": {
      "authenticationConfiguration": {
        "services": [
          {
            "authProviderApiName": "TestAuthMethod",
            "enabled": true
          },
          {
            "label": "Login Form",
            "enabled": true
          }
        ]
      }
    }
  }
}
```
