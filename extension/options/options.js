const FIX_VERSION_IDS_FROM_FORM_NAMES = {
    "fix42": "4.2",
    "fix44": "4.4",
    "fix50": "5.0",
    "fix50SP2": "5.0.SP2"
}

function fixVerToggleByName(name) {
    return document.querySelector(`input[name="${name}"]`);
}

async function activeFixVersions() {
    let {activeFixVersions} = await browser.storage.sync.get("activeFixVersions");
    
    activeFixVersions = activeFixVersions || ["4.4", "5.0.SP2"];
    return activeFixVersions;
}

async function saveOptions() {
    let activeFixVersions = [];
    for (let fixVerInputName of Object.keys(FIX_VERSION_IDS_FROM_FORM_NAMES)) {
        let input = fixVerToggleByName(fixVerInputName);
        if (input.checked) {
            activeFixVersions.push(FIX_VERSION_IDS_FROM_FORM_NAMES[fixVerInputName]);
        }
    }

    await browser.storage.sync.set({
        activeFixVersions
    });

    await browser.runtime.sendMessage("options");
}

async function restoreOptions() {
    let activeVersions = await activeFixVersions();

    for (let fixVerInputName in FIX_VERSION_IDS_FROM_FORM_NAMES) {
        let fixVerForInput = FIX_VERSION_IDS_FROM_FORM_NAMES[fixVerInputName];
        fixVerToggleByName(fixVerInputName).checked = 
            (activeVersions.indexOf(fixVerForInput) >= 0);
    }
}

async function handleError(err) {
    console.log("showing error", err);
    document.getElementById("error-msg").innerText = err.message ? err.message : err;
    document.getElementById("error").classList.remove("hidden");
    try {
        restoreOptions();
    } catch(e) {
        console.error("Unable to restore options after an error", e);
    }
}

async function hideError() {
    document.getElementById("error").classList.add("hidden");
}

function _(otherFunc) {
    return async function(arguments) {
        try {
            await otherFunc(arguments);
        } catch (e) {
            handleError(e);
        }
    };
    
}

document.addEventListener("DOMContentLoaded", _(restoreOptions));
document.querySelector("form").addEventListener("submit", _(async (e) => {
    e.preventDefault();
    await saveOptions();
    console.log("New options", await activeFixVersions());
}));
document.getElementById("error-close").addEventListener("click", _(async(e) => {
    e.preventDefault();
    await hideError();
}))