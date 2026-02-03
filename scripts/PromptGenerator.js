/**
 * PromptGenerator - Generates optimized prompts for copy-paste workflow
 */
export class PromptGenerator {

    /**
     * Generate a translation prompt for manual copy-paste to AI
     * @param {Array} entities - Array of entities to translate
     * @param {Object} dictionary - Pre-translated terms dictionary
     * @param {Object} options - Configuration options
     * @returns {string} The formatted prompt
     */
    static generateTranslationPrompt(entities, dictionary = {}, options = {}) {
        const {
            sourceLanguage = 'en',
            targetLanguage = 'ru',
            gameSystem = game.system.id,
            entityType = 'mixed',
            includeContext = true
        } = options;

        const dictionaryTerms = Object.entries(dictionary).slice(0, 100); // Show first 100 terms as examples
        const termCount = Object.keys(dictionary).length;

        let prompt = `# Pathfinder 2e Translation Task

**Task**: Translate the following Pathfinder 2e ${entityType} entities from English to Russian.

**Important Rules**:
1. **Preserve all HTML tags** - Do not translate or modify any HTML tags like <p>, <strong>, etc.
2. **Preserve Foundry VTT links** - Do not modify @UUID[...], @Compendium[...], @Actor[...] links
3. **Preserve inline rolls** - Do not modify [[...]] roll formulas
4. **Preserve game mechanics** - Do not translate:
   - Dice formulas (1d6, 2d8+3, etc.)
   - Keywords in formulas (damage, healing, etc.)
   - System IDs and technical values
5. **Use consistent terminology** - ${termCount} terms have been pre-translated, use these EXACT translations:

`;

        // Show sample dictionary terms
        if (dictionaryTerms.length > 0) {
            prompt += `### Pre-Translated Terms (use these exactly):\n`;
            dictionaryTerms.slice(0, 20).forEach(([en, ru]) => {
                prompt += `- "${en}" → "${ru}"\n`;
            });
            if (termCount > 20) {
                prompt += `... and ${termCount - 20} more terms already translated\n`;
            }
            prompt += `\n`;
        }

        prompt += `**Translation Guidelines**:
- Translate natural language text (descriptions, flavor text, lore)
- Keep game mechanics, stat blocks, and formulas in English
- Maintain the same JSON structure
- Preserve all field names (don't translate keys)
- Only translate the VALUES of string fields

---

## Entities to Translate:

\`\`\`json
${JSON.stringify(entities, null, 2)}
\`\`\`

---

## Expected Output Format:

Return ONLY a valid JSON array with translated entities. Each entity should have:
- \`id\`: Original entity ID (unchanged)
- \`name\`: Translated name
- \`translatedFields\`: Object with translated field paths and values

Example:
\`\`\`json
[
  {
    "id": "entity-id-here",
    "name": "Переведённое Название",
    "translatedFields": {
      "system.description.value": "Переведённое описание здесь...",
      "system.rules.text": "Правило на русском..."
    }
  }
]
\`\`\`

**Start your response with the opening bracket [ and end with ]**
`;

        return prompt;
    }

    /**
     * Generate a spell-check prompt for reviewing translations
     * @param {Array} translatedEntities - Entities with translations
     * @param {Array} originalEntities - Original English entities
     * @returns {string} The spell-check prompt
     */
    static generateSpellCheckPrompt(translatedEntities, originalEntities) {
        let prompt = `# Russian Translation Quality Check

**Task**: Review the following Russian translations for errors.

**Check for**:
1. **Grammar and spelling errors** - Correct any Russian language mistakes
2. **Terminology consistency** - Ensure game terms are translated consistently
3. **HTML preservation** - Verify all HTML tags are intact
4. **Link preservation** - Verify @UUID[], @Compendium[], etc. are unchanged
5. **Formula preservation** - Verify [[...]] rolls and dice formulas untouched
6. **Translation completeness** - Ensure no English text remains (except mechanics)

---

## Translations to Review:

`;

        for (let i = 0; i < Math.min(translatedEntities.length, originalEntities.length); i++) {
            const translated = translatedEntities[i];
            const original = originalEntities[i];

            prompt += `### Entity ${i + 1}: ${translated.name || original.name}\n\n`;
            prompt += `**Original (EN)**:\n\`\`\`\n${JSON.stringify(original.translatableFields, null, 2)}\n\`\`\`\n\n`;
            prompt += `**Translation (RU)**:\n\`\`\`\n${JSON.stringify(translated.translatedFields, null, 2)}\n\`\`\`\n\n`;
            prompt += `---\n\n`;
        }

        prompt += `## Instructions:

Please provide:
1. **Corrections** - List any errors found with corrections
2. **Improvements** - Suggest better translations if needed
3. **Confirmation** - If no errors, confirm "No errors found"

Format your response as:

\`\`\`
Entity 1:
- Field: system.description.value
  Error: [describe error]
  Correction: [corrected text]

Entity 2:
- No errors found

...
\`\`\`
`;

        return prompt;
    }

    /**
     * Generate a terminology extraction prompt
     * @param {string} text - Text to extract terms from
     * @returns {string} Prompt for extracting terminology
     */
    static generateTermExtractionPrompt(text) {
        return `# Pathfinder 2e Terminology Extraction

Extract all Pathfinder 2e specific game terms from the following text.

**Text**:
\`\`\`
${text}
\`\`\`

**Extract**:
- Spell names
- Creature names
- Class/ancestry/heritage names
- Feat names
- Item/equipment names
- Condition names
- Action names

**Format**: Return as JSON array of terms:
\`\`\`json
["Term 1", "Term 2", "Term 3"]
\`\`\`
`;
    }

    /**
     * Parse AI response from pasted text
     * @param {string} response - Pasted AI response
     * @returns {Array|null} Parsed entities or null if invalid
     */
    static parseAIResponse(response) {
        try {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : response;

            // Parse JSON
            const parsed = JSON.parse(jsonText.trim());

            // Validate structure
            if (!Array.isArray(parsed)) {
                console.error("[PromptGenerator] Response is not an array");
                return null;
            }

            // Validate each entity has required fields
            // Validate each entity has required fields
            for (const entity of parsed) {
                if (!entity.id || (!entity.translatedFields && !entity.translatableFields)) {
                    console.error("[PromptGenerator] Invalid entity structure (missing fields):", entity);
                    return null;
                }

                // Normalize field name to help downstream processing
                if (entity.translatableFields && !entity.translatedFields) {
                    entity.translatedFields = entity.translatableFields;
                }
            }

            return parsed;
        } catch (err) {
            console.error("[PromptGenerator] Failed to parse AI response:", err);
            return null;
        }
    }

    /**
     * Generate summary statistics for prompt
     * @param {Array} entities - Entities to analyze
     * @returns {Object} Statistics
     */
    static generateStats(entities) {
        let totalFields = 0;
        let totalCharacters = 0;
        const entityTypes = new Set();

        for (const entity of entities) {
            if (entity.type) entityTypes.add(entity.type);
            if (entity.translatableFields) {
                totalFields += Object.keys(entity.translatableFields).length;
                for (const value of Object.values(entity.translatableFields)) {
                    if (typeof value === 'string') {
                        totalCharacters += value.length;
                    }
                }
            }
        }

        return {
            entityCount: entities.length,
            totalFields,
            totalCharacters,
            entityTypes: Array.from(entityTypes),
            estimatedTokens: Math.ceil(totalCharacters / 4) // Rough estimate
        };
    }
}
