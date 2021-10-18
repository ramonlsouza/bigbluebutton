const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const meteorExternals = require('webpack-meteor-externals');

const clientConfig = {
  entry: './client/main.jsx',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: ['react-hot-loader/babel'],
          },
        },
      },
      {
        test: /\.(css|scss|sass)$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: '[local]__[hash:base64:5]',
              },
            },
          },
          'sass-loader',
        ],
      },
    ],
  },
  devServer: {
    hot: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './client/main.html',
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.ContextReplacementPlugin(/any-promise/),
  ],
  resolve: {
    extensions: ['*', '.js', '.jsx','.scss'],
  },
  output: {
    path: '/public/resources',
    publicPath: '/html5client/resources',
    filename: 'client.build.js',
  },
  externals: [
    meteorExternals(),
  ],
};

const serverConfig = {
  entry: [
    './server/main.js',
  ],
  target: 'node',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.ContextReplacementPlugin(/any-promise/),
  ],
  output: {
    path: '/public/resources',
    publicPath: '/html5client/resources',
    filename: 'server.build.js',
  },
  externals: [
    meteorExternals(),
  ],
};

module.exports = [clientConfig, serverConfig];
