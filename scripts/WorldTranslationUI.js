import { WorldEntityExtractor } from './WorldEntityExtractor.js';
import { EntityUpdater } from './EntityUpdater.js';
import { DictionaryLoader } from './DictionaryLoader.js';
import { TermReplacer } from './TermReplacer.js';
import { PromptGenerator } from './PromptGenerator.js';

export const MODULE_ID = 'compendium-ai-translator';

/**
 * WorldTranslationUI - UI for translating world entities (not compendiums)
 * Supports journals, actors, items with copy-paste workflow
 */
export class WorldTranslationUI extends FormApplication {
    constructor(options = {}) {
        super(options);

        this.entityType = options.entityType || 'journal';
        this.selectedEntities = new Set();
        this.dictionary = null;
        this.extractedData = null;
        this.processedData = null;
        this.generatedPrompt = null;
        this.translatedData = null;

        this.progress = {
            status: 'idle',
            current: 0,
            total: 0
        };
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'world-translator',
            title: game.i18n.localize('COMPENDIUM_TRANSLATOR.WorldTranslator.Title'),
            template: 'modules/compendium-ai-translator/templates/world-translator-app.hbs',
            width: 750,
            height: 'auto',
            closeOnSubmit: false,
            submitOnChange: false,
            classes: ['world-translator', 'compendium-translator'],
            resizable: true
        });
    }

    getData() {
        const entities = WorldEntityExtractor.getWorldEntities(this.entityType);
        const stats = WorldEntityExtractor.getWorldStats(this.entityType);
        const dictionaryStats = DictionaryLoader.getStats();

        // Map entities for display
        const entityList = entities.map(e => {
            const extracted = WorldEntityExtractor.extractFromEntity(e, this.entityType);
            return {
                id: e.id,
                name: e.name,
                isSelected: this.selectedEntities.has(e.id),
                isTranslated: extracted.isTranslated,
                hasContent: WorldEntityExtractor.hasTranslatableContent(extracted),
                pageCount: extracted.pages?.length || 0,
                contentPreview: this.getContentPreview(extracted)
            };
        }).filter(e => e.hasContent);

        return {
            entityType: this.entityType,
            entityTypes: [
                { id: 'journal', name: 'Journals', icon: 'fa-book-open' },
                { id: 'actor', name: 'Actors', icon: 'fa-user' },
                { id: 'item', name: 'Items', icon: 'fa-suitcase' },
                { id: 'rolltable', name: 'Roll Tables', icon: 'fa-th-list' }
            ],
            entities: entityList,
            stats,
            dictionary: dictionaryStats,
            isPF2eRuAvailable: DictionaryLoader.isPF2eRuAvailable(),
            progress: this.progress,
            generatedPrompt: this.generatedPrompt,
            hasSelection: this.selectedEntities.size > 0,
            hasTranslation: !!this.translatedData
        };
    }

    getContentPreview(extracted) {
        if (extracted.pages && extracted.pages.length > 0) {
            return `${extracted.pages.length} pages`;
        }
        if (extracted.fields) {
            const fields = Object.keys(extracted.fields);
            return fields.join(', ') || '-';
        }
        return '-';
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Entity type tabs
        html.find('.entity-type-tab').click(this._onEntityTypeChange.bind(this));

        // Entity selection
        html.find('.entity-checkbox').change(this._onEntitySelect.bind(this));
        html.find('.select-all').click(this._onSelectAll.bind(this));
        html.find('.deselect-all').click(this._onDeselectAll.bind(this));
        html.find('.select-untranslated').click(this._onSelectUntranslated.bind(this));

        // Dictionary
        html.find('.load-dictionary').click(this._onLoadDictionary.bind(this));

        // Workflow buttons
        html.find('.extract-selected').click(this._onExtract.bind(this));
        html.find('.generate-prompt').click(this._onGeneratePrompt.bind(this));
        html.find('.copy-prompt').click(this._onCopyPrompt.bind(this));
        html.find('.process-response').click(this._onProcessResponse.bind(this));
        html.find('.generate-spellcheck').click(this._onGenerateSpellcheck.bind(this));
        html.find('.apply-translation').click(this._onApplyTranslation.bind(this));

        // Restore
        html.find('.restore-backup').click(this._onRestoreBackup.bind(this));
    }

    async _onEntityTypeChange(event) {
        const type = event.currentTarget.dataset.type;
        this.entityType = type;
        this.selectedEntities.clear();
        this.extractedData = null;
        this.generatedPrompt = null;
        this.translatedData = null;
        this.progress.status = 'idle';
        this.render();
    }

    _onEntitySelect(event) {
        const id = event.currentTarget.dataset.id;
        if (event.currentTarget.checked) {
            this.selectedEntities.add(id);
        } else {
            this.selectedEntities.delete(id);
        }
        this.render();
    }

    _onSelectAll(event) {
        event.preventDefault();
        const entities = WorldEntityExtractor.getWorldEntities(this.entityType);
        for (const entity of entities) {
            const extracted = WorldEntityExtractor.extractFromEntity(entity, this.entityType);
            if (WorldEntityExtractor.hasTranslatableContent(extracted)) {
                this.selectedEntities.add(entity.id);
            }
        }
        this.render();
    }

    _onDeselectAll(event) {
        event.preventDefault();
        this.selectedEntities.clear();
        this.render();
    }

    _onSelectUntranslated(event) {
        event.preventDefault();
        const entities = WorldEntityExtractor.getWorldEntities(this.entityType);
        for (const entity of entities) {
            const extracted = WorldEntityExtractor.extractFromEntity(entity, this.entityType);
            if (!extracted.isTranslated && WorldEntityExtractor.hasTranslatableContent(extracted)) {
                this.selectedEntities.add(entity.id);
            }
        }
        this.render();
    }

    async _onLoadDictionary(event) {
        event.preventDefault();

        if (!DictionaryLoader.isPF2eRuAvailable()) {
            ui.notifications.warn('pf2e-ru module not found');
            return;
        }

        this.progress.status = 'loading-dictionary';
        this.render();

        try {
            this.dictionary = await DictionaryLoader.loadOfficialTranslations();
            ui.notifications.info(`Loaded ${Object.keys(this.dictionary).length} terms`);
        } catch (error) {
            console.error('[World Translator] Dictionary load failed:', error);
            ui.notifications.error('Failed to load dictionary');
        }

        this.progress.status = 'idle';
        this.render();
    }

    async _onExtract(event) {
        event.preventDefault();

        if (this.selectedEntities.size === 0) {
            ui.notifications.warn('Select at least one entity');
            return;
        }

        this.progress.status = 'extracting';
        this.render();

        try {
            const entities = WorldEntityExtractor.getWorldEntities(this.entityType);
            const selected = entities.filter(e => this.selectedEntities.has(e.id));

            this.extractedData = WorldEntityExtractor.batchExtract(selected, this.entityType, false);

            // Apply term replacement if dictionary loaded
            if (this.dictionary) {
                this.progress.status = 'replacing-terms';
                this.render();

                const result = TermReplacer.processEntities(this.extractedData, this.dictionary);
                this.processedData = result.entities;

                ui.notifications.info(`Extracted ${this.extractedData.length} entities, replaced ${result.totalReplacements.length} terms`);
            } else {
                this.processedData = this.extractedData;
                ui.notifications.info(`Extracted ${this.extractedData.length} entities`);
            }

            this.progress.status = 'extracted';
        } catch (error) {
            console.error('[World Translator] Extraction failed:', error);
            ui.notifications.error('Extraction failed');
            this.progress.status = 'error';
        }

        this.render();
    }

    async _onGeneratePrompt(event) {
        event.preventDefault();

        if (!this.processedData || this.processedData.length === 0) {
            ui.notifications.warn('Extract entities first');
            return;
        }

        const targetLang = game.settings.get(MODULE_ID, 'targetLanguage');

        // Generate prompt for world entities (different format - direct update)
        this.generatedPrompt = this.generateWorldTranslationPrompt(this.processedData, targetLang);

        ui.notifications.info(`Prompt generated for ${this.processedData.length} entities`);
        this.render();
    }

    generateWorldTranslationPrompt(entities, targetLang) {
        const langName = targetLang === 'ru' ? 'Russian' : targetLang;

        let prompt = `# Translation Task

Translate the following ${this.entityType} entities to ${langName}.

## Important Rules:
1. Preserve ALL HTML tags, Foundry links (@UUID, @Compendium), and roll formulas ([[...]])
2. Translate only the text content, not IDs or structural elements
3. Maintain the same JSON structure
4. Return ONLY valid JSON, no explanations

## Pre-translated Terms (use these for consistency):
`;

        // Add dictionary terms
        if (this.dictionary) {
            const terms = Object.entries(this.dictionary).slice(0, 30);
            for (const [en, ru] of terms) {
                prompt += `- ${en} → ${ru}\n`;
            }
            prompt += `... and ${Object.keys(this.dictionary).length - 30} more terms\n`;
        }

        prompt += `
## Entities to Translate:

\`\`\`json
${JSON.stringify(entities, null, 2)}
\`\`\`

## Expected Output Format:
Return the same structure with translated values. Keep all IDs unchanged.
`;

        return prompt;
    }

    async _onCopyPrompt(event) {
        event.preventDefault();

        if (!this.generatedPrompt) {
            ui.notifications.warn('Generate prompt first');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.generatedPrompt);
            ui.notifications.info('Prompt copied! Paste into AI chat.');
        } catch (error) {
            ui.notifications.error('Copy failed');
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
            // Parse JSON from response
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
                || responseText.match(/```\s*([\s\S]*?)\s*```/)
                || [null, responseText];

            const jsonText = jsonMatch[1] || responseText;
            this.translatedData = JSON.parse(jsonText.trim());

            if (!Array.isArray(this.translatedData)) {
                throw new Error('Expected array of entities');
            }

            ui.notifications.info(`Parsed ${this.translatedData.length} translated entities`);
            this.progress.status = 'ready-to-apply';
        } catch (error) {
            console.error('[World Translator] Parse failed:', error);
            ui.notifications.error('Invalid response format: ' + error.message);
            this.progress.status = 'error';
        }

        this.render();
    }

    async _onGenerateSpellcheck(event) {
        event.preventDefault();

        if (!this.translatedData || !this.extractedData) {
            ui.notifications.warn('Complete translation first');
            return;
        }

        const spellcheckPrompt = PromptGenerator.generateSpellCheckPrompt(
            this.translatedData,
            this.extractedData
        );

        try {
            await navigator.clipboard.writeText(spellcheckPrompt);
            ui.notifications.info('Spell-check prompt copied!');
        } catch (error) {
            ui.notifications.error('Copy failed');
        }
    }

    async _onApplyTranslation(event) {
        event.preventDefault();

        if (!this.translatedData) {
            ui.notifications.warn('Process AI response first');
            return;
        }

        // Confirm with user
        const confirmed = await Dialog.confirm({
            title: 'Apply Translation',
            content: `<p>This will modify ${this.translatedData.length} entities directly.</p>
                      <p>Original content will be backed up and can be restored.</p>
                      <p><strong>Continue?</strong></p>`
        });

        if (!confirmed) return;

        this.progress.status = 'applying';
        this.progress.total = this.translatedData.length;
        this.progress.current = 0;
        this.render();

        try {
            const entities = WorldEntityExtractor.getWorldEntities(this.entityType);

            const result = await EntityUpdater.batchUpdate(
                entities,
                this.translatedData,
                this.entityType,
                true // backup
            );

            ui.notifications.info(`Applied: ${result.success} success, ${result.failed} failed`);

            if (result.errors.length > 0) {
                console.warn('[World Translator] Errors:', result.errors);
            }

            this.progress.status = 'complete';
            this.selectedEntities.clear();
        } catch (error) {
            console.error('[World Translator] Apply failed:', error);
            ui.notifications.error('Apply failed: ' + error.message);
            this.progress.status = 'error';
        }

        this.render();
    }

    async _onRestoreBackup(event) {
        event.preventDefault();

        const entityId = event.currentTarget.dataset.id;
        const entities = WorldEntityExtractor.getWorldEntities(this.entityType);
        const entity = entities.find(e => e.id === entityId);

        if (!entity) {
            ui.notifications.error('Entity not found');
            return;
        }

        const confirmed = await Dialog.confirm({
            title: 'Restore Original',
            content: `<p>Restore "${entity.name}" to its original content?</p>`
        });

        if (!confirmed) return;

        try {
            await EntityUpdater.restoreFromBackup(entity, this.entityType);
            ui.notifications.info('Restored successfully');
            this.render();
        } catch (error) {
            ui.notifications.error('Restore failed: ' + error.message);
        }
    }
}
