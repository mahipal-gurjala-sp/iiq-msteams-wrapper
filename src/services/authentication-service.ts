import { AppConstant } from "../constants/app-constant";
import { MessageKeys } from "../constants/message-keys";
import { TranslationService } from "./translation-service";


export class AuthenticationService {

    nextUri: string;
    tenantId: string;
    appId: string;

    microsoftTeams: any;

    _isRetryVisible = false;
    isRetryWillReload = false;

    set isRetryVisible(value: boolean) {
        this._isRetryVisible = value;
        document.getElementById("btnRetry").style.display = value ? 'block' : 'none';
    }

    get isRetryVisible() {
        return this._isRetryVisible;
    }

    constructor(private translationService: TranslationService) {
        this.initParams();
    }

    initParams() {
        let url = new URL(window.location.href);
        this.nextUri = url.searchParams.get(AppConstant.NextUriSearchParam);
        this.tenantId = url.searchParams.get(AppConstant.TenantIdSearchParam);
        this.appId = url.searchParams.get(AppConstant.AppIdSearchParam);

        this.showLoading();
        document.getElementById("btnRetry").onclick = () => this.clickRetryButton();
    }

    changeLoaderState(state) {
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


    logError(error: Error) {
        this.changeLoaderState(false);
        if (error) {
            console.error(error);
        }
    }

    showErrorMessage(messageKey: string, ...values: string[]) {
        this.changeLoaderState(false);
        this.changeUIMessage(messageKey, ...values);
    }

    changeUIMessage(messageKey: string, ...values: string[]) {
        document.getElementById("error").innerText = this.translationService.getMessage(messageKey, ...values);
    }

    showLoading() {
        this.isRetryVisible = false;
        this.changeLoaderState(true);
        this.changeUIMessage(MessageKeys.VERIFYING_CREDENTIALS);
    }

    redirectToNextUri() {
        console.log("Also redirecting to", this.nextUri);
        window.location.href = this.nextUri;
    }

    getLoginUrl(loginHint) {
        const redirectUri = encodeURIComponent(
            `${this.nextUri}${this.nextUri.endsWith("/") ? "" : "/"
            }?${AppConstant.AuthCompleteSearchParam}=true`
        );

        return `https://login.microsoftonline.com/${this.tenantId}/oauth2/authorize?response_type=code&client_id=${this.appId}&scope=openid&redirect_uri=${redirectUri}&sso_reload=true&login_hint=${loginHint}`;
    }

    tryLoad(url) {
        console.log("On tryLoad");
        return fetch(url, { method: "HEAD", credentials: "include" })
            .then((response) => {
                console.log("On tryLoad Error 001", response);
                return response.status === 200
                    ? Promise.resolve()
                    : Promise.reject(new Error(AppConstant.InternalLoadUrlFailedError))
            })
            .catch((e) => {
                console.log("On tryLoad Error", e.message);
                console.error(e);
                return Promise.reject(new Error(AppConstant.InternalLoadUrlFailedError))
            });
    }

    authorizeUser(context) {
        console.log("Inside authorizeUser");
        return this.microsoftTeams.authentication
            .authenticate({
                url: this.getLoginUrl(context.user.loginHint),
                width: AppConstant.PopupWidth,
                height: AppConstant.PopupHeight,
                isExternal: false,
            })
            .then(() => this.redirectToNextUri());
    }

    replacePlaceholder(template, ...values) {
        return template.replace(/{(\d+)}/g, (match, index) => values[index] || match);
    }

    haveValidParams() {

        let missingParams = [];

        if (!this.tenantId) {
            missingParams.push(AppConstant.TenantIdSearchParam);
        }
        if (!this.appId) {
            missingParams.push(AppConstant.AppIdSearchParam);
        }
        if (!this.nextUri) {
            missingParams.push(AppConstant.NextUriSearchParam);
        }

        if (missingParams.length > 0) {
            let missingParamsString = missingParams.join(', ');
            let msgParam = missingParams.length == 1 ? MessageKeys.MSG_MISSING_PARAM_SINGLE : MessageKeys.MSG_MISSING_PARAM_MULTIPLE;
            this.showErrorMessage(msgParam, missingParamsString);
            return false;
        }

        if (!('microsoftTeams' in window)) {
            this.isRetryWillReload = true;
            this.isRetryVisible = true;
            this.showErrorMessage(MessageKeys.MSG_TEAMS_SDK_ERROR);
            return false;
        }

        return true;
    }

    startAuthentication() {
        this.microsoftTeams = window['microsoftTeams'];
        this.microsoftTeams.app
            .initialize()
            .then(() => this.microsoftTeams.app.getContext())
            .then((context) => {
                if (context?.app?.host?.clientType === "web") {
                    console.log("It's web calling next then");
                    this.redirectToNextUri();
                    return Promise.resolve();
                }
                console.log("Before try reload");
                return this.tryLoad(this.nextUri)
                    .then(() => {
                        console.log("Try load goes success");
                        this.redirectToNextUri()
                    })
                    .catch((e) => {
                        console.log("Handel error", e.message);
                        return this.authorizeUser(context);
                    });
            })
            .catch((error) => this.catchError(error));
    }

    catchError(error: Error) {
        this.logError(error);

        if (error.message == "CancelledByUser") {
            this.isRetryVisible = true;
            this.isRetryWillReload = false;
            this.showErrorMessage(MessageKeys.MSG_AUTH_POPUP_CLOSED);
        } else {
            this.showErrorMessage(MessageKeys.GENERAL_FAILURE_ERROR);
        }
    }

    clickRetryButton() {
        if (this.isRetryWillReload) {
            location.reload();
        } else {
            this.showLoading();
            this.startAuthentication();
        }
    }
}