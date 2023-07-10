const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: './src/ts/main.ts',
    module: {
        rules: [
            {
                test: /\.html$/,
                loader: "html-loader",
            },
            {
                test: /\.ts$/,
                loader: 'ts-loader',
            },
            {
                test: /\.css$/,
                use: [
                    { loader: MiniCssExtractPlugin.loader }, 
                    { 
                        loader: "css-loader",
                        options: {
                            esModule: false,
                        },
                    },
                ],
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/,
                type: "asset/resource",
                generator: {
                    filename: "img/[name][ext]"
                }
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: '[name].[chunkhash].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: "/",
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: "./index.html",
        }),
        new MiniCssExtractPlugin({
            filename: "css/[name].[chunkhash].css",
        }),
    ],
    devtool: "eval-source-map"
};