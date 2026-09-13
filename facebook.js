function get_facebook_profile_picture(url) {
    get_svg_profile_picture_url()
        .then(svg_url => {
            if (svg_url) {
                chrome.tabs.create({ url: upscale_fbcdn_url(svg_url) });
                return;
            }
            return get_current_username(url)
                .then(get_username_id)
                .then(open_full_hd_photo);
        })
        .catch(err => console.error(err));
}

// Read the profile picture straight from the <image> of the page's SVG avatar
const AVATAR_SVG_SELECTOR =
    'svg[role="img"][data-visualcompletion="ignore-dynamic"]:is(' +
    '[style="height: 100px; width: 100px;"], ' +
    '[style="height:168px;width:168px"], ' +
    '[style="height: 168px; width: 168px;"], ' +
    '[style="height:100px;width:100px"])';

function get_svg_profile_picture_url() {
    return get_active_tab()
        .then(tab => chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [AVATAR_SVG_SELECTOR],
            func: selector => {
                const href_of = img => img && (img.getAttribute("xlink:href") || img.getAttribute("href"));

                for (const svg of document.querySelectorAll(selector)) {
                    const href = href_of(svg.querySelector("image"));
                    if (href) {
                        return href;
                    }
                }
                // Fallback: first <image> on the page that points at an fbcdn photo
                const match = Array.from(document.querySelectorAll("image"))
                    .map(href_of)
                    .find(link => link && link.includes("fbcdn.net"));
                return match || null;
            }
        }))
        .then(results => (results && results[0] && results[0].result) || null)
        .catch(err => {
            console.error(err);
            return null;
        });
}

// cstp=mx736x748&ctp=p40x40  ->  cstp=mx736x748&ctp=p736x748
// The prefixes ("mx", "p", ...) vary, so only the <number>x<number> part is used.
function upscale_fbcdn_url(raw_url) {
    const size = /[?&]cstp=[^&#]*?(\d+x\d+)/.exec(raw_url);
    if (!size) {
        return raw_url;
    }
    return raw_url.replace(/([?&]ctp=[^&#]*?)\d+x\d+/, `$1${size[1]}`);
}

function get_active_tab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
            const tab = tabs[0];
            if (tab && tab.id !== undefined) {
                resolve(tab);
            } else {
                reject(new Error("No active tab found"));
            }
        });
    });
}

function get_current_username(link) {
    return new Promise((resolve, reject) => {
        const test = new URL(link);
        if (test.pathname.includes("/friends/")) {
            resolve(test.searchParams.get("profile_id"));
        } else if (test.pathname.includes("/groups/")) {
            resolve(test.pathname.split("/").filter(str => str !== "")[3]);
        } else if (test.pathname.includes("/t/") && !test.pathname.includes("/e2ee/")) {
            resolve(test.pathname.split("/").filter(str => str !== "")[1]);
        } else if (test.pathname === "/profile.php") {
            resolve(test.searchParams.get("id"));
        } else {
            resolve(test.pathname.replace("/", ""));
        }
    });
}

function get_username_id(username) {
    return fetch(`https://m.facebook.com/${username}`)
        .then(response => response.text())
        .then(html => {
            const regex = /"userID":"(\d+)"/;
            const match = html.match(regex);
            if (match) {
                return match[1];
            }
            throw new Error("Could not extract Facebook Profile ID.");
        });
}

function open_full_hd_photo(id) {
    const accessToken = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    const url = `https://graph.facebook.com/${id}/picture?width=5000&access_token=${accessToken}`;
    chrome.tabs.create({ url });
}
