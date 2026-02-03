/**
 * FieldMapper - Defines which fields are translatable for each entity type
 * This prevents translating system mechanics, formulas, IDs, etc.
 */
export class FieldMapper {
    /**
     * Get translatable fields for a given document type
     * @param {string} documentType - The document type (Actor, Item, JournalEntry, etc.)
     * @param {string} systemId - The game system ID (e.g., 'pf2e', 'dnd5e')
     * @returns {Object} Field mapping configuration
     */
    static getFieldMap(documentType, systemId = game.system.id) {
        const baseMap = this.getBaseFieldMap(documentType);
        const systemMap = this.getSystemSpecificMap(documentType, systemId);

        return foundry.utils.mergeObject(baseMap, systemMap);
    }

    /**
     * Base field maps that work for all systems
     */
    static getBaseFieldMap(documentType) {
        const maps = {
            Actor: {
                translatable: ['name', 'system.details.biography.value', 'system.details.biography.public'],
                exclude: ['_id', 'img', 'prototypeToken', 'items', 'effects'],
                nested: {
                    'items': { // If translating embedded items
                        translatable: ['name', 'system.description.value'],
                        exclude: ['_id', 'img', 'system.price', 'system.quantity']
                    }
                }
            },
            Item: {
                translatable: [
                    'name',
                    'system.description.value',
                    'system.description.gm',
                    'system.description.chat',
                    'system.source.value'
                ],
                exclude: ['_id', 'img', 'system.price', 'system.quantity', 'system.formula', 'system.damage']
            },
            JournalEntry: {
                translatable: ['name'],
                exclude: ['_id', 'folder'],
                nested: {
                    'pages': {
                        translatable: ['name', 'text.content'],
                        exclude: ['_id', 'type', 'system']
                    }
                }
            },
            Scene: {
                translatable: ['name', 'description'],
                exclude: ['_id', 'thumb', 'background', 'foreground', 'tokens', 'drawings']
            },
            RollTable: {
                translatable: ['name', 'description'],
                exclude: ['_id', 'formula'],
                nested: {
                    'results': {
                        translatable: ['text'],
                        exclude: ['_id', 'range', 'weight']
                    }
                }
            },
            Macro: {
                translatable: ['name'], // Don't translate commands - they're code!
                exclude: ['_id', 'command', 'type']
            },
            Playlist: {
                translatable: ['name', 'description'],
                exclude: ['_id', 'mode', 'sounds']
            },
            Cards: {
                translatable: ['name', 'description'],
                exclude: ['_id', 'type'],
                nested: {
                    'cards': {
                        translatable: ['name', 'description'],
                        exclude: ['_id', 'face', 'back']
                    }
                }
            }
        };

        return maps[documentType] || { translatable: ['name'], exclude: ['_id'] };
    }

    /**
     * System-specific field mappings
     */
    static getSystemSpecificMap(documentType, systemId) {
        const systemMaps = {
            pf2e: {
                Actor: {
                    translatable: [
                        'name',
                        'system.details.biography.value',
                        'system.details.publicNotes',
                        'system.details.privateNotes'
                    ]
                },
                Item: {
                    translatable: [
                        'name',
                        'system.description.value',
                        'system.description.gm',
                        'system.source.value',
                        'system.rules[].label' // Rule element labels
                    ]
                }
            },
            dnd5e: {
                Actor: {
                    translatable: [
                        'name',
                        'system.details.biography.value',
                        'system.details.biography.public'
                    ]
                },
                Item: {
                    translatable: [
                        'name',
                        'system.description.value',
                        'system.description.chat',
                        'system.source'
                    ]
                }
            }
        };

        return systemMaps[systemId]?.[documentType] || {};
    }

    /**
     * Extract translatable content from a document
     * @param {Object} doc - The document data
     * @param {string} documentType - The document type
     * @returns {Object} Object with translatable fields
     */
    static extractTranslatableFields(doc, documentType) {
        const fieldMap = this.getFieldMap(documentType);
        const extracted = {};

        for (const path of fieldMap.translatable) {
            const value = foundry.utils.getProperty(doc, path);
            if (value && typeof value === 'string' && value.trim()) {
                extracted[path] = value;
            }
        }

        // Handle nested documents (like journal pages, table results, etc.)
        if (fieldMap.nested) {
            for (const [nestedPath, nestedConfig] of Object.entries(fieldMap.nested)) {
                const nestedDocs = foundry.utils.getProperty(doc, nestedPath);

                // Debug logging
                if (nestedPath === 'pages' && Array.isArray(nestedDocs) && nestedDocs.length > 0) {
                    console.log(`[FieldMapper] Found ${nestedDocs.length} pages. First page keys:`, Object.keys(nestedDocs[0]));
                }

                if (Array.isArray(nestedDocs)) {
                    extracted[nestedPath] = nestedDocs.map(nestedDoc => {
                        const nestedExtracted = {};
                        for (const nestedField of nestedConfig.translatable) {
                            const value = foundry.utils.getProperty(nestedDoc, nestedField);

                            // Debug logging for specific fields
                            if (nestedField === 'text.content') {
                                // console.log(`[FieldMapper] Checking text.content:`, value ? (value.substring(0, 20) + '...') : 'undefined');
                            }

                            if (value && typeof value === 'string' && value.trim()) {
                                nestedExtracted[nestedField] = value;
                            }
                        }
                        return {
                            _id: nestedDoc._id,
                            fields: nestedExtracted
                        };
                    });

                    // Filter out empty nested items
                    // extracted[nestedPath] = extracted[nestedPath].filter(item => Object.keys(item.fields).length > 0);
                    // ^ Wait, current logic doesn't filter them out here, but maybe it should?
                    // Actually, let's look at why extracted is empty.
                    // If map returns array of objects with empty fields, that's still an array.
                }
            }
        }

        return extracted;
    }

    /**
     * Check if a field should be translated
     * @param {string} path - The field path
     * @param {string} documentType - The document type
     * @returns {boolean}
     */
    static isTranslatable(path, documentType) {
        const fieldMap = this.getFieldMap(documentType);
        return fieldMap.translatable.includes(path);
    }
}
