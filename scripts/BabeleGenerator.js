/**
 * BabeleGenerator - Generates Babele-compatible translation JSON files
 */
export class BabeleGenerator {
    /**
     * Generate Babele translation object from translated entities
     * @param {Array} translatedEntities - Array of translated entity data
     * @param {Object} compendiumMetadata - Metadata about the source compendium
     * @returns {Object} Babele-compatible translation object
     */
    static generate(translatedEntities, compendiumMetadata) {
        const babeleData = {
            label: this.translateCompendiumLabel(compendiumMetadata.label),
            mapping: {},
            entries: {}
        };

        for (const entity of translatedEntities) {
            const entryData = this.generateEntry(entity);
            if (entryData && Object.keys(entryData).length > 0) {
                babeleData.entries[entity.id] = entryData;
            }
        }

        return babeleData;
    }

    /**
     * Generate a single entry for Babele
     */
    static generateEntry(entity) {
        const entry = {};
        const fields = entity.translatableFields;

        // Map translated fields to Babele format
        for (const [path, value] of Object.entries(fields)) {
            // Handle nested paths (e.g., "system.description.value")
            if (path.includes('.')) {
                this.setNestedProperty(entry, path, value);
            } else {
                entry[path] = value;
            }
        }

        // Handle special nested documents (journal pages, table results, etc.)
        if (entity.type === 'JournalEntry' && fields.pages) {
            entry.pages = fields.pages.map(page => ({
                _id: page._id,
                ...page.fields
            }));
        }

        if (entity.type === 'RollTable' && fields.results) {
            entry.results = fields.results.map(result => ({
                _id: result._id,
                ...result.fields
            }));
        }

        return entry;
    }

    /**
     * Set a nested property in an object using dot notation
     */
    static setNestedProperty(obj, path, value) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }

        current[parts[parts.length - 1]] = value;
    }

    /**
     * Translate the compendium label itself
     */
    static translateCompendiumLabel(label) {
        // This could be enhanced to actually translate the label
        // For now, just append a marker
        return label;
    }

    /**
     * Export translation to JSON file
     * @param {Object} babeleData - The Babele translation data
     * @param {string} filename - Output filename
     */
    static async exportToFile(babeleData, filename) {
        const json = JSON.stringify(babeleData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ui.notifications.info(`Translation exported to ${filename}`);
    }

    /**
     * Register translation with Babele
     * @param {Object} babeleData - The Babele translation data
     * @param {string} compendiumId - The compendium pack ID
     * @param {string} language - Target language code
     */
    static async registerWithBabele(babeleData, compendiumId, language = 'ru') {
        // Check if Babele is available
        if (typeof Babele === 'undefined') {
            ui.notifications.error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.BabeleNotFound'));
            console.error('[Compendium Translator] Babele module not found');
            return false;
        }

        try {
            const config = {
                module: 'compendium-ai-translator',
                lang: language,
                dir: compendiumId,
                ...babeleData
            };

            // Register with Babele
            await Babele.get().register(config);

            console.log(`[Compendium Translator] Registered translation for ${compendiumId}`);
            ui.notifications.info(`Translation registered with Babele for ${compendiumId}`);
            return true;
        } catch (error) {
            console.error('[Compendium Translator] Failed to register with Babele:', error);
            ui.notifications.error(`Failed to register translation: ${error.message}`);
            return false;
        }
    }

    /**
     * Save translation data to module directory
     * This allows translations to persist and be distributed
     * @param {Object} babeleData - The Babele translation data
     * @param {string} compendiumId - The compendium pack ID
     * @param {string} language - Target language code
     */
    static async saveTranslation(babeleData, compendiumId, language = 'ru') {
        // In a browser environment, we can't directly save to the server filesystem
        // Instead, we'll provide download functionality
        const filename = `${compendiumId.replace('.', '_')}_${language}.json`;
        await this.exportToFile(babeleData, filename);

        ui.notifications.info(
            'Translation file downloaded. Place it in modules/compendium-ai-translator/translations/ ' +
            'to make it permanent.'
        );
    }

    /**
     * Generate mapping configuration for Babele
     * This helps Babele understand which fields to translate
     */
    static generateMapping(documentType) {
        const mappings = {
            JournalEntry: {
                name: 'name',
                pages: {
                    path: 'pages',
                    converter: 'pages'
                }
            },
            Actor: {
                name: 'name',
                biography: 'system.details.biography.value'
            },
            Item: {
                name: 'name',
                description: 'system.description.value'
            },
            RollTable: {
                name: 'name',
                description: 'description',
                results: {
                    path: 'results',
                    converter: 'tableResults'
                }
            }
        };

        return mappings[documentType] || {};
    }
}
