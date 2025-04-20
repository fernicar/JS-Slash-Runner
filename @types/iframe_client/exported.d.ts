/**
 * 酒馆提供给插件的稳定接口, 具体内容见于 https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.SillyTavern.getContext()` 来查看当前酒馆所提供的接口
 */
const SillyTavern: Record<string, any>;

/**
 * 酒馆助手提供的额外功能, 具体内容见于 https://n0vi028.github.io/JS-Slash-Runner-Doc
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.TavernHelper` 来查看当前酒馆助手所提供的接口
 */
const TavernHelper: typeof window.TavernHelper;
