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

        // Basic controls
        html.find('[name="compendium"]').change(this._onCompendiumChange.bind(this));
        html.find('[name="entityType"]').change(this._onEntityTypeChange.bind(this));
        html.find('[name="provider"]').change(this._onProviderChange.bind(this));

        // Dictionary controls
        html.find('.load-dictionary').click(this._onLoadDictionary.bind(this));
        html.find('.clear-dictionary').click(this._onClearDictionary.bind(this));

        // Copy-paste workflow
        html.find('.extract-entities').click(this._onExtractEntities.bind(this));
        html.find('.generate-prompt').click(this._onGeneratePrompt.bind(this));
        html.find('.copy-prompt').click(this._onCopyPrompt.bind(this));
        html.find('.process-response').click(this._onProcessResponse.bind(this));
        html.find('.generate-spellcheck').click(this._onGenerateSpellcheck.bind(this));

        // Direct API workflow (legacy)
        html.find('.start-translation').click(this._onStartDirectTranslation.bind(this));

        // Export
        html.find('.export-json').click(this._onExportJSON.bind(this));

        // Mode toggle
        html.find('.toggle-mode').click(this._onToggleMode.bind(this));
    }

    async _onCompendiumChange(event) {
        const compendiumId = event.target.value;
        this.selectedCompendium = game.packs.get(compendiumId);

        if (this.selectedCompendium) {
            const stats = await EntityExtractor.getCompendiumStats(this.selectedCompendium);
            const statsHtml = `
                <div class="compendium-stats">
                    <p>Total entities: ${stats.totalEntities}</p>
                    <p>Estimated characters: ~${stats.estimatedCharacters.toLocaleString()}</p>
                </div>
            `;
            this.element.find('.compendium-info').html(statsHtml);
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
            ui.notifications.warn('pf2e-ru module not found or not active!');
            return;
        }

        this.progress.status = 'loading-dictionary';
        this.render();

        try {
            this.dictionary = await DictionaryLoader.loadOfficialTranslations();
            ui.notifications.info(`Loaded ${Object.keys(this.dictionary).length} terms from pf2e-ru`);
            this.progress.status = 'idle';
        } catch (error) {
            console.error('[Compendium Translator] Failed to load dictionary:', error);
            ui.notifications.error('Failed to load dictionary');
            this.progress.status = 'error';
        }

        this.render();
    }

    _onClearDictionary(event) {
        event.preventDefault();
        DictionaryLoader.clearCache();
        this.dictionary = null;
        ui.notifications.info('Dictionary cache cleared');
        this.render();
    }

    async _onExtractEntities(event) {
        event.preventDefault();

        if (!this.selectedCompendium) {
            ui.notifications.error('Please select a compendium first');
            return;
        }

        this.progress.status = 'extracting';
        this.render();

        try {
            // Extract entities
            const entities = await EntityExtractor.extractFromCompendium(
                this.selectedCompendium,
                this.entityTypeFilter
            );

            if (entities.length === 0) {
                ui.notifications.warn('No translatable entities found');
                this.progress.status = 'idle';
                this.render();
                return;
            }

            this.extractedEntities = entities;

            // Apply dictionary if loaded
            if (this.dictionary) {
                this.progress.status = 'replacing-terms';
                this.render();

                const result = TermReplacer.processEntities(entities, this.dictionary);
                this.processedEntities = result.entities;

                // Show replacement stats
                ui.notifications.info(`Extracted ${entities.length} entities. Auto-replaced ${result.totalReplacements.length} terms.`);
                console.log('[Compendium Translator] Replaced terms:', result.totalReplacements);
            } else {
                this.processedEntities = entities;
                ui.notifications.info(`Extracted ${entities.length} entities`);
            }

            this.progress.status = 'extracted';
            this.render();

        } catch (error) {
            console.error('[Compendium Translator] Extraction failed:', error);
            ui.notifications.error('Extraction failed: ' + error.message);
            this.progress.status = 'error';
            this.render();
        }
    }

    async _onGeneratePrompt(event) {
        event.preventDefault();

        if (!this.processedEntities || this.processedEntities.length === 0) {
            ui.notifications.warn('Extract entities first');
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
        ui.notifications.info(`Prompt generated: ${stats.entityCount} entities, ~${stats.estimatedTokens} tokens`);

        this.render();
    }

    async _onCopyPrompt(event) {
        event.preventDefault();

        if (!this.generatedPrompt) {
            ui.notifications.warn('Generate prompt first');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.generatedPrompt);
            ui.notifications.info('Prompt copied to clipboard! Paste it into your AI chat.');
        } catch (error) {
            ui.notifications.error('Failed to copy to clipboard');
            console.error(error);
        }
    }

    async _onProcessResponse(event) {
        event.preventDefault();

        const responseText = this.element.find('[name="ai-response"]').val();
        if (!responseText) {
            ui.notifications.warn('Paste AI response first');
            return;
        }

        this.progress.status = 'processing';
        this.render();

        try {
            // Parse AI response
            const parsedEntities = PromptGenerator.parseAIResponse(responseText);
            if (!parsedEntities) {
                ui.notifications.error('Invalid AI response format');
                this.progress.status = 'error';
                this.render();
                return;
            }

            this.translatedEntities = parsedEntities;

            // Generate Babele JSON
            this.progress.status = 'generating';
            this.render();

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

            ui.notifications.info('Translation processed and registered with Babele!');
            this.progress.status = 'complete';
            this.render();

        } catch (error) {
            console.error('[Compendium Translator] Response processing failed:', error);
            ui.notifications.error('Failed to process response: ' + error.message);
            this.progress.status = 'error';
            this.render();
        }
    }

    async _onGenerateSpellcheck(event) {
        event.preventDefault();

        if (!this.translatedEntities || !this.extractedEntities) {
            ui.notifications.warn('Complete translation first');
            return;
        }

        const spellcheckPrompt = PromptGenerator.generateSpellCheckPrompt(
            this.translatedEntities,
            this.extractedEntities
        );

        try {
            await navigator.clipboard.writeText(spellcheckPrompt);
            ui.notifications.info('Spell-check prompt copied! Paste into AI for review.');
        } catch (error) {
            ui.notifications.error('Failed to copy spell-check prompt');
        }
    }

    async _onStartDirectTranslation(event) {
        // Legacy direct API workflow (kept for backward compatibility)
        event.preventDefault();
        ui.notifications.warn('Direct API mode not yet updated for new workflow. Use copy-paste mode.');
    }

    async _onExportJSON(event) {
        event.preventDefault();

        if (!this.lastTranslation) {
            ui.notifications.warn('No translation to export');
            return;
        }

        const { babeleData, compendiumId, language } = this.lastTranslation;
        await BabeleGenerator.saveTranslation(babeleData, compendiumId, language);
        ui.notifications.info('Translation JSON exported successfully!');
    }

    _onToggleMode(event) {
        event.preventDefault();
        this.useDirectAPI = !this.useDirectAPI;
        this.render();
    }
}
