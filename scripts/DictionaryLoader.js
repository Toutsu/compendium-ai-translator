/**
 * DictionaryLoader - Loads official translations from pf2e-ru module
 * Adapted from pf2e-ru-ai-translator
 */
export class DictionaryLoader {
    static _cache = null;

    /**
     * Loads official translations from the pf2e-ru module.
     * @returns {Promise<Object>} A map of English terms to Russian translations.
     */
    static async loadOfficialTranslations() {
        if (this._cache) return this._cache;

        const dictionary = {};
        const packDir = "modules/pf2e-ru/data/community/pf2e/packs";
        const systemFile = "modules/pf2e-ru/data/community/pf2e/pf2e.json";

        try {
            console.log("[Compendium Translator] Loading official translations from pf2e-ru...");

            // 1. Load System Translations (pf2e.json AND en.json)
            try {
                const sysResponseRu = await fetch(systemFile);
                const sysJsonRu = await sysResponseRu.json();

                // Fetch English system file from standard path
                const sysResponseEn = await fetch("systems/pf2e/lang/en.json");
                const sysJsonEn = await sysResponseEn.json();

                if (sysJsonRu && sysJsonEn) {
                    // Helper to recursively traverse and map
                    const traverse = (objEn, objRu) => {
                        for (const key in objEn) {
                            if (objRu.hasOwnProperty(key)) {
                                const valEn = objEn[key];
                                const valRu = objRu[key];

                                if (typeof valEn === 'object' && valEn !== null && typeof valRu === 'object' && valRu !== null) {
                                    traverse(valEn, valRu);
                                } else if (typeof valEn === 'string' && typeof valRu === 'string') {
                                    // Filter out long sentences, IDs, or identical values
                                    if (valEn.length > 2 && valEn.length < 50 && valEn !== valRu) {
                                        // Avoid replacing variables like {0} or HTML in keys
                                        if (!valEn.includes("{") && !valEn.includes("<")) {
                                            // Strip HTML from the translation value (valRu)
                                            const cleanValRu = valRu.replace(/<[^>]*>/g, "");
                                            if (cleanValRu) {
                                                dictionary[valEn] = cleanValRu;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    };

                    traverse(sysJsonEn, sysJsonRu);
                    console.log(`[Compendium Translator] Loaded ${Object.keys(dictionary).length} system terms from en/ru comparison.`);
                }

                // Explicitly add common terms if missed
                if (!dictionary["Perception"]) dictionary["Perception"] = "Восприятие";

            } catch (err) {
                console.warn("[Compendium Translator] Failed to load system translations (en.json/pf2e.json comparison):", err);

                // Fallback: Load at least pf2e.json for known keys if en.json fails
                try {
                    const sysResponse = await fetch(systemFile);
                    const sysJson = await sysResponse.json();
                    if (sysJson && sysJson.PF2E) {
                        const pf2e = sysJson.PF2E;
                        const add = (key, value) => { if (key && value && typeof value === 'string') dictionary[key] = value; };

                        if (pf2e.Skill) Object.entries(pf2e.Skill).forEach(([k, v]) => add(k, v));
                        const abilityMap = { "Strength": pf2e.AbilityStr, "Dexterity": pf2e.AbilityDex, "Constitution": pf2e.AbilityCon, "Intelligence": pf2e.AbilityInt, "Wisdom": pf2e.AbilityWis, "Charisma": pf2e.AbilityCha };
                        Object.entries(abilityMap).forEach(([k, v]) => add(k, v));
                        add("Perception", "Восприятие");
                    }
                } catch (e) { console.error("[Compendium Translator] Fallback loading failed", e); }
            }

            // 2. Load Compendium Translations
            const FilePickerClass = foundry.applications?.apps?.FilePicker || FilePicker;
            const browseResult = await FilePickerClass.browse("user", packDir);
            const files = browseResult.files.filter(f => f.endsWith(".json"));

            const allowedPatterns = [
                /.*-bestiary\.json$/,
                /^pf2e\.equipment-srd\.json$/,
                /^pf2e\.spells-srd\.json$/,
                /^pf2e\.hazards\.json$/,
                /^pf2e\.vehicles\.json$/,
                /^pf2e\.deities\.json$/,
                /^pf2e\.ancestries\.json$/,
                /^pf2e\.backgrounds\.json$/,
                /^pf2e\.heritages\.json$/,
                /^pf2e\.classes\.json$/,
                /^pf2e\.kingmaker-features\.json$/,
                /^pf2e\.adventure-specific-actions\.json$/,
                /^pf2e\.actionspf2e\.json$/,
                /^pf2e\.classfeatures\.json$/,
                /^pf2e\.journals\.json$/,
                /^pf2e\.conditionitems\.json$/,
                /^pf2e\.feats-srd\.json$/,
                /^pf2e\.npc-gallery\.json$/
            ];

            const blockedTerms = new Set([
                "I", "A", "An", "The", "In", "On", "At", "To", "For", "Of", "With", "By",
                "Stand", "Cause", "Classes", "Turn", "Round", "Level", "Die", "Hit", "Miss",
                "Name", "Description", "Source", "Type", "Traits", "Rarity", "Price", "Usage", "Bulk",
                "Stride", "Strike", "Step", "Interact", "Drop", "Leap", "Escape", "Seek",
                // Generic terms that are also Conditions/Attitudes but shouldn't be auto-replaced
                "Hidden", "Observed", "Concealed", "Friendly", "Helpful", "Hostile", "Indifferent", "Unfriendly",
                // Common UI/Text terms that cause confusion
                "Items", "Item", "Treasure", "Consumable", "Permanent", "Chapter", "Hero", "Heroes", "Student", "Students", "Inventory", "Details"
            ]);

            for (const file of files) {
                const fileName = file.split("/").pop();
                if (!allowedPatterns.some(pattern => pattern.test(fileName))) {
                    continue;
                }

                try {
                    const response = await fetch(file);
                    const json = await response.json();

                    if (json.entries) {
                        for (const [key, value] of Object.entries(json.entries)) {
                            if (value.name && key !== value.name) {
                                if (blockedTerms.has(key)) continue;
                                if (key.length <= 2) continue;
                                // Strip HTML from value
                                const cleanValue = value.name.replace(/<[^>]*>/g, "");
                                if (cleanValue) {
                                    dictionary[key] = cleanValue;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`[Compendium Translator] Failed to load ${file}:`, err);
                }
            }
            console.log(`[Compendium Translator] Loaded ${Object.keys(dictionary).length} official translations.`);
        } catch (err) {
            console.error("[Compendium Translator] Error loading official translations:", err);
            return {};
        }

        this._cache = dictionary;
        return dictionary;
    }

    /**
     * Check if pf2e-ru module is available
     * @returns {boolean}
     */
    static isPF2eRuAvailable() {
        return game.modules.get('pf2e-ru')?.active ?? false;
    }

    /**
     * Clear cached dictionary (for testing/refresh)
     */
    static clearCache() {
        this._cache = null;
    }

    /**
     * Get statistics about loaded dictionary
     * @returns {Object}
     */
    static getStats() {
        if (!this._cache) return { loaded: false, count: 0 };
        return {
            loaded: true,
            count: Object.keys(this._cache).length,
            sample: Object.entries(this._cache).slice(0, 5)
        };
    }
}
