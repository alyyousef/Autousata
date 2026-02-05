const fs = require('fs');
const path = require('path');

const taxonomyPath = path.join(__dirname, 'taxonomy.json');
const synonymsPath = path.join(__dirname, 'synonyms.json');

let cached = null;

function loadTaxonomy() {
  if (cached) return cached;
  const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
  const synonyms = JSON.parse(fs.readFileSync(synonymsPath, 'utf8'));
  cached = { taxonomy, synonyms };
  return cached;
}

function normalizeTag(tag) {
  const { taxonomy, synonyms } = loadTaxonomy();
  const lower = tag.toLowerCase().trim();
  if (taxonomy.tags.includes(lower)) return lower;
  if (synonyms[lower]) return synonyms[lower];
  return null;
}

function extractTagsFromText(text) {
  const { taxonomy, synonyms } = loadTaxonomy();
  const lower = text.toLowerCase();
  const tags = new Set();

  for (const tag of taxonomy.tags) {
    if (lower.includes(tag.replace(/_/g, ' ')) || lower.includes(tag)) {
      tags.add(tag);
    }
  }

  for (const [key, value] of Object.entries(synonyms)) {
    if (lower.includes(key)) {
      tags.add(value);
    }
  }

  return Array.from(tags);
}

module.exports = {
  loadTaxonomy,
  normalizeTag,
  extractTagsFromText,
};
