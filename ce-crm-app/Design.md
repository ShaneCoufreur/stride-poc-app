# Design

This project started with the Stride refbot app.

## Storage

A local storage mechanism based upon lowdb (json file store) is used to store a variety of things:

* CRM connection instance to a ConversationID/Room

## Polymorphic App

This single app codebase has the ability to serve multiple CRMs based upon the app-descriptor pattern. As a clarifying example, starting this app and providing a descriptor path of `https://host/CRM/descriptor` where `CRM` is one of the following will create an app that serves up the particular CRM's data. See the `flavor` directory for implemented varieties.

* `sfdc` - Salesforce
* `hubspotcrm` - Hubspot CRM
* `closeio` - Close.io 

The `flavor` is controlled by the environment variables that are set (in the `.env` file). For example, if `SFDC_CLIENT_ID` and `SFDC_CLIENT_SECRET` are set, it's an `sfdc` CRM app. Also, if both the sfdc env vars AND a `HUBSPOTCRM_` set of env vars are set, the bot will act as both a SFDC and an HubSpotCRM bot!