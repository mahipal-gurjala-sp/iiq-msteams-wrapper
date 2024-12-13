import { AuthenticationService } from './services/authentication-service';
import { TranslationService } from './services/translation-service';
import './styles.css';


window.onload = async function () {

  let translationService: TranslationService = new TranslationService();
  await translationService.loadLanguage();

  let authService: AuthenticationService = new AuthenticationService(translationService);

  if (!authService.haveValidParams()) {
    return;
  }

  authService.startAuthentication();
};
