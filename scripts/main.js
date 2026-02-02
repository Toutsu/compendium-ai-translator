import { TranslationUI, MODULE_ID } from './TranslationUI.js';

/**
 * Compendium AI Translator - Main Module Entry Point
 */

Hooks.once('init', () => {
    console.log('[Compendium Translator] Initializing...');

    // Register module settings
    game.settings.register(MODULE_ID, 'aiProvider', {
        name: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.AIProvider.Name'),
        hint: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.AIProvider.Hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'gemini',
        choices: {
            'gemini': 'Google Gemini',
            'chatgpt': 'ChatGPT (OpenAI)',
            'claude': 'Anthropic Claude',
            'copilot': 'Microsoft Copilot',
            'perplexity': 'Perplexity AI'
        }
    });

    game.settings.register(MODULE_ID, 'targetLanguage', {
        name: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.TargetLanguage.Name'),
        hint: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.TargetLanguage.Hint'),
        scope: 'world',
        config: true,
        type: String,
        default: 'ru',
        choices: {
            'ru': 'Русский (Russian)',
            'de': 'Deutsch (German)',
            'fr': 'Français (French)',
            'es': 'Español (Spanish)',
            'it': 'Italiano (Italian)',
            'pt': 'Português (Portuguese)',
            'pl': 'Polski (Polish)',
            'ja': '日本語 (Japanese)',
            'ko': '한국어 (Korean)',
            'zh': '中文 (Chinese)'
        }
    });

    game.settings.register(MODULE_ID, 'sourceLanguage', {
        name: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.SourceLanguage.Name'),
        hint: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.SourceLanguage.Hint'),
        scope: 'world',
        config: true,
        type: String,
        default: 'en',
        choices: {
            'en': 'English',
            'de': 'German',
            'fr': 'French',
            'es': 'Spanish'
        }
    });

    game.settings.register(MODULE_ID, 'batchSize', {
        name: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.BatchSize.Name'),
        hint: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.BatchSize.Hint'),
        scope: 'client',
        config: true,
        type: Number,
        default: 5,
        range: {
            min: 1,
            max: 20,
            step: 1
        }
    });

    game.settings.register(MODULE_ID, 'maxPromptLength', {
        name: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.MaxPromptLength.Name'),
        hint: game.i18n.localize('COMPENDIUM_TRANSLATOR.Settings.MaxPromptLength.Hint'),
        scope: 'client',
        config: true,
        type: Number,
        default: 50000
    });

    console.log('[Compendium Translator] Settings registered');
});

Hooks.once('ready', () => {
    console.log('[Compendium Translator] Ready');

    // Check if Babele is available
    if (typeof Babele === 'undefined') {
        console.warn('[Compendium Translator] Babele module not detected. This module requires Babele to function.');
        ui.notifications.warn('Compendium AI Translator requires the Babele module to be installed and active.');
    }
});

// Add button to Compendium sidebar
Hooks.on('renderCompendiumDirectory', (app, html) => {
    // Only show for GMs
    if (!game.user.isGM) return;

    const button = $(`
        <button class="compendium-translator-btn" title="${game.i18n.localize('COMPENDIUM_TRANSLATOR.ButtonLabel')}">
            <i class="fas fa-language"></i> ${game.i18n.localize('COMPENDIUM_TRANSLATOR.ButtonLabel')}
        </button>
    `);

    button.on('click', () => {
        new TranslationUI().render(true);
    });

    // Add button to header actions
    const headerActions = html.find('.directory-header .header-actions');
    if (headerActions.length) {
        headerActions.prepend(button);
    } else {
        html.find('.directory-header').append(button);
    }
});

console.log('[Compendium Translator] Module loaded');
