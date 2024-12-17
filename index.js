import './styles.css';

// var microsoftTeams;

// Dynamically load translations
const loadTranslations = (lang) => {
  return require(`./locales/${lang}.json`);
};
let languageSelected = 'en';


// Function to update text content based on language
function getTransalation(lang) {
  const translations = loadTranslations(lang);

  return function (msgKey, ...values) {
    return translations[msgKey] ? replacePlaceholder(translations[msgKey], ...values) : '';
  };
}

// Initial language setup (English by default)
let translate = getTransalation(languageSelected);
// ======================================================

const PopupWidth = 600;
const PopupHeight = 535;

const TenantIdSearchParam = "tenantId";
const AppIdSearchParam = "appId";
const NextUriSearchParam = "nextUri";

const AuthCompleteSearchParam = "msTeamsAuthComplete";
let isRetryVisible = false;
let isRetryWillReload = false;

// const WrongConfigError =  "App is not configured correctly. Please recheck instructions.";
const MSG_VERIFYING_CREDENTIALS = "verifying_credentials";
const GeneralFailureError =  "general_error";
const InternalLoadUrlFailedError = "InternalLoadUrlFailedError";
const MSG_TEAMS_SDK_ERROR = "teams_sdk_error";
const MSG_MISSING_PARAM_SINGLE = "missing_param_single";
const MSG_MISSING_PARAM_MULTIPLE = "missing_param_multiple";
const MSG_AUTH_POPUP_CLOSED = "auth_popup_closed";

const url = new URL(window.location.href);
const nextUri = url.searchParams.get(NextUriSearchParam);
const tenantId = url.searchParams.get(TenantIdSearchParam);
const appId = url.searchParams.get(AppIdSearchParam);

document.getElementById("btnRetry").onclick = () => clickRetryButton();

function changeLoaderState(state) {
  let pulseLoader = document.getElementById("pulseLoader");
  let warningIcon = document.getElementById("warningIcon");
  if (state) {
    pulseLoader.style.display = 'block';
    warningIcon.style.display = 'none';
  } else {
    pulseLoader.style.display = 'none';
    warningIcon.style.display = 'block';
  }
}


function logError(error) {
  changeLoaderState(false);
  if (error) {
    console.error(error);
  }
}

function showError(messageKey, ...values) {
  changeLoaderState(false);
  changeUIMessage(messageKey, ...values);
}

function showLoading() {
  setRetryIsVisible(false);
  changeLoaderState(true);
  changeUIMessage(MSG_VERIFYING_CREDENTIALS);
}

function changeUIMessage(messageKey, ...values) {
  document.getElementById("error").innerText = translate(messageKey, ...values);
}

function setRetryIsVisible(value) {
  isRetryVisible = value;
  document.getElementById("btnRetry").style.display = value ? 'block' : 'none';
}

function redirectToNextUri() {
  window.location.href = nextUri;
}

function getLoginUrl(loginHint) {
  const redirectUri = encodeURIComponent(
    `${nextUri}${
      nextUri.endsWith("/") ? "" : "/"
    }?${AuthCompleteSearchParam}=true`
  );
  return `https://login.microsoftonline.com/${tenantId}/oauth2/authorize?response_type=code&client_id=${appId}&scope=openid&redirect_uri=${redirectUri}&sso_reload=true&login_hint=${loginHint}`;
}

function tryLoad(url) {
  return fetch(url, { method: "HEAD", credentials: "include" })
    .then((response) =>
      response.status === 200
        ? Promise.resolve()
        : Promise.reject(new Error())
    )
    .catch(() =>
      Promise.reject(new Error(InternalLoadUrlFailedError))
    );
}

function authorizeUser(context) {
  return microsoftTeams.authentication
    .authenticate({
      url: getLoginUrl(context.user.loginHint),
      width: PopupWidth,
      height: PopupHeight,
      isExternal: false,
    })
    .then(() => redirectToNextUri());
}

function replacePlaceholder(template, ...values) {
  return template.replace(/{(\d+)}/g, (match, index) => values[index] || match);
}

window.onload = function () {
  showLoading();
  // changeLoaderState(true);

  if (!haveValidParams()) {
    return;
  }

  startAuthentication();

};

function haveValidParams() {

  let missingParams = [];

  if (!tenantId) {
    missingParams.push("tenantId");
  }
  if (!appId) {
    missingParams.push("appId");
  }
  if (!nextUri) {
    missingParams.push("nextUri");
  }

  if (missingParams.length > 0) {
    let missingParamsString = missingParams.join(', ');
    let msgParam = missingParams.length == 1 ? MSG_MISSING_PARAM_SINGLE : MSG_MISSING_PARAM_MULTIPLE;
    showError(msgParam, missingParamsString);
    return false;
  }

  if(!('microsoftTeams' in window)) {
    isRetryWillReload = true;
    setRetryIsVisible(true);
    showError(MSG_TEAMS_SDK_ERROR);
    return false;
  }

  return true;
}

function startAuthentication() {
  microsoftTeams.app
  .initialize()
  .then(() => microsoftTeams.app.getContext())
  .then((context) => {
    if (context?.app?.host?.clientType === "web") {
      redirectToNextUri();
      return Promise.resolve();
    }

    return tryLoad(nextUri)
      .then(() => redirectToNextUri())
      .catch(() => authorizeUser(context));
  })
  .catch((error) => catchError(error));
}

function catchError(error) {
  logError(error);

  if (error.message == "CancelledByUser") {
    isRetryWillReload = false;
    setRetryIsVisible(true);
    showError(MSG_AUTH_POPUP_CLOSED);
  } else {
    showError(GeneralFailureError);
  }
}

function clickRetryButton() {
  if (isRetryWillReload) {
      location.reload();
  } else {
      showLoading();
      startAuthentication();
  }
}