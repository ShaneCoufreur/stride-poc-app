# Design

This project started with the Stride refbot app.

## Storage

A local storage mechanism based upon lowdb (json file store) is used to store a variety of things:

* CRM connection instance to a ConversationID/Room

## Polymorphic App

This single app codebase has the ability to serve multiple CRMs based upon the app-descriptor pattern. As a clarifying example, starting this app and providing a descriptor path of `https://host/crm/descriptor` where `crm` is one of the following will create an app that serves up the particular CRM's data

* `sfdc` - Salesforce
* `hubspotcrm` - Hubspot CRM
* `closeio` - Close.io 