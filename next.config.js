const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({
  webpack: function (config) {
    Object.assign(config.module, {
      noParse: [/alasql/]
    });
    /*config.resolve.fallback = {

      // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped.
      ...config.resolve.fallback,

      fs: false, // the solution
      path: false,
    };*/
    return config;
  },
})