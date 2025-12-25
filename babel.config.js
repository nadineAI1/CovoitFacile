module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // place ici d'autres plugins si nécessaire,
      // MAIS le plugin reanimated DOIT être le dernier
      'react-native-reanimated/plugin',
    ],
  };
};