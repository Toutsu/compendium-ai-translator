import { EntityExtractor } from './EntityExtractor.js';
import { DictionaryLoader } from './DictionaryLoader.js';
import { TermReplacer } from './TermReplacer.js';
import { PromptGenerator } from './PromptGenerator.js';
import { BabeleGenerator } from './BabeleGenerator.js';
import { TranslationService } from './TranslationService.js';

export const MODULE_ID = 'compendium-ai-translator';

/**
 * TranslationUI - Main UI for copy-paste translation workflow
 */
export class TranslationUI extends FormApplication {
    constructor(options = {}) {
        super(options);

        this.selectedCompendium = null;
        this.entityTypeFilter = null;
        this.dictionary = null;
        this.extractedEntities = null;
        this.processedEntities = null;
        this.generatedPrompt = null;
        this.translatedEntities = null;
        this.useDirectAPI = false; // Toggle between copy-paste and direct API
        this.translationService = new TranslationService();

        this.progress = {
            current: 0,
            total: 0,
            status: 'idle'
        };
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'compendium-translator',
            title: game.i18n.localize('COMPENDIUM_TRANSLATOR.Title'),
            template: 'modules/compendium-ai-translator/templates/translator-app.hbs',
            width: 700,
            height: 'auto',
            closeOnSubmit: false,
            submitOnChange: false,
            classes: ['compendium-translator'],
            resizable: true
        });
    }

    getData() {
        const compendiums = game.packs.map(pack => ({
            id: pack.collection,
            label: pack.metadata.label,
            type: pack.metadata.type
        }));

        const entityTypes = [
            'Actor', 'Item', 'JournalEntry', 'Scene',
            'RollTable', 'Macro', 'Playlist', 'Cards'
        ];

        const dictionaryStats = DictionaryLoader.getStats();
        const isPF2eRuAvailable = DictionaryLoader.isPF2eRuAvailable();

        return {
            compendiums,
            entityTypes,
            selectedCompendium: this.selectedCompendium,
            entityTypeFilter: this.entityTypeFilter,
            progress: this.progress,
            dictionary: dictionaryStats,
            isPF2eRuAvailable,
            generatedPrompt: this.generatedPrompt,
            useDirectAPI: this.useDirectAPI,
            providers: [
                { id: 'gemini', name: 'Google Gemini' },
                { id: 'chatgpt', name: 'ChatGPT (OpenAI)' },
                { id: 'claude', name: 'Anthropic Claude' },
                { id: 'copilot', name: 'Microsoft Copilot' },
                { id: 'perplexity', name: 'Perplexity AI' }
            ],
            currentProvider: game.settings.get(MODULE_ID, 'aiProvider')
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Get the actual HTML element (v13 passes HTMLElement, earlier versions pass jQuery)
        const element = html instanceof HTMLElement ? html : html[0];

        // Basic controls
        element.querySelector('[name="compendium"]')?.addEventListener('change', this._onCompendiumChange.bind(this));
        element.querySelector('[name="entityType"]')?.addEventListener('change', this._onEntityTypeChange.bind(this));
        element.querySelector('[name="provider"]')?.addEventListener('change', this._onProviderChange.bind(this));

        // Dictionary controls
        element.querySelector('.load-dictionary')?.addEventListener('click', this._onLoadDictionary.bind(this));
        element.querySelector('.clear-dictionary')?.addEventListener('click', this._onClearDictionary.bind(this));

        // Copy-paste workflow
        element.querySelector('.extract-entities')?.addEventListener('click', this._onExtractEntities.bind(this));
        element.querySelector('.generate-prompt')?.addEventListener('click', this._onGeneratePrompt.bind(this));
        element.querySelector('.copy-prompt')?.addEventListener('click', this._onCopyPrompt.bind(this));
        element.querySelector('.process-response')?.addEventListener('click', this._onProcessResponse.bind(this));
        element.querySelector('.generate-spellcheck')?.addEventListener('click', this._onGenerateSpellcheck.bind(this));

        // Direct API workflow (legacy)
        element.querySelector('.start-translation')?.addEventListener('click', this._onStartDirectTranslation.bind(this));

        // Export
        element.querySelector('.export-json')?.addEventListener('click', this._onExportJSON.bind(this));

        // Mode toggle
        element.querySelector('.toggle-mode')?.addEventListener('click', this._onToggleMode.bind(this));
    }

    async _onCompendiumChange(event) {
        const compendiumId = event.target.value;
        this.selectedCompendium = game.packs.get(compendiumId);

        if (this.selectedCompendium) {
            // Auto-detect document type from compendium
            const docType = this.selectedCompendium.documentName;
            this.entityTypeFilter = docType;

            // Update the select element to show the detected type
            const element = this.element instanceof HTMLElement ? this.element : this.element[0];
            const typeSelect = element?.querySelector('[name="entityType"]');
            if (typeSelect) {
                typeSelect.value = docType;
            }

            const stats = await EntityExtractor.getCompendiumStats(this.selectedCompendium);
            const statsHtml = `
                <div class="compendium-stats">
                    <p>${game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Stats.TotalEntities')}: ${stats.totalEntities}</p>
                    <p>${game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Stats.EstimatedCharacters')}: ~${stats.estimatedCharacters.toLocaleString()}</p>
                    <p><em>${game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Stats.Type')}: ${docType}</em></p>
                </div>
            `;
            const infoElement = element?.querySelector('.compendium-info');
            if (infoElement) {
                infoElement.innerHTML = statsHtml;
            }
        }
    }

    _onEntityTypeChange(event) {
        this.entityTypeFilter = event.target.value || null;
    }

    _onProviderChange(event) {
        const provider = event.target.value;
        game.settings.set(MODULE_ID, 'aiProvider', provider);
    }

    async _onLoadDictionary(event) {
        event.preventDefault();

        if (!DictionaryLoader.isPF2eRuAvailable()) {
            ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Dictionary.NotFound'));
            return;
        }

        this.progress.status = game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Status.LoadingDictionary');
        this.render();

        try {
            this.dictionary = await DictionaryLoader.loadOfficialTranslations();
            ui.notifications.info(game.i18n.format('COMPENDIUM_TRANSLATOR.Notifications.DictionaryLoaded', { count: Object.keys(this.dictionary).length }));
            this.progress.status = 'idle';
        } catch (error) {
            console.error('[Compendium Translator] Failed to load dictionary:', error);
            ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.LoadFailed'));
            this.progress.status = 'error';
        }

        this.render();
    }

    _onClearDictionary(event) {
        event.preventDefault();
        DictionaryLoader.clearCache();
        this.dictionary = null;
        ui.notifications.info(game.i18n.localize('COMPENDIUM_TRANSLATOR.Notifications.DictionaryCleared'));
        this.render();
    }

    async _onExtractEntities(event) {
        event.preventDefault();

        if (!this.selectedCompendium) {
            ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.NoCompendium'));
            return;
        }

        this.progress.status = game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Status.Extracting');
        this.render();

        try {
            // Extract entities
            const entities = await EntityExtractor.extractFromCompendium(
                this.selectedCompendium,
                this.entityTypeFilter
            );

            if (entities.length === 0) {
                ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.NoEntities'));
                this.progress.status = 'idle';
                this.render();
                return;
            }

            this.extractedEntities = entities;

            // Apply dictionary if loaded
            if (this.dictionary) {
                this.progress.status = game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Status.ReplacingTerms');
                this.render();

                const result = TermReplacer.processEntities(entities, this.dictionary);
                this.processedEntities = result.entities;

                // Show replacement stats
                ui.notifications.info(game.i18n.format('COMPENDIUM_TRANSLATOR.Notifications.ExtractedWithTerms', {
                    count: entities.length,
                    terms: result.totalReplacements.length
                }));
                console.log('[Compendium Translator] Replaced terms:', result.totalReplacements);
            } else {
                this.processedEntities = entities;
                ui.notifications.info(game.i18n.format('COMPENDIUM_TRANSLATOR.Notifications.Extracted', { count: entities.length }));
            }

            this.progress.status = 'extracted';
            this.render();

        } catch (error) {
            console.error('[Compendium Translator] Extraction failed:', error);
            ui.notifications.error(game.i18n.format('COMPENDIUM_TRANSLATOR.Errors.TranslationFailed', { error: error.message }));
            this.progress.status = 'error';
            this.render();
        }
    }

    async _onGeneratePrompt(event) {
        event.preventDefault();

        if (!this.processedEntities || this.processedEntities.length === 0) {
            ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.ExtractFirst'));
            return;
        }

        const targetLang = game.settings.get(MODULE_ID, 'targetLanguage');
        const sourceLang = game.settings.get(MODULE_ID, 'sourceLanguage');

        // Generate prompt
        this.generatedPrompt = PromptGenerator.generateTranslationPrompt(
            this.processedEntities,
            this.dictionary || {},
            {
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
                gameSystem: game.system.id,
                entityType: this.entityTypeFilter || 'mixed'
            }
        );

        const stats = PromptGenerator.generateStats(this.processedEntities);
        ui.notifications.info(game.i18n.format('COMPENDIUM_TRANSLATOR.Notifications.PromptGenerated', {
            count: stats.entityCount,
            tokens: stats.estimatedTokens
        }));

        this.render();
    }

    async _onCopyPrompt(event) {
        event.preventDefault();

        if (!this.generatedPrompt) {
            ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.GenerateFirst'));
            return;
        }

        try {
            await navigator.clipboard.writeText(this.generatedPrompt);
            ui.notifications.info(game.i18n.localize('COMPENDIUM_TRANSLATOR.Notifications.PromptCopied'));
        } catch (error) {
            ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.CopyFailed'));
            console.error(error);
        }
    }

    async _onProcessResponse(event) {
        event.preventDefault();

        // Get the textarea content directly
        const element = this.element instanceof HTMLElement ? this.element : this.element[0];
        const textarea = element.querySelector('[name="ai-response"]');
        const responseText = textarea?.value;

        if (!responseText || !responseText.trim()) {
            ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.PasteFirst'));
            return;
        }

        // Helper to update status without re-rendering form (to keep text input)
        const setStatus = (status, errorMsg = null) => {
            this.progress.status = status;

            // Update status text
            const statusEl = element.querySelector('.status-text');
            if (statusEl) {
                if (status === 'error') {
                    statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorMsg || game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Status.Error')}`;
                    statusEl.classList.add('error');
                } else if (status === 'complete') {
                    statusEl.innerHTML = `<i class="fas fa-check-circle"></i> ${game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Success.Complete')}`;
                    statusEl.classList.remove('error');
                } else {
                    statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${status}`;
                    statusEl.classList.remove('error');
                }
            }
        };

        try {
            setStatus(game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Status.Parsing'));

            // Parse AI response
            const parsedEntities = PromptGenerator.parseAIResponse(responseText);
            if (!parsedEntities) {
                ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.InvalidFormat'));
                setStatus('error', game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.InvalidFormat'));
                return;
            }

            // Merge parsed entities with original extracted entities to restore type info
            this.translatedEntities = parsedEntities.map(parsed => {
                const original = this.extractedEntities.find(e => e.id === parsed.id);
                if (!original) {
                    console.warn(`[Compendium Translator] Translated entity ${parsed.id} not found in extracted entities`);
                    return parsed;
                }

                // Return merged object compatible with BabeleGenerator
                return {
                    ...original, // Keep original metadata (type, etc.)
                    name: parsed.name || original.name,
                    translatableFields: parsed.translatedFields || original.translatableFields // Map translatedFields to translatableFields
                };
            });

            // Generate Babele JSON
            setStatus(game.i18n.localize('COMPENDIUM_TRANSLATOR.UI.Status.Generating'));

            const babeleData = BabeleGenerator.generate(parsedEntities, this.selectedCompendium.metadata);

            // Store for export
            this.lastTranslation = {
                babeleData,
                compendiumId: this.selectedCompendium.collection,
                language: game.settings.get(MODULE_ID, 'targetLanguage')
            };

            // Register with Babele
            const targetLang = game.settings.get(MODULE_ID, 'targetLanguage');
            await BabeleGenerator.registerWithBabele(
                babeleData,
                this.selectedCompendium.collection,
                targetLang
            );

            ui.notifications.info(game.i18n.localize('COMPENDIUM_TRANSLATOR.Notifications.TranslationProcessed'));
            setStatus('complete');

            // Only re-render on success to show the "Export" button
            setTimeout(() => this.render(), 1000);

        } catch (error) {
            console.error('[Compendium Translator] Response processing failed:', error);
            ui.notifications.error(game.i18n.format('COMPENDIUM_TRANSLATOR.Errors.TranslationFailed', { error: error.message }));
            setStatus('error', error.message);
        }
    }

    async _onGenerateSpellcheck(event) {
        event.preventDefault();

        if (!this.translatedEntities || !this.extractedEntities) {
            ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.CompleteFirst'));
            return;
        }

        const spellcheckPrompt = PromptGenerator.generateSpellCheckPrompt(
            this.translatedEntities,
            this.extractedEntities
        );

        try {
            await navigator.clipboard.writeText(spellcheckPrompt);
            ui.notifications.info(game.i18n.localize('COMPENDIUM_TRANSLATOR.Notifications.SpellcheckCopied'));
        } catch (error) {
            ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.CopyFailed'));
        }
    }

    async _onStartDirectTranslation(event) {
        // Legacy direct API workflow (kept for backward compatibility)
        event.preventDefault();
        ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.Warnings.DirectModeNotReady'));
    }

    async _onExportJSON(event) {
        event.preventDefault();

        if (!this.lastTranslation) {
            ui.notifications.warn(game.i18n.localize('COMPENDIUM_TRANSLATOR.Notifications.NoTranslation'));
            return;
        }

        const { babeleData, compendiumId, language } = this.lastTranslation;
        await BabeleGenerator.saveTranslation(babeleData, compendiumId, language);
        ui.notifications.info(game.i18n.localize('COMPENDIUM_TRANSLATOR.Notifications.TranslationExported'));
    }

    _onToggleMode(event) {
        event.preventDefault();
        this.useDirectAPI = !this.useDirectAPI;
        this.render();
    }
}
