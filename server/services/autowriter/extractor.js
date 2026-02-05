const YEAR_RE = /(19\d{2}|20\d{2})/;
const MILEAGE_RE = /((?:\d{1,3}[, ]?)+)\s*(km|kilometers|\u0643\u064a\u0644\u0648\u0645\u062a\u0631|mi|miles|\u0645\u064a\u0644)/i;
const TRANSMISSION_RE = /(automatic|auto|manual|cvt|dct|dual clutch|stept?ronic|tiptronic|\u0623\u0648\u062a\u0648\u0645\u0627\u062a\u064a\u0643|\u0639\u0627\u062f\u064a|\u064a\u062f\u0648\u064a)/i;
const ENGINE_RE = /((?:\d\.\d)\s*l|v6|v8|v10|v12|i4|i6|turbo|supercharged|hybrid|electric)/i;
const CONDITION_RE = /(excellent|very good|good|fair|poor|clean|mint|like new|\u0645\u0645\u062a\u0627\u0632|\u062c\u064a\u062f \u062c\u062f\u0627|\u062c\u064a\u062f|\u0645\u0642\u0628\u0648\u0644)/i;

function extractEntities(text = '') {
  const lower = text.toLowerCase();
  const yearMatch = text.match(YEAR_RE);
  const mileageMatch = text.match(MILEAGE_RE);
  const transmissionMatch = text.match(TRANSMISSION_RE);
  const engineMatch = text.match(ENGINE_RE);
  const conditionMatch = text.match(CONDITION_RE);

  return {
    make: null,
    model: null,
    year: yearMatch ? Number(yearMatch[1]) : null,
    trim: null,
    mileage: mileageMatch ? `${mileageMatch[1].replace(/\s+/g, '')} ${mileageMatch[2]}` : null,
    transmission: transmissionMatch ? transmissionMatch[1] : null,
    engine: engineMatch ? engineMatch[1] : null,
    condition: conditionMatch ? conditionMatch[1] : null,
    _raw: lower,
  };
}

module.exports = {
  extractEntities,
};
