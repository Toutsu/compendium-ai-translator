# Compendium AI Translator for Babele

<div lang="ru">

## Описание

**Compendium AI Translator** — это модуль для Foundry VTT, который использует искусственный интеллект для перевода компендиумов и генерации файлов переводов для модуля Babele. В отличие от других инструментов перевода, этот модуль работает со **ВСЕМИ** типами сущностей: Актёрами, Предметами, Записями Журнала, Сценами, Таблицами Бросков и другими.

### Ключевые особенности

- ✨ **Поддержка всех типов сущностей** - переводит актёров, предметы, журналы, сцены и многое другое
- 🤖 **5 AI провайдеров** - Google Gemini, ChatGPT, Claude, Copilot, Perplexity
- 🌍 **Интеграция с Babele** - автоматически генерирует Babele-совместимые JSON файлы
- 📦 **Пакетная обработка** - умная группировка сущностей для оптимизации API запросов
- 💾 **Экспорт переводов** - сохраняйте переводы для распространения
- 🎯 **Умное картирование полей** - автоматически определяет, что нужно переводить, а что нет

### Как это работает

1. Выберите компендиум для перевода
2. Модуль извлекает все сущности
3. AI переводит переводимые поля (описания, имена, тексты)
4. Генерируется JSON файл в формате Babele
5. Перевод регистрируется в Babele и применяется автоматически

### Требования

- **Foundry VTT** версии 11 или выше
- **Babele** модуль (обязательно)
- API ключ для одного из поддерживаемых AI провайдеров

### Установка

1. Установите модуль Babele (если еще не установлен)
2. Скачайте этот модуль и разместите в `Data/modules/compendium-ai-translator`
3. Активируйте оба модуля в настройках мира

### Использование

1. Откройте вкладку **Компендиумы**
2. Нажмите кнопку **AI Перевод** в заголовке
3. Выберите компендиум для перевода
4. Настройте AI провайдера (при первом запуске введите API ключ)
5. Нажмите **Начать Перевод**
6. Дождитесь завершения (прогресс отображается в реальном времени)
7. Экспортируйте JSON файл для сохранения или распространения

### Настройки

- **AI Провайдер** - выбор между Gemini, ChatGPT, Claude и др.
- **Целевой язык** - язык, на который переводить (Русский, Немецкий, и др.)
- **Исходный язык** - оригинальный язык контента
- **Размер пакета** - количество сущностей на AI запрос
- **Макс. длина запроса** - лимит символов для одного запроса

### API Ключи

Ваш API ключ хранится **только в вашем браузере** (localStorage). Модуль не отправляет ключи никуда, кроме выбранного AI провайдера.

Как получить API ключи:
- **Google Gemini**: https://makersuite.google.com/app/apikey
- **ChatGPT**: https://platform.openai.com/api-keys
- **Claude**: https://console.anthropic.com/
- **Perplexity**: https://www.perplexity.ai/settings/api

</div>

---

<div lang="en">

## Description

**Compendium AI Translator** is a Foundry VTT module that uses artificial intelligence to translate compendiums and generate translation files for the Babele module. Unlike other translation tools, this module works with **ALL** entity types: Actors, Items, Journal Entries, Scenes, Roll Tables, and more.

### Key Features

- ✨ **All entity type support** - translates actors, items, journals, scenes, and more
- 🤖 **5 AI providers** - Google Gemini, ChatGPT, Claude, Copilot, Perplexity
- 🌍 **Babele integration** - automatically generates Babele-compatible JSON files
- 📦 **Batch processing** - smart entity grouping for optimal API usage
- 💾 **Export translations** - save translations for distribution
- 🎯 **Smart field mapping** - automatically identifies what to translate and what not to

### How It Works

1. Select a compendium to translate
2. Module extracts all entities
3. AI translates translatable fields (descriptions, names, text)
4. Babele JSON file is generated
5. Translation is registered with Babele and applied automatically

### Requirements

- **Foundry VTT** version 11 or higher
- **Babele** module (required)
- API key for one of the supported AI providers

### Installation

1. Install the Babele module (if not already installed)
2. Download this module and place in `Data/modules/compendium-ai-translator`
3. Activate both modules in world settings

### Usage

1. Open the **Compendium** tab
2. Click the **AI Translate** button in the header
3. Select a compendium to translate
4. Configure AI provider (enter API key on first run)
5. Click **Start Translation**
6. Wait for completion (progress shown in real-time)
7. Export JSON file to save or distribute

### Settings

- **AI Provider** - choose between Gemini, ChatGPT, Claude, etc.
- **Target Language** - language to translate to (Russian, German, etc.)
- **Source Language** - original content language
- **Batch Size** - number of entities per AI request
- **Max Prompt Length** - character limit for single request

### API Keys

Your API key is stored **only in your browser** (localStorage). The module does not send keys anywhere except to your chosen AI provider.

How to get API keys:
- **Google Gemini**: https://makersuite.google.com/app/apikey
- **ChatGPT**: https://platform.openai.com/api-keys
- **Claude**: https://console.anthropic.com/
- **Perplexity**: https://www.perplexity.ai/settings/api

</div>

---

## Supported Entity Types

| Type | Translated Fields | Notes |
|------|------------------|-------|
| **Actor** | Name, Biography, Notes | Preserves stats and formulas |
| **Item** | Name, Description, Source | Doesn't translate mechanics |
| **JournalEntry** | Name, Page Content | Full rich text support |
| **Scene** | Name, Notes | Optional |
| **RollTable** | Name, Description, Results | Table entries |
| **Macro** | Name | Command not translated (it's code!) |
| **Playlist** | Name, Description | |
| **Cards** | Name, Description, Card text | |

## System-Specific Support

The module includes enhanced field mapping for:
- **Pathfinder 2e (PF2e)**
- **D&D 5e**

Other systems use generic field mapping and should work fine with most compendiums.

## License

[MIT License](LICENSE)

## Credits

Created with ❤️ for the Foundry VTT community.

Special thanks to:
- **Babele** module by Simone Ricciardi for the translation framework
- **pf2e-ru-ai-translator** by Phil and Toutsu for translation workflow inspiration

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/Toutsu/compendium-ai-translator).
