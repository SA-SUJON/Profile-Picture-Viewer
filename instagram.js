const IG_WEB_APP_ID = "936619743392459";
const IG_IOS_APP_ID = "1217981644879628";

function get_instagram_profile_picture(url) {
  get_instagram_username(url)
      .then(get_instagram_user_id)
      .then(get_instagram_full_size_url)
      .then(open_instagram_full_hd_photo)
      .catch(err => console.error(err));
}

function get_instagram_username(link) {
  const regex = /(?<=instagram.com\/)[A-Za-z0-9_.]+/;
  const match = link.match(regex);
  if (match) {
      return Promise.resolve(match[0]);
  }
  return Promise.reject(new Error("Invalid Instagram URL."));
}

function get_instagram_user_id(username) {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
  return instagram_api(url, IG_WEB_APP_ID).then(data => {
      const user = data && data.data && data.data.user;
      if (!user || !user.id) {
          throw new Error("Could not extract Instagram User ID.");
      }
      // Kept as a fallback in case the /info/ endpoint gives us nothing (320x320).
      return { id: user.id, fallback: user.profile_pic_url_hd || user.profile_pic_url };
  });
}

// The /info/ endpoint returns hd_profile_pic_url_info.url, which carries NO `stp`
// param -- no server-side resize, so it is the stored master (e.g. 720x720).
// The size lives in `stp` and is covered by the `oh` signature, so it can never be
// edited by hand: only a URL Instagram signed without `stp` gives the full image.
// Note this must be the www host; i.instagram.com now returns a trimmed payload.
function get_instagram_full_size_url({ id, fallback }) {
  const url = `https://www.instagram.com/api/v1/users/${id}/info/`;
  return instagram_api(url, IG_IOS_APP_ID)
      .then(data => {
          const user = data && data.user;
          const hd = user && user.hd_profile_pic_url_info && user.hd_profile_pic_url_info.url;
          if (hd) {
              return hd;
          }
          // Next best: the largest entry of hd_profile_pic_versions (320, 640, ...).
          const versions = (user && user.hd_profile_pic_versions) || [];
          const largest = versions
              .filter(v => v && v.url)
              .sort((a, b) => (a.width || 0) - (b.width || 0))
              .pop();
          return (largest && largest.url) || fallback;
      })
      .catch(err => {
          console.error(err);
          return fallback;
      })
      .then(pic_url => {
          if (!pic_url) {
              throw new Error("Could not extract Instagram Profile Picture.");
          }
          return pic_url;
      });
}

function instagram_api(url, app_id) {
  return fetch(url, {
      credentials: "include",
      headers: {
          "X-IG-App-ID": app_id
      }
  }).then(res => {
      if (!res.ok) {
          throw new Error(`Instagram API returned ${res.status} for ${url}`);
      }
      return res.json();
  });
}

function open_instagram_full_hd_photo(picUrl) {
  chrome.tabs.create({ url: picUrl });
}
