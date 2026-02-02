import { EntityExtractor } from './EntityExtractor.js';
import { TranslationService } from './TranslationService.js';
import { BabeleGenerator } from './BabeleGenerator.js';

export const MODULE_ID = 'compendium-ai-translator';

/**
 * TranslationUI - Main UI for the translation tool
 */
export class TranslationUI extends FormApplication {
    constructor(options = {}) {
        super(options);

        this.translationService = new TranslationService();
        this.selectedCompendium = null;
        this.entityTypeFilter = null;
        this.translating = false;
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
            width: 600,
            height: 'auto',
            closeOnSubmit: false,
            submitOnChange: false,
            classes: ['compendium-translator']
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

        return {
            compendiums,
            entityTypes,
            selectedCompendium: this.selectedCompendium,
            entityTypeFilter: this.entityTypeFilter,
            progress: this.progress,
            translating: this.translating,
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

        html.find('[name="compendium"]').change(this._onCompendiumChange.bind(this));
        html.find('[name="entityType"]').change(this._onEntityTypeChange.bind(this));
        html.find('[name="provider"]').change(this._onProviderChange.bind(this));
        html.find('.start-translation').click(this._onStartTranslation.bind(this));
        html.find('.cancel-translation').click(this._onCancelTranslation.bind(this));
        html.find('.export-json').click(this._onExportJSON.bind(this));
    }

    async _onCompendiumChange(event) {
        const compendiumId = event.target.value;
        this.selectedCompendium = game.packs.get(compendiumId);

        if (this.selectedCompendium) {
            // Show stats
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

    async _onStartTranslation(event) {
        event.preventDefault();

        if (!this.selectedCompendium) {
            ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.NoCompendium'));
            return;
        }

        const apiKey = localStorage.getItem('compendium-translator-api-key');
        if (!apiKey) {
            // Prompt for API key
            const key = await this._promptForAPIKey();
            if (!key) return;
        }

        this.translating = true;
        this.progress = { current: 0, total: 0, status: 'extracting' };
        this.render();

        try {
            await this._performTranslation();
        } catch (error) {
            console.error('[Compendium Translator] Translation failed:', error);
            ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.TranslationFailed')
                .replace('{error}', error.message));
            this.progress.status = 'error';
        } finally {
            this.translating = false;
            this.render();
        }
    }

    async _performTranslation() {
        // Step 1: Extract entities
        this.progress.status = 'extracting';
        this.render();

        const entities = await EntityExtractor.extractFromCompendium(
            this.selectedCompendium,
            this.entityTypeFilter
        );

        if (entities.length === 0) {
            ui.notifications.warn('No translatable entities found in this compendium.');
            return;
        }

        // Step 2: Batch entities
        const maxChars = game.settings.get(MODULE_ID, 'maxPromptLength');
        const batches = EntityExtractor.batchEntities(entities, maxChars);

        this.progress.total = batches.length;
        this.progress.status = 'translating';
        this.render();

        // Step 3: Translate each batch
        const translatedEntities = [];
        for (let i = 0; i < batches.length; i++) {
            this.progress.current = i + 1;
            this.render();

            const batch = batches[i];
            const translated = await this.translationService.translate(batch, {
                apiKey: localStorage.getItem('compendium-translator-api-key')
            });

            translatedEntities.push(...translated);

            // Small delay to avoid rate limiting
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Step 4: Generate Babele JSON
        this.progress.status = 'generating';
        this.render();

        const babeleData = BabeleGenerator.generate(translatedEntities, this.selectedCompendium.metadata);

        // Store result for export
        this.lastTranslation = {
            babeleData,
            compendiumId: this.selectedCompendium.collection,
            language: game.settings.get(MODULE_ID, 'targetLanguage')
        };

        // Step 5: Register with Babele
        const targetLang = game.settings.get(MODULE_ID, 'targetLanguage');
        await BabeleGenerator.registerWithBabele(
            babeleData,
            this.selectedCompendium.collection,
            targetLang
        );

        this.progress.status = 'complete';
        this.render();
        ui.notifications.info('Translation completed successfully!');
    }

    async _onCancelTranslation(event) {
        event.preventDefault();
        this.translating = false;
        this.progress = { current: 0, total: 0, status: 'idle' };
        this.render();
    }

    async _onExportJSON(event) {
        event.preventDefault();

        if (!this.lastTranslation) {
            ui.notifications.warn('No translation to export. Please translate a compendium first.');
            return;
        }

        const { babeleData, compendiumId, language } = this.lastTranslation;
        await BabeleGenerator.saveTranslation(babeleData, compendiumId, language);
    }

    async _promptForAPIKey() {
        return new Promise((resolve) => {
            new Dialog({
                title: 'Enter API Key',
                content: `
                    <form>
                        <div class="form-group">
                            <label>API Key for ${game.settings.get(MODULE_ID, 'aiProvider')}</label>
                            <input type="password" name="apiKey" autofocus>
                            <p class="notes">Your API key is stored locally in your browser only.</p>
                        </div>
                    </form>
                `,
                buttons: {
                    ok: {
                        label: 'OK',
                        callback: (html) => {
                            const key = html.find('[name="apiKey"]').val();
                            if (key) {
                                localStorage.setItem('compendium-translator-api-key', key);
                                resolve(key);
                            } else {
                                resolve(null);
                            }
                        }
                    },
                    cancel: {
                        label: 'Cancel',
                        callback: () => resolve(null)
                    }
                },
                default: 'ok'
            }).render(true);
        });
    }
}
