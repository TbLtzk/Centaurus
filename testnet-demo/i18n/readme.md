Contribution
============

### Add New Language

If you want to contribute a new language, make a copy of the files `en.json` and `additional/en.md` rename them with the new language code and translate them.
You will also need to include the new language code in the [app.js](../js/app.js#L109-L114) and in the [controller](../js/controllers/controllers.js#L139-L142).

Please try your translation at least in the browser to see what it looks like (too long translations might be cut off or displayed unintentionally in two lines).

### Update Language

A language is not up to date if the `_meta.version` within the language file is lower than the one within the english (master) resource file.
It is then sufficient to consider the changelog (see below) and rework all resource keys that have been touched between the two versions.

### Misspelling corrections

As we cannot judge the correctness for many of the contributed languages, please try to be as accurate as possible.
If you find errors or have suggestions for improvement, please try to contact the previous contributor of the respective language first.

Changelog
=========

This is meant to track which resource keys have been touched (added/deleted/modified) beteween two _meta.versions.
It always contains a latest section `pending` of keys that have been touched but not *freezed* into a new _meta.version.

### 0.0.1

initial Version

### 0.0.2

tabs.about.gettingStarted.body.doBackup: **modified**
views.settings.language.label: **new**

### 0.0.3

controllers.contacts.edit.popup.subtitle: **new**
controllers.contacts.edit.popup.title: **new**
controllers.contacts.remove.caption: **new**
controllers.contacts.remove.text: **new**
controllers.trx.createContact.popup.exists: **new**
controllers.trx.createContact.popup.subtitle: **new**
controllers.trx.createContact.popup.title: **new**
general.common.address: **new**
general.common.name: **new**
general.common.filter: **new**
navigation.contacts.title: **new**
tabs.wallet.secret: **new**
views.contact.memo.placeholder: **new**
views.contacts.title: **new**

### pending
