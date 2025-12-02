const path = require('path');

module.exports = (options) => {
  // Remove @repo/db from externals so it gets bundled
  const externals = options.externals || [];
  const filteredExternals = externals.filter((external) => {
    if (typeof external === 'function') {
      return true;
    }
    return external !== '@repo/db';
  });

  return {
    ...options,
    externals: filteredExternals.map((external) => {
      if (typeof external === 'function') {
        return (ctx, callback) => {
          const request = ctx.request;
          // Bundle @repo/db and its internals
          if (
            request &&
            (request.startsWith('@repo/db') ||
              request.includes('packages/database'))
          ) {
            return callback();
          }
          return external(ctx, callback);
        };
      }
      return external;
    }),
    module: {
      ...options.module,
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                allowTsInNodeModules: true,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      ...options.resolve,
      extensions: ['.ts', '.js', '.json'],
      symlinks: true,
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
  };
};
