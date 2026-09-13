function get_tiktok_profile_picture(url) {
  return get_tiktok_username(url)
      .then(get_tiktok_profile_picture_url)
      .then(open_photo_tab)
      .catch(report_error);
}

function get_tiktok_username(link) {
  let pathname;
  try {
      pathname = new URL(link).pathname;
  } catch (err) {
      return Promise.reject(new Error("Invalid TikTok URL."));
  }
  // Works for /@user as well as /@user/video/123.
  const match = /\/(@[A-Za-z0-9_.]+)(?:\/|$)/.exec(pathname);
  if (match) {
      return Promise.resolve(match[1]);
  }
  return Promise.reject(new Error("Open a TikTok profile page first."));
}

function get_tiktok_profile_picture_url(username) {
  const url = `https://www.tiktok.com/${username}`;
  return fetch(url)
      .then(response => {
          if (!response.ok) {
              throw new Error(`TikTok returned ${response.status}`);
          }
          return response.text();
      })
      .then(html => {
          const regex = /(?<=avatarLarger":").+?(?=","avatarMedium)/;
          const match = html.match(regex);
          if (match) {
              return JSON.parse(`"${match[0]}"`);
          }
          throw new Error("No profile picture found!");
      });
}
