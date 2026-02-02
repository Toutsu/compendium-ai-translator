import { FieldMapper } from './FieldMapper.js';

/**
 * EntityExtractor - Extracts entities from compendiums and identifies translatable content
 */
export class EntityExtractor {
    /**
     * Extract all entities from a compendium
     * @param {CompendiumCollection} compendium - The compendium to extract from
     * @param {string} entityTypeFilter - Optional filter for specific entity type
     * @returns {Promise<Array>} Array of extracted entity data
     */
    static async extractFromCompendium(compendium, entityTypeFilter = null) {
        console.log(`[Compendium Translator] Extracting from ${compendium.metadata.label}`);

        const entities = [];
        const index = await compendium.getIndex();

        for (const indexEntry of index) {
            // Skip if filtering by type and doesn't match
            if (entityTypeFilter && indexEntry.type !== entityTypeFilter) {
                continue;
            }

            const doc = await compendium.getDocument(indexEntry._id);
            if (!doc) continue;

            const entityData = this.extractEntity(doc);
            if (entityData) {
                entities.push(entityData);
            }
        }

        console.log(`[Compendium Translator] Extracted ${entities.length} entities`);
        return entities;
    }

    /**
     * Extract translatable data from a single entity
     * @param {Document} doc - The document to extract from
     * @returns {Object} Extracted entity data
     */
    static extractEntity(doc) {
        const documentType = doc.documentName;
        const extracted = FieldMapper.extractTranslatableFields(doc.toObject(), documentType);

        // Only include if there's something to translate
        if (Object.keys(extracted).length === 0) {
            return null;
        }

        return {
            id: doc.id,
            name: doc.name,
            type: documentType,
            originalData: doc.toObject(),
            translatableFields: extracted,
            metadata: {
                compendium: doc.pack,
                folder: doc.folder?.id,
                sort: doc.sort
            }
        };
    }

    /**
     * Count translatable characters in an entity
     * @param {Object} entityData - The extracted entity data
     * @returns {number} Character count
     */
    static countCharacters(entityData) {
        let count = 0;

        function countInObject(obj) {
            for (const value of Object.values(obj)) {
                if (typeof value === 'string') {
                    count += value.length;
                } else if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (typeof item === 'object') {
                            countInObject(item);
                        }
                    });
                } else if (typeof value === 'object' && value !== null) {
                    countInObject(value);
                }
            }
        }

        countInObject(entityData.translatableFields);
        return count;
    }

    /**
     * Get statistics about a compendium
     * @param {CompendiumCollection} compendium - The compendium to analyze
     * @returns {Promise<Object>} Statistics object
     */
    static async getCompendiumStats(compendium) {
        const index = await compendium.getIndex();
        const stats = {
            totalEntities: index.size,
            byType: {},
            estimatedCharacters: 0
        };

        // Sample a few entries to estimate character count
        const sampleSize = Math.min(5, index.size);
        let totalSampleChars = 0;

        for (let i = 0; i < sampleSize; i++) {
            const entry = index.contents[i];
            const doc = await compendium.getDocument(entry._id);
            const entityData = this.extractEntity(doc);
            if (entityData) {
                totalSampleChars += this.countCharacters(entityData);
                stats.byType[doc.documentName] = (stats.byType[doc.documentName] || 0) + 1;
            }
        }

        // Estimate total characters based on sample
        stats.estimatedCharacters = Math.round((totalSampleChars / sampleSize) * index.size);

        return stats;
    }

    /**
     * Batch entities for translation
     * @param {Array} entities - Array of entity data
     * @param {number} maxCharsPerBatch - Maximum characters per batch
     * @returns {Array<Array>} Array of batches
     */
    static batchEntities(entities, maxCharsPerBatch = 50000) {
        const batches = [];
        let currentBatch = [];
        let currentCharCount = 0;

        for (const entity of entities) {
            const charCount = this.countCharacters(entity);

            // If this entity alone exceeds limit, put it in its own batch
            if (charCount > maxCharsPerBatch) {
                if (currentBatch.length > 0) {
                    batches.push(currentBatch);
                    currentBatch = [];
                    currentCharCount = 0;
                }
                batches.push([entity]);
                continue;
            }

            // If adding this entity would exceed limit, start new batch
            if (currentCharCount + charCount > maxCharsPerBatch && currentBatch.length > 0) {
                batches.push(currentBatch);
                currentBatch = [];
                currentCharCount = 0;
            }

            currentBatch.push(entity);
            currentCharCount += charCount;
        }

        // Add final batch if not empty
        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        return batches;
    }
}
