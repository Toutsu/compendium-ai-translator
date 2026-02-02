/**
 * TranslationService - Handles AI translation requests
 */
export class TranslationService {
    constructor() {
        this.providers = {
            gemini: this.translateWithGemini.bind(this),
            chatgpt: this.translateWithChatGPT.bind(this),
            claude: this.translateWithClaude.bind(this),
            copilot: this.translateWithCopilot.bind(this),
            perplexity: this.translateWithPerplexity.bind(this)
        };
    }

    /**
     * Main translation method
     * @param {Array} entities - Array of entity data to translate
     * @param {Object} options - Translation options
     * @returns {Promise<Array>} Translated entities
     */
    async translate(entities, options = {}) {
        const provider = options.provider || game.settings.get('compendium-ai-translator', 'aiProvider');
        const translateFn = this.providers[provider];

        if (!translateFn) {
            throw new Error(`Unknown AI provider: ${provider}`);
        }

        const prompt = this.buildPrompt(entities, options);
        const response = await translateFn(prompt, options);
        return this.parseResponse(response, entities);
    }

    /**
     * Build translation prompt
     */
    buildPrompt(entities, options) {
        const sourceLanguage = options.sourceLanguage || game.settings.get('compendium-ai-translator', 'sourceLanguage');
        const targetLanguage = options.targetLanguage || game.settings.get('compendium-ai-translator', 'targetLanguage');
        const gameSystem = game.system.title;

        const prompt = `You are a professional translator specializing in tabletop RPG content for ${gameSystem}.

TASK: Translate the following game content from ${sourceLanguage} to ${targetLanguage}.

CRITICAL RULES:
1. Translate ONLY the text content, preserve all HTML tags and formatting
2. Maintain game terminology consistency (use established translations if they exist)
3. Do NOT translate:
   - Proper names (character names, place names) unless they have official translations
   - Game mechanic keywords (keep them in original language or use standard translations)
   - Numbers, formulas, dice notation (like "1d6+2")
   - HTML tags and attributes
4. Preserve formatting: paragraphs, lists, tables
5. Return the translation in the EXACT same JSON structure as provided

SOURCE CONTENT:
${JSON.stringify(entities, null, 2)}

Respond with ONLY the translated JSON, using the same structure. Each entity should have all translatable fields translated.`;

        return prompt;
    }

    /**
     * Parse AI response back into structured data
     */
    parseResponse(response, originalEntities) {
        try {
            // Try to extract JSON from response
            let jsonText = response;

            // If wrapped in markdown code blocks, extract
            const codeBlockMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1];
            }

            const translated = JSON.parse(jsonText);

            // Validate structure matches
            if (!Array.isArray(translated)) {
                throw new Error('Response is not an array');
            }
            if (translated.length !== originalEntities.length) {
                console.warn('[Translation] Response length mismatch:', translated.length, 'vs', originalEntities.length);
            }

            return translated;
        } catch (error) {
            console.error('[Translation] Failed to parse response:', error);
            console.error('Raw response:', response);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Translate using Google Gemini
     */
    async translateWithGemini(prompt, options) {
        const apiKey = options.apiKey || localStorage.getItem('compendium-translator-api-key');
        if (!apiKey) {
            throw new Error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.NoAPIKey'));
        }

        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

        const response = await fetch(`${url}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 8192
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${error}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    /**
     * Translate using OpenAI ChatGPT
     */
    async translateWithChatGPT(prompt, options) {
        const apiKey = options.apiKey || localStorage.getItem('compendium-translator-api-key');
        if (!apiKey) {
            throw new Error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.NoAPIKey'));
        }

        const url = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'You are a professional RPG content translator. Always respond with valid JSON only.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`ChatGPT API error: ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Translate using Anthropic Claude
     */
    async translateWithClaude(prompt, options) {
        const apiKey = options.apiKey || localStorage.getItem('compendium-translator-api-key');
        if (!apiKey) {
            throw new Error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.NoAPIKey'));
        }

        const url = 'https://api.anthropic.com/v1/messages';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error: ${error}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * Translate using Microsoft Copilot
     */
    async translateWithCopilot(prompt, options) {
        // Note: Copilot uses Azure OpenAI under the hood
        // This is a placeholder - actual implementation depends on your Azure setup
        throw new Error('Copilot integration not yet implemented. Please use ChatGPT, Gemini, or Claude.');
    }

    /**
     * Translate using Perplexity AI
     */
    async translateWithPerplexity(prompt, options) {
        const apiKey = options.apiKey || localStorage.getItem('compendium-translator-api-key');
        if (!apiKey) {
            throw new Error(game.i18n.localize('COMPENDIUM_TRANSLATOR.Errors.NoAPIKey'));
        }

        const url = 'https://api.perplexity.ai/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3-sonar-large-32k-online',
                messages: [
                    { role: 'system', content: 'You are a professional RPG translator. Respond only with valid JSON.' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Perplexity API error: ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}
