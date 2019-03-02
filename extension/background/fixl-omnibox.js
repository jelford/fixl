
const activeVersions = ["4.4", "5.0.SP2"];

function fieldsByNamePageUrl(fixVersion) {
    return `https://www.onixs.biz/fix-dictionary/${fixVersion}/fields_by_name.html`
}

function fieldsByTagPageUrl(fixVersion) {
    return `https://www.onixs.biz/fix-dictionary/${fixVersion}/fields_by_tag.html`
}

function urlForSearch(term) {
    return `https://www.onixs.biz/hs-search-results?term=${term}`
}

async function getFieldIndex(fixVersion) {
    let url = fieldsByNamePageUrl(fixVersion);
    let doc = await new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.addEventListener("load", e => resolve(e.target.response));
        req.addEventListener("error", reject);
        req.addEventListener("abort", reject);
        req.open("GET", url);
        req.responseType = "document";
        req.send();
    });

    let fieldTable = doc.querySelector('table table[align="center"].white');
    let rows = fieldTable.querySelector('tbody').querySelectorAll('tr');

    let fieldsByName = {};
    let fieldsByTag = {};

    for (let r = 1; r < rows.length; ++r) {

        let [tagInfo, tagNumLink] = rows[r].querySelectorAll('a');
        let tagName = tagInfo.text;
        let tagUrl = tagInfo.href;
        let tagNum = tagNumLink.text;

        let info = {
            tagName, tagUrl, tagNum
        };

        fieldsByName[tagName] = info;

        fieldsByTag[tagNum] = info;
    }

    return [fieldsByName, fieldsByTag];

}

async function updateFixTagCaches() {

    for (let v of activeVersions) {
        let [fieldsByName, fieldsByTag] = await getFieldIndex(v);
        await 
            Promise.all([browser.storage.local.set({
                [`fix.${v}.tags.byName`]: fieldsByName
            }), browser.storage.local.set({
                [`fix.${v}.tags.byTag`]: fieldsByTag
            })]);
    }

}

function* matchVersion(prefix) {
    for (let version of activeVersions) {
        if (version.startsWith(prefix)) {
            yield version;
        }
    }
}

function keysWithPrefix(prefix, keys) {
    let result = [];
    for (let k in keys) {
        if (k.toUpperCase().startsWith(prefix.toUpperCase())) {
            result.push(keys[k]);
        }
    }
    return result;
}

async function fixFieldsByTag(prefix, version) {
    let storageName = `fix.${version}.tags.byTag`;
    let fieldsFromStorage = await browser.storage.local.get(storageName);
    let fields = fieldsFromStorage[storageName];
    return keysWithPrefix(prefix, fields);
}

async function fixFieldsByName(prefix, version) {
    let storageName = `fix.${version}.tags.byName`;
    let fieldsFromStorage = await browser.storage.local.get(storageName);
    let fields = fieldsFromStorage[storageName];
    return keysWithPrefix(prefix, fields);
}

async function getTagSuggestions(text) {
    let [searchTerm, version] = text.split(/\s+/);

    if (!searchTerm) {
        return;
    }

    let isName = isNaN(searchTerm);

    let matches = {};
    let allMatchedKeys = new Set();

    for (let v of version ? matchVersion(version) : activeVersions) {
        if (isName) {
            matches[v] = await fixFieldsByName(searchTerm, v);
            for (let k in matches[v]) {
                allMatchedKeys.add(k);
            }
        } else {
            matches[v] = await fixFieldsByTag(searchTerm, v);
            for (let k in matches[v]) {
                allMatchedKeys.add(k);
            }
        }
    }

    let result = [];
    let versions = Object.keys(matches);
    for (let key of allMatchedKeys) {
        for (let v of versions) {
            let versionedTag = matches[v][key];
            if (versionedTag) {
                result.push(versionedTag);
            }
        }
    }

    return result;
}

browser.runtime.onInstalled.addListener(async ({reason, temporary}) => {

    switch (reason) {
        case "install":
        case "update":
            // changes infrequently enough that there's no need to keep rebuilding this index.
            await updateFixTagCaches();
            break;
    }
});

browser.omnibox.setDefaultSuggestion({
    description: "Search FIX dictionary by tag or field name"
});


browser.omnibox.onInputChanged.addListener(async (text, addSuggestions) => {
    let suggestions = await getTagSuggestions(text);
    addSuggestions(suggestions.slice(0, 5).map(field => {
        return {
            content: field.tagUrl,
            description: `${field.tagName}[${field.tagNum}]`
        };
    }));
});

function openInNewTab(url, active) {
    let openerTabId = browser.tabs.getCurrent().id;
    browser.tabs.create({url, active, openerTabId});
}

browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
    let url = text;
    if (!text.startsWith("https://")) {
        url = urlForSearch(text);
    }

    let currentTab = browser.tabs.getCurrent();

    switch (disposition) {
        case "currentTab":
          browser.tabs.update({url});
          break;
        case "newForegroundTab":
          openInNewTab(url, true);
          break;
        case "newBackgroundTab":
          openInNewTab(url, false);
          break;
    }
});