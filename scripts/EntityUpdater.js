/**
 * EntityUpdater - Apply translations back to world entities
 * Handles direct modification of documents with backup support
 */

export class EntityUpdater {

    static MODULE_ID = 'compendium-ai-translator';

    /**
     * Update a journal entry with translations
     * @param {JournalEntry} journal - The journal to update
     * @param {Object} translation - Translation data with pages
     * @param {boolean} backup - Whether to backup original content
     */
    static async updateJournal(journal, translation, backup = true) {
        // Backup original content
        if (backup) {
            await this.backupEntity(journal, 'journal');
        }

        // Update journal name if provided
        const updates = {};
        if (translation.name && translation.name !== journal.name) {
            updates.name = translation.name;
        }

        // Update journal itself
        if (Object.keys(updates).length > 0) {
            await journal.update(updates);
        }

        // Update pages
        if (translation.pages && translation.pages.length > 0) {
            for (const pageTranslation of translation.pages) {
                const page = journal.pages.get(pageTranslation.id);
                if (!page) continue;

                const pageUpdates = {};

                if (pageTranslation.name) {
                    pageUpdates.name = pageTranslation.name;
                }

                if (pageTranslation.content) {
                    pageUpdates['text.content'] = pageTranslation.content;
                }

                if (Object.keys(pageUpdates).length > 0) {
                    await page.update(pageUpdates);
                }
            }
        }

        // Mark as translated
        await this.markTranslated(journal);

        return true;
    }

    /**
     * Update an actor with translations
     */
    static async updateActor(actor, translation, backup = true) {
        if (backup) {
            await this.backupEntity(actor, 'actor');
        }

        const updates = {};

        // Update name
        if (translation.name && translation.name !== actor.name) {
            updates.name = translation.name;
        }

        // Update fields
        if (translation.fields) {
            if (translation.fields.biography) {
                // Handle different system paths
                if (actor.system?.details?.biography?.value !== undefined) {
                    updates['system.details.biography.value'] = translation.fields.biography;
                } else if (actor.system?.details?.biography !== undefined) {
                    updates['system.details.biography'] = translation.fields.biography;
                } else if (actor.system?.biography?.value !== undefined) {
                    updates['system.biography.value'] = translation.fields.biography;
                }
            }

            if (translation.fields.publicNotes) {
                updates['system.details.publicNotes'] = translation.fields.publicNotes;
            }

            if (translation.fields.gmNotes) {
                updates['system.details.gmNotes'] = translation.fields.gmNotes;
            }

            if (translation.fields.tokenName) {
                updates['prototypeToken.name'] = translation.fields.tokenName;
            }
        }

        if (Object.keys(updates).length > 0) {
            await actor.update(updates);
        }

        await this.markTranslated(actor);
        return true;
    }

    /**
     * Update an item with translations
     */
    static async updateItem(item, translation, backup = true) {
        if (backup) {
            await this.backupEntity(item, 'item');
        }

        const updates = {};

        // Update name
        if (translation.name && translation.name !== item.name) {
            updates.name = translation.name;
        }

        // Update fields
        if (translation.fields) {
            if (translation.fields.description) {
                updates['system.description.value'] = translation.fields.description;
            }

            if (translation.fields.source) {
                if (typeof item.system?.source === 'object') {
                    updates['system.source.value'] = translation.fields.source;
                } else {
                    updates['system.source'] = translation.fields.source;
                }
            }

            // Handle rule texts (PF2e)
            if (translation.fields.ruleTexts && item.system?.rules) {
                const rules = foundry.utils.deepClone(item.system.rules);
                for (const rt of translation.fields.ruleTexts) {
                    if (rules[rt.index]) {
                        rules[rt.index].text = rt.text;
                    }
                }
                updates['system.rules'] = rules;
            }
        }

        if (Object.keys(updates).length > 0) {
            await item.update(updates);
        }

        await this.markTranslated(item);
        return true;
    }

