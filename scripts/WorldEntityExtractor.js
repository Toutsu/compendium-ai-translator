/**
 * WorldEntityExtractor - Extract translatable content from world entities
 * Works with Actors, Items, JournalEntries, etc. that are already in the world
 */

export class WorldEntityExtractor {

    /**
     * Get all entities of a specific type from the world
     * @param {string} type - Entity type: 'journal', 'actor', 'item', 'scene'
     * @returns {Array} Array of world entities
     */
    static getWorldEntities(type) {
        switch (type.toLowerCase()) {
            case 'journal':
            case 'journalentry':
                return Array.from(game.journal);
            case 'actor':
                return Array.from(game.actors);
            case 'item':
                return Array.from(game.items);
            case 'scene':
                return Array.from(game.scenes);
            case 'rolltable':
                return Array.from(game.tables);
            case 'macro':
                return Array.from(game.macros);
            default:
                console.warn(`[WorldEntityExtractor] Unknown entity type: ${type}`);
                return [];
        }
    }

    /**
     * Extract translatable content from a single entity
     * @param {Document} entity - The Foundry document
     * @param {string} type - Entity type
     * @returns {Object} Extracted data for translation
     */
    static extractFromEntity(entity, type) {
        switch (type.toLowerCase()) {
            case 'journal':
            case 'journalentry':
                return this.extractJournalData(entity);
            case 'actor':
                return this.extractActorData(entity);
            case 'item':
                return this.extractItemData(entity);
            case 'scene':
                return this.extractSceneData(entity);
            case 'rolltable':
                return this.extractRollTableData(entity);
            default:
                return this.extractGenericData(entity);
        }
    }

    /**
     * Extract journal entry data including all pages
     */
    static extractJournalData(journal) {
        const pages = [];

        for (const page of journal.pages) {
            // Skip non-text pages (images, PDFs, etc.)
            if (page.type !== 'text') continue;

            const pageData = {
                id: page.id,
                name: page.name,
                content: page.text?.content || ''
            };

            // Only include if there's content to translate
            if (pageData.name || pageData.content) {
                pages.push(pageData);
            }
        }

        return {
            id: journal.id,
            uuid: journal.uuid,
            name: journal.name,
            type: 'journal',
            pages: pages,
            // Check if already translated
            isTranslated: !!journal.getFlag('compendium-ai-translator', 'translated')
        };
    }

    /**
     * Extract actor data (biography, notes)
     */
    static extractActorData(actor) {
        const data = {
            id: actor.id,
            uuid: actor.uuid,
            name: actor.name,
            type: 'actor',
            fields: {},
            isTranslated: !!actor.getFlag('compendium-ai-translator', 'translated')
        };

        // Biography (different paths for different systems)
        const biography = actor.system?.details?.biography?.value
            || actor.system?.details?.biography
            || actor.system?.biography?.value
            || '';
        if (biography) {
            data.fields.biography = biography;
        }

        // Public notes
        const publicNotes = actor.system?.details?.publicNotes || '';
        if (publicNotes) {
            data.fields.publicNotes = publicNotes;
        }

        // GM notes  
        const gmNotes = actor.system?.details?.gmNotes || '';
        if (gmNotes) {
            data.fields.gmNotes = gmNotes;
        }

        // Token name (if different from actor name)
        if (actor.prototypeToken?.name && actor.prototypeToken.name !== actor.name) {
            data.fields.tokenName = actor.prototypeToken.name;
        }

        return data;
    }

    /**
     * Extract item data (description, rules)
     */
    static extractItemData(item) {
        const data = {
            id: item.id,
            uuid: item.uuid,
            name: item.name,
            type: 'item',
            itemType: item.type,
            fields: {},
            isTranslated: !!item.getFlag('compendium-ai-translator', 'translated')
        };

        // Description
        const description = item.system?.description?.value || '';
        if (description) {
            data.fields.description = description;
        }

        // Source
        const source = item.system?.source?.value || item.system?.source || '';
        if (source && typeof source === 'string') {
            data.fields.source = source;
        }

        // PF2e specific: rule elements with text
        if (item.system?.rules) {
            const textRules = item.system.rules.filter(r => r.text);
            if (textRules.length > 0) {
                data.fields.ruleTexts = textRules.map((r, i) => ({
                    index: i,
                    text: r.text
                }));
            }
        }

        return data;
    }

    /**
     * Extract scene data
     */
    static extractSceneData(scene) {
        return {
            id: scene.id,
            uuid: scene.uuid,
            name: scene.name,
            type: 'scene',
            fields: {
                notes: scene.journal ? 'Linked to journal' : ''
            },
            isTranslated: !!scene.getFlag('compendium-ai-translator', 'translated')
        };
    }

    /**
     * Extract roll table data
     */
    static extractRollTableData(table) {
        const results = table.results.map(r => ({
            id: r.id,
            text: r.text
        })).filter(r => r.text);

        return {
            id: table.id,
            uuid: table.uuid,
            name: table.name,
            type: 'rolltable',
            fields: {
                description: table.description || ''
            },
            results: results,
            isTranslated: !!table.getFlag('compendium-ai-translator', 'translated')
        };
    }

    /**
     * Generic extraction for unknown types
     */
    static extractGenericData(entity) {
        return {
            id: entity.id,
            uuid: entity.uuid,
            name: entity.name,
            type: entity.documentName?.toLowerCase() || 'unknown',
            fields: {},
            isTranslated: !!entity.getFlag('compendium-ai-translator', 'translated')
        };
    }

    /**
     * Batch extract multiple entities
     * @param {Array} entities - Array of entities
     * @param {string} type - Entity type
     * @param {boolean} skipTranslated - Skip already translated entities
     * @returns {Array} Extracted data for all entities
     */
    static batchExtract(entities, type, skipTranslated = true) {
        const extracted = [];

        for (const entity of entities) {
            const data = this.extractFromEntity(entity, type);

            // Skip if already translated
            if (skipTranslated && data.isTranslated) {
                continue;
            }

            // Skip if no translatable content
            if (!this.hasTranslatableContent(data)) {
                continue;
            }

            extracted.push(data);
        }

        return extracted;
    }

    /**
     * Check if extracted data has any translatable content
     */
    static hasTranslatableContent(data) {
        // Check name
        if (data.name) return true;

        // Check pages (journals)
        if (data.pages && data.pages.length > 0) return true;

        // Check fields
        if (data.fields) {
            for (const value of Object.values(data.fields)) {
                if (value && typeof value === 'string' && value.trim()) return true;
            }
        }

        // Check results (roll tables)
        if (data.results && data.results.length > 0) return true;

        return false;
    }

    /**
     * Get statistics about world entities
     */
    static getWorldStats(type) {
        const entities = this.getWorldEntities(type);
        let translatable = 0;
        let translated = 0;
        let totalContent = 0;

        for (const entity of entities) {
            const data = this.extractFromEntity(entity, type);

            if (this.hasTranslatableContent(data)) {
                translatable++;

                if (data.isTranslated) {
                    translated++;
                }

                // Estimate content size
                totalContent += JSON.stringify(data).length;
            }
        }

        return {
            total: entities.length,
            translatable,
            translated,
            remaining: translatable - translated,
            estimatedCharacters: totalContent
        };
    }
}
