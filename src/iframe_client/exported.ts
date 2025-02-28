/**
 * 酒馆提供给插件的稳定接口, 具体内容见于 https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js#L76
 * 你也可以在酒馆页面按 f12, 在监视中输入 `window.SillyTavern` 来查看当前酒馆所提供的接口
 */
type SillyTavern = any;

function sillyTavern(): SillyTavern {
  return (window.parent as unknown as { SillyTavern: SillyTavern }).SillyTavern.getContext();
}
