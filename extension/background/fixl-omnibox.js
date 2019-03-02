const ALL_FIX_VERSIONS = ["4.2", "4.4", "5.0", "5.0.SP2"];

async function activeFixVersions() {
    let {activeFixVersions} = await browser.storage.sync.get("activeFixVersions");
    
    activeFixVersions = activeFixVersions || ["4.4", "5.0.SP2"];
    return activeFixVersions;
}

function fieldsByNamePageUrl(fixVersion) {
    return `https://www.onixs.biz/fix-dictionary/${fixVersion}/fields_by_name.html`
}

function fieldsByTagPageUrl(fixVersion) {
    return `https://www.onixs.biz/fix-dictionary/${fixVersion}/fields_by_tag.html`
}

function urlForSearch(term) {
    return `https://www.onixs.biz/hs-search-results?term=${term}`
}

function fuzzyMatch(searchTerm, target) {
    let searchTermIdx = 0;
    let targetIdx = 0;

    while ((targetIdx < target.length) && (searchTermIdx < searchTerm.length)) {
        let targetL = target[targetIdx];
        let searchL = searchTerm[searchTermIdx];
        if (searchL == targetL) {
            searchTermIdx++;
        }
        targetIdx++;
    }

    return searchTermIdx >= searchTerm.length;
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
            tagName, tagUrl, tagNum, fixVersion
        };

        fieldsByName[tagName] = info;

        fieldsByTag[tagNum] = info;
    }

    return [fieldsByName, fieldsByTag];

}

async function updateFixTagCaches() {
    for (let v of ALL_FIX_VERSIONS) {
        let [fieldsByName, fieldsByTag] = await getFieldIndex(v);
        await 
            Promise.all([browser.storage.local.set({
                [`fix.${v}.tags.byName`]: fieldsByName
            }), browser.storage.local.set({
                [`fix.${v}.tags.byTag`]: fieldsByTag
            })]);
    }
}

async function matchVersion(versionSearchTerm) {
    let result = [];
    
    for (let version of await activeFixVersions()) {
        if (fuzzyMatch(versionSearchTerm.toUpperCase(), version)) {
            result.push(version);
        }
    }

    if (result.length == 0) {
        for (let version of ALL_FIX_VERSIONS) {
            if (fuzzyMatch(versionSearchTerm.toUpperCase(), version)) {
                result.push(version);
            }
        }
    }

    if (result.length == 0) {
        console.log("Didn't find any versions matching:", versionSearchTerm);
    }

    return result;
}

function keysMatching(searchTerm, keys) {
    let result = {};
    for (let k in keys) {
        if (fuzzyMatch(searchTerm.toUpperCase(), k.toUpperCase())) {
            result[k] = keys[k];
        }
    }
    return result;
}

async function storageItemsMatching(storageName, searchTerm) {
    let fieldsFromStorage = await browser.storage.local.get(storageName);
    let fields = fieldsFromStorage[storageName];
    let ret = keysMatching(searchTerm, fields);
    console.log('found:', ret);
    return ret;
}

async function fixFieldsByTag(searchTerm, version) {
    let storageName = `fix.${version}.tags.byTag`;
    return storageItemsMatching(storageName, searchTerm);
}

async function fixFieldsByName(searchTerm, version) {
    let storageName = `fix.${version}.tags.byName`;
    return storageItemsMatching(storageName, searchTerm);
}

async function getTagSuggestions(text) {
    let [version, searchTerm] = text.split(/\s+/);

    if (!version) {
        return;
    }

    if (!searchTerm) {
        searchTerm = version;
        version = undefined;
    }

    let isName = isNaN(searchTerm);

    let matches = {};
    let allMatchedKeys = new Set();

    let versionsToSearch = await (version ? matchVersion(version) : activeFixVersions());

    for (let v of versionsToSearch) {
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

    allMatchedKeys = Array.from(allMatchedKeys).sort((a, b) => a.length - b.length);
    console.log("goign through keys in order", allMatchedKeys);
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
    if (!suggestions) {
        return;
    }

    addSuggestions(suggestions.slice(0, 5).map(field => {
        return {
            content: field.tagUrl,
            description: `${field.tagName}[${field.tagNum}] (${field.fixVersion})`
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

browser.runtime.onMessage.addListener(async (msg) => {
    if (msg == "options") {
        await updateFixTagCaches();
    }
});