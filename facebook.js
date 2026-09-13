// Read the profile picture straight from the <image> of the page's SVG avatar
const AVATAR_SVG_SELECTOR =
    'svg[role="img"][data-visualcompletion="ignore-dynamic"]:is(' +
    '[style="height: 100px; width: 100px;"], ' +
    '[style="height:168px;width:168px"], ' +
    '[style="height: 168px; width: 168px;"], ' +
    '[style="height:100px;width:100px"])';

function get_facebook_profile_picture() {
    return get_svg_profile_picture_url()
        .then(svg_url => {
            if (!svg_url) {
                throw new Error("No profile picture found!");
            }
            open_photo_tab(upscale_fbcdn_url(svg_url));
        })
        .catch(report_error);
}

function get_svg_profile_picture_url() {
    return get_active_tab()
        .then(tab => chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [AVATAR_SVG_SELECTOR],
            func: selector => {
                for (const svg of document.querySelectorAll(selector)) {
                    const image = svg.querySelector("image");
                    const href = image && (image.getAttribute("xlink:href") || image.getAttribute("href"));
                    if (href) {
                        return href;
                    }
                }
                return null;
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
