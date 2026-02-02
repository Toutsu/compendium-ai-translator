import { TranslationUI, MODULE_ID } from './TranslationUI.js';
import { WorldTranslationUI } from './WorldTranslationUI.js';

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

// Helper function to create translate button
function createTranslateButton(labelKey, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('ai-translation-btn');
    button.innerHTML = `<i class="fas fa-language"></i> ${game.i18n.localize(labelKey)}`;
    button.addEventListener('click', onClick);
    return button;
}

// Helper to add button to directory header
function addButtonToHeader(html, button) {
    const element = html instanceof HTMLElement ? html : html[0];
    const headerActions = element.querySelector('.header-actions');
    if (headerActions) {
        headerActions.append(button);
    } else {
        element.querySelector('.directory-header')?.append(button);
    }
}

// Add button to Compendium sidebar (for Babele translation)
Hooks.on('renderCompendiumDirectory', (app, html) => {
    if (!game.user.isGM) return;

    const button = $(`
        <button class="compendium-translator-btn" title="${game.i18n.localize('COMPENDIUM_TRANSLATOR.ButtonLabel')}">
            <i class="fas fa-language"></i> ${game.i18n.localize('COMPENDIUM_TRANSLATOR.ButtonLabel')}
        </button>
    `);

    button.on('click', () => {
        new TranslationUI().render(true);
    });

    const headerActions = html.find('.directory-header .header-actions');
    if (headerActions.length) {
        headerActions.prepend(button);
    } else {
        html.find('.directory-header').append(button);
    }
});

// Add button to Journal Directory (for direct translation)
Hooks.on('renderJournalDirectory', (app, html) => {
    if (!game.user.isGM) return;

    const button = createTranslateButton('COMPENDIUM_TRANSLATOR.WorldTranslator.TranslateJournals', (e) => {
        e.preventDefault();
        new WorldTranslationUI({ entityType: 'journal' }).render(true);
    });

    addButtonToHeader(html, button);
});

// Add button to Actor Directory
Hooks.on('renderActorDirectory', (app, html) => {
    if (!game.user.isGM) return;

    const button = createTranslateButton('COMPENDIUM_TRANSLATOR.WorldTranslator.TranslateActors', (e) => {
        e.preventDefault();
        new WorldTranslationUI({ entityType: 'actor' }).render(true);
    });

    addButtonToHeader(html, button);
});

// Add button to Item Directory
Hooks.on('renderItemDirectory', (app, html) => {
    if (!game.user.isGM) return;

    const button = createTranslateButton('COMPENDIUM_TRANSLATOR.WorldTranslator.TranslateItems', (e) => {
        e.preventDefault();
        new WorldTranslationUI({ entityType: 'item' }).render(true);
    });

    addButtonToHeader(html, button);
});

// Add button to RollTable Directory
Hooks.on('renderRollTableDirectory', (app, html) => {
    if (!game.user.isGM) return;

    const button = createTranslateButton('COMPENDIUM_TRANSLATOR.WorldTranslator.TranslateTables', (e) => {
        e.preventDefault();
        new WorldTranslationUI({ entityType: 'rolltable' }).render(true);
    });

    addButtonToHeader(html, button);
});

console.log('[Compendium Translator] Module loaded');
