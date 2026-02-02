# Compendium AI Translator for Babele

<div lang="ru">

## Описание

**Compendium AI Translator** — это модуль для Foundry VTT, который использует искусственный интеллект для перевода компендиумов и генерации файлов переводов для модуля Babele. В отличие от других инструментов перевода, этот модуль работает со **ВСЕМИ** типами сущностей: Актёрами, Предметами, Записями Журнала, Сценами, Таблицами Бросков и другими.

### Ключевые особенности

- ✨ **Поддержка всех типов сущностей** - переводит актёров, предметы, журналы, сцены и многое другое
- 📋 **Copy-Paste Workflow** - не нужен API ключ! Копируйте промпт в любой AI чат
- 📚 **Интеграция с pf2e-ru** - автоматически загружает официальные переводы терминов
- 🔄 **Автозамена терминов** - известные термины заменяются до перевода
- 🌍 **Интеграция с Babele** - генерирует Babele-совместимые JSON файлы
- ✅ **Проверка орфографии** - генерация промпта для проверки качества перевода
- 🎯 **Умное картирование полей** - защита HTML, ссылок Foundry и формул бросков

### Новый Copy-Paste Workflow

**Преимущества:**
- 🆓 Не нужен API ключ — используйте любой AI бесплатно
- 👁️ Полная прозрачность — видите что отправляется в AI
- 📖 Единообразие терминов — использует официальные переводы pf2e-ru
- ✏️ Контроль качества — опциональная проверка орфографии

**Как это работает:**

1. **Загрузить словарь** — нажмите "Load pf2e-ru Terms" для загрузки ~1,200 официальных переводов
2. **Извлечь сущности** — выберите компендиум и нажмите "Extract"
3. **Автозамена** — известные термины (Perception → Восприятие) заменяются автоматически
4. **Сгенерировать промпт** — нажмите "Generate Prompt"
5. **Скопировать в AI** — скопируйте промпт в буфер и вставьте в ChatGPT/Gemini/Claude
6. **Вставить ответ** — скопируйте ответ AI и вставьте обратно
7. **Обработать** — модуль создаст Babele JSON и зарегистрирует перевод
8. **(Опционально)** — сгенерируйте промпт для проверки орфографии

### Требования

- **Foundry VTT** версии 11 или выше
- **Babele** модуль (обязательно)
- **pf2e-ru** модуль (опционально, для словаря терминов)

### Установка

1. Установите модуль Babele (если еще не установлен)
2. Установите pf2e-ru модуль (рекомендуется для PF2e)
3. Скачайте этот модуль и разместите в `Data/modules/compendium-ai-translator`
4. Активируйте модули в настройках мира

### Использование

1. Откройте вкладку **Компендиумы**
2. Нажмите кнопку **AI Перевод** в заголовке
3. Нажмите **Load pf2e-ru Terms** для загрузки словаря
4. Выберите компендиум для перевода
5. Следуйте пошаговому процессу (Extract → Generate → Copy → Paste → Process)
6. Экспортируйте JSON файл для сохранения или распространения

### Защита контента

Модуль автоматически защищает:
- **HTML теги** — `<p>`, `<strong>`, `<em>` и др.
- **Ссылки Foundry** — `@UUID[...]`, `@Compendium[...]`, `@Actor[...]`
- **Формулы бросков** — `[[2d6+3]]`, `[[/r 1d20]]`
- **Механики игры** — формулы урона, ID, системные значения

</div>

---

<div lang="en">

## Description

**Compendium AI Translator** is a Foundry VTT module that uses artificial intelligence to translate compendiums and generate translation files for the Babele module. Unlike other translation tools, this module works with **ALL** entity types: Actors, Items, Journal Entries, Scenes, Roll Tables, and more.

### Key Features

- ✨ **All entity type support** - translates actors, items, journals, scenes, and more
- 📋 **Copy-Paste Workflow** - no API key needed! Copy prompt to any AI chat
- 📚 **pf2e-ru Integration** - automatically loads official term translations
- 🔄 **Auto term replacement** - known terms replaced before translation
- 🌍 **Babele integration** - generates Babele-compatible JSON files
- ✅ **Spell-check support** - generate prompt for quality review
- 🎯 **Smart field mapping** - protects HTML, Foundry links, and roll formulas

### New Copy-Paste Workflow

**Benefits:**
- 🆓 No API key required — use any AI for free
- 👁️ Full transparency — see exactly what's sent to AI
- 📖 Term consistency — uses official pf2e-ru translations
- ✏️ Quality control — optional spell-check step

**How it works:**

1. **Load dictionary** — click "Load pf2e-ru Terms" to load ~1,200 official translations
2. **Extract entities** — select compendium and click "Extract"
3. **Auto-replace** — known terms (Perception → Восприятие) replaced automatically
4. **Generate prompt** — click "Generate Prompt"
5. **Copy to AI** — copy prompt to clipboard and paste into ChatGPT/Gemini/Claude
6. **Paste response** — copy AI response and paste back
7. **Process** — module creates Babele JSON and registers translation
8. **(Optional)** — generate spell-check prompt for quality review

### Requirements

- **Foundry VTT** version 11 or higher
- **Babele** module (required)
- **pf2e-ru** module (optional, for term dictionary)

### Installation

1. Install the Babele module (if not already installed)
2. Install pf2e-ru module (recommended for PF2e)
3. Download this module and place in `Data/modules/compendium-ai-translator`
4. Activate modules in world settings

### Usage

1. Open the **Compendium** tab
2. Click the **AI Translate** button in the header
3. Click **Load pf2e-ru Terms** to load dictionary
4. Select a compendium to translate
5. Follow the step-by-step workflow (Extract → Generate → Copy → Paste → Process)
6. Export JSON file to save or distribute

### Content Protection

The module automatically protects:
- **HTML tags** — `<p>`, `<strong>`, `<em>`, etc.
- **Foundry links** — `@UUID[...]`, `@Compendium[...]`, `@Actor[...]`
- **Roll formulas** — `[[2d6+3]]`, `[[/r 1d20]]`
- **Game mechanics** — damage formulas, IDs, system values

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

## Dictionary Integration

When **pf2e-ru** module is installed, the translator can:
- Load ~1,200+ official Russian translations
- Auto-replace known terms before sending to AI
- Ensure consistent terminology across translations
- Reduce translation costs and improve quality

**Loaded from:**
- System translations (skills, abilities, conditions)
- Compendium translations (bestiary, equipment, spells, feats)

## License

[MIT License](LICENSE)

## Credits

Created with ❤️ for the Foundry VTT community.

Special thanks to:
- **Babele** module by Simone Ricciardi for the translation framework
- **pf2e-ru** team for official Russian translations
- **pf2e-ru-ai-translator** by Phil and Toutsu for workflow inspiration

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/Toutsu/compendium-ai-translator).