    /**
     * Update a roll table with translations
     */
    static async updateRollTable(table, translation, backup = true) {
        if (backup) {
            await this.backupEntity(table, 'rolltable');
        }

        const updates = {};

        if (translation.name && translation.name !== table.name) {
            updates.name = translation.name;
        }

        if (translation.fields?.description) {
            updates.description = translation.fields.description;
        }

        if (Object.keys(updates).length > 0) {
            await table.update(updates);
        }

        // Update results
        if (translation.results) {
            for (const resultTranslation of translation.results) {
                const result = table.results.get(resultTranslation.id);
                if (result && resultTranslation.text) {
                    await result.update({ text: resultTranslation.text });
                }
            }
        }

        await this.markTranslated(table);
        return true;
    }

    /**
     * Backup original content to flags
     */
    static async backupEntity(entity, type) {
        const existingBackup = entity.getFlag(this.MODULE_ID, 'originalContent');
        if (existingBackup) {
            // Don't overwrite existing backup
            return;
        }

        let backup = {
            name: entity.name,
            backedUpAt: new Date().toISOString()
        };

        switch (type) {
            case 'journal':
                backup.pages = entity.pages.map(p => ({
                    id: p.id,
                    name: p.name,
                    content: p.text?.content || ''
                }));
                break;
            case 'actor':
                backup.biography = entity.system?.details?.biography?.value
                    || entity.system?.details?.biography || '';
                backup.publicNotes = entity.system?.details?.publicNotes || '';
                backup.gmNotes = entity.system?.details?.gmNotes || '';
                break;
            case 'item':
                backup.description = entity.system?.description?.value || '';
                backup.source = entity.system?.source?.value || entity.system?.source || '';
                break;
            case 'rolltable':
                backup.description = entity.description || '';
                backup.results = entity.results.map(r => ({
                    id: r.id,
                    text: r.text
                }));
                break;
        }

        await entity.setFlag(this.MODULE_ID, 'originalContent', backup);
    }

    /**
     * Mark entity as translated
     */
    static async markTranslated(entity) {
        await entity.setFlag(this.MODULE_ID, 'translated', {
            date: new Date().toISOString(),
            language: game.settings.get('compendium-ai-translator', 'targetLanguage') || 'ru'
        });
    }

    /**
     * Restore entity from backup
     */
    static async restoreFromBackup(entity, type) {
        const backup = entity.getFlag(this.MODULE_ID, 'originalContent');
        if (!backup) {
            throw new Error('No backup found for this entity');
        }

        switch (type) {
            case 'journal':
                await entity.update({ name: backup.name });
                for (const pageBackup of backup.pages || []) {
                    const page = entity.pages.get(pageBackup.id);
                    if (page) {
                        await page.update({
                            name: pageBackup.name,
                            'text.content': pageBackup.content
                        });
                    }
                }
                break;
            case 'actor':
                const actorUpdates = { name: backup.name };
                if (backup.biography) {
                    actorUpdates['system.details.biography.value'] = backup.biography;
                }
                if (backup.publicNotes) {
                    actorUpdates['system.details.publicNotes'] = backup.publicNotes;
                }
                await entity.update(actorUpdates);
                break;
            case 'item':
                await entity.update({
                    name: backup.name,
                    'system.description.value': backup.description || ''
                });
                break;
            case 'rolltable':
                await entity.update({
                    name: backup.name,
                    description: backup.description || ''
                });
                for (const resultBackup of backup.results || []) {
                    const result = entity.results.get(resultBackup.id);
                    if (result) {
                        await result.update({ text: resultBackup.text });
                    }
                }
                break;
        }

        // Remove translation flag
        await entity.unsetFlag(this.MODULE_ID, 'translated');
    }

    /**
     * Batch update multiple entities
     */
    static async batchUpdate(entities, translations, type, backup = true) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const translation of translations) {
            const entity = entities.find(e => e.id === translation.id);
            if (!entity) {
                results.failed++;
                results.errors.push(`Entity not found: ${translation.id}`);
                continue;
            }

            try {
                switch (type) {
                    case 'journal':
                        await this.updateJournal(entity, translation, backup);
                        break;
                    case 'actor':
                        await this.updateActor(entity, translation, backup);
                        break;
                    case 'item':
                        await this.updateItem(entity, translation, backup);
                        break;
                    case 'rolltable':
                        await this.updateRollTable(entity, translation, backup);
                        break;
                }
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`${entity.name}: ${error.message}`);
            }
        }

        return results;
    }
}
