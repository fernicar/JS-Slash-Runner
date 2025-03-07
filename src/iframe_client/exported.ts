/**
 * 酒馆提供给插件的稳定接口, 具体内容见于 https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js#L76
 * 你也可以在酒馆页面按 f12, 在监视中输入 `window.SillyTavern` 来查看当前酒馆所提供的接口
 */
const SillyTavern = (window.parent as unknown as { SillyTavern: any }).SillyTavern.getContext();

//======================================================================================================================
/**
 * @deprecated 请使用 SillyTavern 而不是 sillyTavern()
 */
function sillyTavern(): any {
  return SillyTavern;
}
