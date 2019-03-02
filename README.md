# fixl
Easily look up FIX definitions from the address bar.

`fixl` is a browser addon that helps you quickly look up FIX definitions on https://www.onixs.biz.

## Install

Firefox users can get it from: https://addons.mozilla.org/en-GB/firefox/addon/fixl

Want to see this on your browser? I'd love some help testing!

## Usage

In your address bar, just type:

    fix <FieldName>
    
or

    fix <TagNum>
    
`fixl` will search a local index of FIX tags from `onixs.biz`, and provide you links to the reference pages.
You can narrow down results with:

    fix <FieldName or TagNum> <FixVersion>

You can also use

    fix <anything>
    
to go to the search page.

## Updates

`fixl` keeps an internal index of the tag definitions on `onixs.biz`. FIX4.4 and FIX5.0 SP2 are searched by default,
and neither standard has changed in some years, so this shouldn't go stale.

The local index is updated whenever:
* `fixl` is installed
* `fixl` is updated

That might change in the future; if you're having problems with stale data, let me know.

## What is this?

The FIX standard describes a protocol used for information exchange between financial institutions.
If you don't know what FIX is, then you probably don't want to. This is not the browser extension
you're looking for.

