/** The single source of the CambriLearn sign-in link (it cannot be embedded: the site sends X-Frame-Options: SAMEORIGIN). */
export const CAMBRILEARN_LOGIN_URL = "https://campus.cambrilearn.com/users/login";

/** The link without its scheme, as shown in the launcher's address bar. */
export const CAMBRILEARN_DISPLAY_ADDRESS = CAMBRILEARN_LOGIN_URL.replace(/^https?:\/\//, "");
