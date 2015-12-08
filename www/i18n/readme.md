Contribution
============

### Add New Language

If you want to contribute a new language, make a copy of the files `en.json` and `additional/en.md` rename them with the new language code and translate them.
You will also need to include the new language code in the [app.js](../js/app.js#L109-L114) and in the [controller](../js/controllers/controllers.js#L10-L13).

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

### pending

tabs.about.gettingStarted.body.doBackup: **modified**
view.settings.language.label: **new**
