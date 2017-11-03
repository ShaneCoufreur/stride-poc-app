# CE Stride Bot - Development



### Setup (Salesforce example)

Note, the app can be run with an initial configuration of Salesforce, HubSpot CRM, or Close.io; the following example shows Salesforce.

* Obtain Salesforce account - if you're using salesforce - Settings > Create > Apps - create a Connected App with OAuth (with these OAuth scopes: `Full access (full)` and `Perform requests on your behalf at any time (refresh_token, offline_access)`) and enter the ngrok url to your app (see below) as the redirect URI, appending `/auth` - ex. `https://6ca40943.ngrok.io/sfdc/auth`
* Configure app for Salesforce - put the app secret and token into appropriate places in `.env` (below)
* Obtain a Cloud Elements account - log into the UI and copy your User and Org tokens into `.env` (below)
* Stride - https://developer.atlassian.com/apps/ - add an App with an unique `@`mention name (App Features) and the Descriptor url (Install) with `/descriptor` - ex. `https://6ca40943.ngrok.io/sfdc/descriptor`
* Stride - Grab the Installation URL from the App's Install tab and use it to add the bot to a room!



### To run:

1. `npm install`
2. start ngrok (`ngrok http 3333`)
3. create an `.env` file (like below)
4. `node app.js` - you're running!

Please create an `.env` file and make it look something like this:

```
# App
PORT=3333
APP_URL="https://6ca40943.ngrok.io"

# Stride Client ID
SFDC_CLIENT_ID=1UnvgDma4jnGMX9Sho198
SFDC_CLIENT_SECRET=FZ8h3arGmwckA_-pnzlD9AZFRFm5sVVfCnXkLH1jVckv3dhu6TA

# App CRM Flavor
SFDC_KEY="3MVG9A2kN3BnPdgfX.kMmnL01gEG9Gz.EfAmmuWXgr14kI7NZr5y5D_v9znVOfnp.ghKN9Iz9"
SFDC_SECRET="251016386628"

# Cloud Elements configuration
CE_USER="wm/PPKdv2+8VTwS0GJSOllOw+xlqqdpQHrbk="
CE_ORG="eda157a0bcc251bd94d7840f"
CE_ENV="staging"
```
> Note: CE_ENV is an optional line, the app will default to api.cloud-elements.com which is our production server.
