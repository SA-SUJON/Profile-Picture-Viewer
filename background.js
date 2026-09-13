importScripts("facebook.js", "instagram.js", "tiktok.js");

const MENU_ID = "openFullSizeProfilePicture";
const SITE_PATTERNS = [
    "*://*.facebook.com/*",
    "*://*.messenger.com/*",
    "*://*.instagram.com/*",
    "*://*.tiktok.com/*"
];

chrome.runtime.onInstalled.addListener(() => {
    // removeAll() first: onInstalled also fires on update/reload, and creating an
    // existing id throws "Cannot create item with duplicate id".
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: MENU_ID,
            title: "Open Full-Size Profile Picture",
            contexts: ["all"],
            documentUrlPatterns: SITE_PATTERNS
        });
    });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID) {
        return;
    }
    get_current_tab_url()
        .then(url => {
            const host = hostname_of(url);
            if (host_matches(host, "facebook.com") || host_matches(host, "messenger.com")) {
                return get_facebook_profile_picture();
            }
            if (host_matches(host, "instagram.com")) {
                return get_instagram_profile_picture(url);
            }
            if (host_matches(host, "tiktok.com")) {
                return get_tiktok_profile_picture(url);
            }
            throw new Error("Could not extract Profile Picture");
        })
        .catch(report_error);
});

// Helper function: Get the current tab's URL
function get_current_tab_url() {
    return get_active_tab().then(tab => {
        if (!tab.url) {
            throw new Error("No active tab found");
        }
        return tab.url;
    });
}

// Helper function: Get the current tab
function get_active_tab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(
            {
                active: true,
                lastFocusedWindow: true
            },
            tabs => {
                const tab = tabs[0];
                if (tab && tab.id !== undefined) {
                    resolve(tab);
                } else {
                    reject(new Error("No active tab found"));
                }
            }
        );
    });
}

function hostname_of(url) {
    try {
        return new URL(url).hostname;
    } catch (err) {
        return "";
    }
}

// Match the domain itself or a subdomain of it, never a lookalike such as
// "facebook.com.evil.net" or a URL that merely mentions the domain in a query.
function host_matches(host, domain) {
    return host === domain || host.endsWith(`.${domain}`);
}

function open_photo_tab(url) {
    chrome.tabs.create({ url });
}

// Every failure path ends here, so the user always gets told something.
function report_error(err) {
    console.error(err);
    return show_page_alert((err && err.message) || "Could not extract Profile Picture");
}

// alert() does not exist in an MV3 service worker, so show it in the page itself.
function show_page_alert(message) {
    return get_active_tab()
        .then(tab => chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [message],
            func: text => alert(text)
        }))
        .catch(err => console.error(err));
}
