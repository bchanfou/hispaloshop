// craco.config.js
const path = require("path");
const webpack = require("webpack");
require("dotenv").config();

// Avoid CRA/CRACO ESLint webpack plugin resolution in CI/build environments.
process.env.DISABLE_ESLINT_PLUGIN = "true";

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
  enableVisualEdits: false, // Temporarily disabled due to CertificatePage babel issue
};

// Conditionally load visual edits modules only in dev mode
let setupDevServer;
let babelMetadataPlugin;

if (config.enableVisualEdits) {
  setupDevServer = require("./plugins/visual-edits/dev-server-setup");
  babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

const webpackConfig = {
  // Ensure CRACO skips ESLint plugin handling entirely.
  eslint: null,
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Remove ESLintWebpackPlugin to avoid version conflicts with eslint.config.js (flat config)
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );


      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      // Ignore moment locales (if moment is pulled in transitively)
      webpackConfig.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        })
      );

      // Production: aggressive code splitting
      if (process.env.NODE_ENV === "production") {
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: "all",
            maxInitialRequests: 25,
            minSize: 20000,
            cacheGroups: {
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
                name: "vendor-react",
                chunks: "all",
                priority: 30,
              },
              framer: {
                test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
                name: "vendor-framer",
                chunks: "all",
                priority: 20,
              },
              recharts: {
                test: /[\\/]node_modules[\\/]recharts[\\/]/,
                name: "vendor-recharts",
                chunks: "async",
                priority: 20,
              },
              stripe: {
                test: /[\\/]node_modules[\\/]@stripe[\\/]/,
                name: "vendor-stripe",
                chunks: "async",
                priority: 20,
              },
              tanstack: {
                test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
                name: "vendor-tanstack",
                chunks: "all",
                priority: 20,
              },
              i18n: {
                test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
                name: "vendor-i18n",
                chunks: "all",
                priority: 20,
              },
              virtuoso: {
                test: /[\\/]node_modules[\\/]react-virtuoso[\\/]/,
                name: "vendor-virtuoso",
                chunks: "async",
                priority: 20,
              },
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: "vendor",
                chunks: "all",
                priority: 10,
                maxSize: 250000,
              },
            },
          },
        };
      }

      return webpackConfig;
    },
  },
};

// Only add babel metadata plugin during dev server
if (config.enableVisualEdits && babelMetadataPlugin) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

webpackConfig.devServer = (devServerConfig) => {
  // Apply visual edits dev server setup only if enabled
  if (config.enableVisualEdits && setupDevServer) {
    devServerConfig = setupDevServer(devServerConfig);
  }

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  // Proxy /api → backend en desarrollo (evita CORS y errores de URL)
  if (!process.env.REACT_APP_API_URL) {
    devServerConfig.proxy = {
      '/api': {
        target: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    };
  }

  return devServerConfig;
};

module.exports = webpackConfig;
