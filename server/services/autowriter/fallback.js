const { extractTagsFromText } = require('./taxonomy');

function buildWarnings(entities) {
  const warnings = [];
  if (!entities.make) warnings.push('Missing make.');
  if (!entities.model) warnings.push('Missing model.');
  if (!entities.year) warnings.push('Missing year.');
  if (!entities.mileage) warnings.push('Mileage not provided.');
  if (!entities.transmission) warnings.push('Transmission not provided.');
  if (!entities.engine) warnings.push('Engine not provided.');
  return warnings;
}

function fallbackAutowriter({ highlights = '', entities }) {
  const tags = extractTagsFromText(highlights);
  const warnings = buildWarnings(entities);

  const english = `Premium, clean presentation based strictly on verified seller highlights: ${highlights || 'No highlights provided'}. This auction description avoids assumptions and does not add unconfirmed features. For serious buyers, please confirm exact specs such as mileage, engine details, and factory options before bidding. The goal here is clarity and confidence, highlighting only what is known and keeping the tone professional and auction-ready. If you need additional details, request a full inspection report or supporting documents so the final listing can be updated with evidence-backed information.`;
  const arabic = `عرض مميز ونظيف يعتمد حصراً على المعلومات المؤكدة من البائع: ${highlights || 'لم يتم تقديم تفاصيل'}. هذا الوصف يتجنب الافتراضات ولا يضيف ميزات غير مؤكدة. للجدية، يرجى تأكيد المواصفات مثل المسافة المقطوعة، تفاصيل المحرك، والخيارات الأصلية قبل المزايدة. الهدف هو الوضوح والثقة مع أسلوب احترافي مناسب للمزاد. إذا كنت تحتاج تفاصيل إضافية، اطلب تقرير فحص أو مستندات داعمة حتى يتم تحديث الوصف بمعلومات مثبتة.`;

  const bullets = [];
  if (highlights) {
    highlights.split(',').map(part => part.trim()).filter(Boolean).slice(0, 8).forEach(item => bullets.push(item));
  }
  while (bullets.length < 5) bullets.push('Details available upon request');

  return {
    description_paragraph: `${english} ${arabic}`,
    bullet_highlights: bullets.slice(0, 8),
    keywords: tags.slice(0, 20),
    warnings,
    detected_entities: {
      make: entities.make,
      model: entities.model,
      year: entities.year,
      trim: entities.trim,
      mileage: entities.mileage,
      transmission: entities.transmission,
      engine: entities.engine,
      condition: entities.condition,
    },
    evidence: [{ chunk_id: 'rule:highlights', note: 'Used user highlights only.' }],
  };
}

module.exports = {
  fallbackAutowriter,
};
