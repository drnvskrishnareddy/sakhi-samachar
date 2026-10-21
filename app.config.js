// Extends app.json.
//   EXPO_BASE_URL          web sub-path, e.g. "/sakhi-samachar" for https://<user>.github.io/sakhi-samachar/
//   GOOGLE_IOS_URL_SCHEME  iPhone builds only: the "iOS URL scheme" of your iOS OAuth client
//                          (com.googleusercontent.apps.xxxx). Android and web do not need it.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ...(process.env.GOOGLE_IOS_URL_SCHEME
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }]]
      : []),
  ],
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
