module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    // In test env, disable the auto-injected reanimated plugin (needs native worklets unavailable in Jest)
    presets: [['babel-preset-expo', { reanimated: !isTest }]],
  };
};
