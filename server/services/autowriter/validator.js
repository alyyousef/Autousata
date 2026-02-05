const { normalizeTag, extractTagsFromText } = require('./taxonomy');

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeBullets(bullets = []) {
  return bullets
    .map(b => String(b).trim())
    .filter(Boolean)
    .map(b => b.replace(/\s+/g, ' '))
    .filter(b => b.length <= 120);
}

function normalizeKeywords(keywords = [], highlights = '') {
  const result = new Set();
  for (const k of keywords) {
    const norm = normalizeTag(String(k));
    if (norm) result.add(norm);
  }
  const extracted = extractTagsFromText(highlights);
  extracted.forEach(tag => result.add(tag));
  return Array.from(result).slice(0, 20);
}

function validateAndFix(output, { highlights = '', entities }) {
  if (!output || typeof output !== 'object') return null;

  const fixed = {
    description_paragraph: String(output.description_paragraph || ''),
    bullet_highlights: sanitizeBullets(output.bullet_highlights || []),
    keywords: normalizeKeywords(output.keywords || [], highlights),
    warnings: (output.warnings || []).map(w => String(w)).filter(Boolean),
    detected_entities: output.detected_entities || {},
    evidence: Array.isArray(output.evidence) ? output.evidence : [],
  };

  const wc = wordCount(fixed.description_paragraph);
  if (wc < 120 || wc > 200) return null;

  if (fixed.bullet_highlights.length < 5 || fixed.bullet_highlights.length > 8) return null;

  if (fixed.keywords.length < 10) {
    const enriched = normalizeKeywords(fixed.keywords, highlights);
    fixed.keywords = enriched;
  }

  fixed.detected_entities = {
    make: entities.make || fixed.detected_entities.make || null,
    model: entities.model || fixed.detected_entities.model || null,
    year: entities.year || fixed.detected_entities.year || null,
    trim: entities.trim || fixed.detected_entities.trim || null,
    mileage: entities.mileage || fixed.detected_entities.mileage || null,
    transmission: entities.transmission || fixed.detected_entities.transmission || null,
    engine: entities.engine || fixed.detected_entities.engine || null,
    condition: entities.condition || fixed.detected_entities.condition || null,
  };

  if (!fixed.warnings.length) {
    if (!fixed.detected_entities.make) fixed.warnings.push('Missing make.');
    if (!fixed.detected_entities.model) fixed.warnings.push('Missing model.');
    if (!fixed.detected_entities.year) fixed.warnings.push('Missing year.');
  }

  return fixed;
}

module.exports = {
  validateAndFix,
};
