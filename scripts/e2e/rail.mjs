// Общий помощник для сценариев: на десктопе кнопки «Рядом / Маршруты / Паспорт / Транспорт / Офлайн / Обратная связь»
// выезжают из-за правого края при наведении на язычок #railTab. Перед нажатием на такую кнопку наводим мышь на язычок —
// ровно так, как делает пользователь. На телефоне язычка нет (кнопки в бургер-меню): ожидание короткое и тихо пропускается.
const RAIL_BUTTONS = /^#(btnDay|btnPassport|btnNearby|btnTransit|btnPacks|amgFeedbackBtn)\b/;
export function railify(page) {
  const click = page.click.bind(page);
  page.click = async (selector, options) => {
    if (typeof selector === 'string' && RAIL_BUTTONS.test(selector)) await page.hover('#railTab', { timeout: 1500 }).catch(() => {});
    return click(selector, options);
  };
  return page;
}
