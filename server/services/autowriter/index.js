const { extractEntities } = require('./extractor');
const { fallbackAutowriter } = require('./fallback');
const { validateAndFix } = require('./validator');
const { retrieveEvidence, generateWithService } = require('./client');

async function generateAutowriter({ highlights = '', fields = {} }) {
  const entities = { ...extractEntities(highlights), ...fields };

  let evidence = [];
  try {
    const retrieval = await retrieveEvidence({
      query: highlights,
      filters: {
        make: entities.make,
        model: entities.model,
        year: entities.year,
        trim: entities.trim,
      },
      k: 6,
    });
    evidence = retrieval?.chunks || [];
  } catch {
    evidence = [];
  }

  let generated = null;
  try {
    if (evidence.length) {
      generated = await generateWithService({
        highlights,
        fields: entities,
        evidence,
        tone: 'premium_clean',
        languages: ['en', 'ar'],
      });
    }
  } catch {
    generated = null;
  }

  const validated = generated ? validateAndFix(generated, { highlights, entities }) : null;
  if (validated) return validated;

  return fallbackAutowriter({ highlights, entities });
}

module.exports = {
  generateAutowriter,
};
