const React = require('react');
const {View} = require('react-native');

const WebView = React.forwardRef(function MockWebView(props, ref) {
  return React.createElement(View, {testID: props.testID || 'webview', ref});
});

module.exports = {WebView, default: WebView};
