import { AppConstant } from "../constants/app-constant";
import { Translations } from "../interfaces/translations";


export class TranslationService {

    private currentLanguage: string;
    private translations: Translations = {};

    constructor() {
        this.currentLanguage = this.detectBrowserLanguage();
    }

    // Detect the browser language using navigator
    private detectBrowserLanguage(): string {
        const language = navigator.language || AppConstant.DefaultLanguageCode;
        return language.split('-')[0];
    }

    // Set the current language and load translations
    async loadLanguage(lang?: string): Promise<void> {
        try {
            this.currentLanguage = lang || this.currentLanguage;
            const module = await import(`../locales/${this.currentLanguage}.json`);
            this.translations = module.default;
        } catch (error) {
            console.error(`Failed to load translations for language: ${this.currentLanguage}`, error);
            this.translations = {};
        }
    }

    getTranslations(): Translations {
        return this.translations;
    }

    getMessage(key: string, ...values: string[]): string {
        return this.translations[key] ? this.replacePlaceholder(this.translations[key], ...values) : '';
    }

    // Replace placeholder like {0} or {1} on the string
    replacePlaceholder(template: string, ...values) {
        return template.replace(/{(\d+)}/g, (match, index) => values[index] || match);
    }
}

