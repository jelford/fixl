# Expectations

## What you can expect from me

This is free software that I develop in my spare time. I will do my best to keep it functional and useful, but
there is no SLA, and I can't promise to deliver timely responses to queries or issues.

Contributions will be gratefully received, and barrier to entry should be fairly low: if there's something
you would find useful and that's a natural fit for this extension, please go ahead and suggest it (or raise
a PR).

## What I expect from you

Not much. PRs are more helpful than bug reports, and if you need something then don't make it a chore.
That's it.

## How to contribute

Any way that's convenient to you:

* Raise an issue on GitHub's issue tracker
* Raise a pull request that adds things you want
* Email me directly to make a suggestion.

Whatever works.

## But _how_ to contribute

The addon is pretty simple; there's a single background script (`extension/background/fixl-omnibox.js`) that manages:
* Building an index of FIX fields by Tag and Name
* Handling the Omnibox interactions.

Look under `extension` for the source files. It should be pretty straightforward;
you can find relevant documentation on MDN:
* How to work the Omnibox ([here](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/omnibox))
* The Storage API ([here](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage))
* Overview of how extensions are put together ([here](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension))
