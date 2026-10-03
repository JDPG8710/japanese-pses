# Explorer language routing

User goal → independent primary-age logic/money activities → water allocation and a ten-month resource-allocation simulation → existing Vue games → explorers.html?lang=en|ja|zh → localized navigation, instructions, feedback, reports, charts and accessibility labels.

The original homepage/card text, Vue templates and page shell were hard-coded in Chinese, and links omitted the current language. The locale module now supplies English, Japanese and Chinese; English is the default for direct visits. Country selection passes its language, the English homepage links to English, and the Japanese course links to Japanese. Switching language preserves both simulations. Weather reports store data rather than translated strings, so an existing report also switches languages. Yen remains the simulation currency in all languages.

The change does not alter flow propagation, victory conditions, allocation constraints, growth calculations or school progress. Local preview serves the compiled Vue assets from dist; rebuild after editing these components.

Validation: three-language desktop/mobile browser tests cover pipe keyboard controls, optimal victory and reset, ten-month all-cash and invested controls, report translation, language switching without state loss, tables, layout, and no Chinese/Japanese body text in English. The existing 212-test suite passes. Live 4173 routes return the new page and assets.
