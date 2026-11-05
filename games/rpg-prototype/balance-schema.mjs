// W20.58 — One validated shape for every developer-editable game variable.
// IDs are exact catalog IDs, never code or arbitrary object paths.
export const VARIABLE_FIELDS = Object.freeze({
  weapons: Object.freeze({
    damage: [0, 2000, 1, 'Damage'],
    magazineSize: [1, 500, 1, 'Magazine capacity'],
    reloadSeconds: [0.1, 30, 0.05, 'Reload time (seconds)'],
    recoilDegrees: [0, 30, 0.05, 'Recoil (degrees)'],
    fireInterval: [0.03, 10, 0.01, 'Time between shots (seconds)'],
    hipSpreadDegrees: [0, 45, 0.05, 'Hip-fire spread'],
    adsSpreadDegrees: [0, 30, 0.01, 'Aim-down-sights spread'],
    value: [0, 1000000, 1, 'Base value (caps)'],
    maxCharges: [1, 20, 1, 'Maximum crank charges'],
    crankSeconds: [0.1, 10, 0.05, 'Seconds per crank'],
    damagePerExtraCharge: [0, 3, 0.05, 'Extra damage per charge']
  }),
  armor: Object.freeze({
    points: [0, 1000, 1, 'Armor rating'],
    maxDurability: [1, 5000, 1, 'Maximum durability'],
    value: [0, 1000000, 1, 'Base value (caps)']
  }),
  scrap: Object.freeze({value: [0, 1000000, 1, 'Base value (caps)']}),
  healing: Object.freeze({
    heal: [1, 1000, 1, 'Health restored'],
    value: [0, 1000000, 1, 'Base value (caps)']
  }),
  miscellaneous: Object.freeze({value: [0, 1000000, 1, 'Base value (caps)']})
});
export const VARIABLE_CATEGORIES = Object.freeze([
  ['weapons','Weapons'], ['armor','Armor'], ['scrap','Scrap'],
  ['healing','Healing'], ['miscellaneous','Miscellaneous']
]);
export const SPECIAL_FIELDS = Object.freeze({
  'laser-musket': ['maxCharges', 'crankSeconds', 'damagePerExtraCharge']
});
export const WEAPON_BASE_FIELDS = Object.freeze([
  'damage','magazineSize','reloadSeconds','recoilDegrees','fireInterval',
  'hipSpreadDegrees','adsSpreadDegrees','value'
]);
const MAX_ENTRIES = 600;
const ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,79}$/;

export function validateBalanceChanges(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Settings must be a category object.');
  const cleaned = {};
  let entries = 0;
  for (const [category, items] of Object.entries(input)) {
    const fieldDefinitions = VARIABLE_FIELDS[category];
    if (!fieldDefinitions || !items || typeof items !== 'object' ||
        Array.isArray(items)) throw Error('Invalid variable category.');
    const out = {};
    for (const [id, changes] of Object.entries(items)) {
      if (++entries > MAX_ENTRIES || !ID_PATTERN.test(id) ||
          !changes || typeof changes !== 'object' || Array.isArray(changes))
        throw Error('Invalid variable entry.');
      const fields = {};
      for (const [field, value] of Object.entries(changes)) {
        const range = fieldDefinitions[field];
        if (!range || (category === 'weapons' &&
          SPECIAL_FIELDS[id]?.includes(field) !== true &&
          !WEAPON_BASE_FIELDS.includes(field)) ||
          typeof value !== 'number' || !Number.isFinite(value) ||
          value < range[0] || value > range[1] ||
          (range[2] === 1 && !Number.isInteger(value)))
          throw Error('Invalid value for ' + category + '/' + id + '/' + field);
        fields[field] = value;
      }
      if (Object.keys(fields).length) out[id] = fields;
    }
    if (Object.keys(out).length) cleaned[category] = out;
  }
  return cleaned;
}
