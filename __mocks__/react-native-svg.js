/**
 * Simulation de react-native-svg pour Jest : composants natifs remplacés par
 * des View, afin de tester le rendu des icônes et squelettes sans module natif.
 */
const React = require('react');
const {View} = require('react-native');

const make = name => {
  const Component = props => React.createElement(View, props, props.children);
  Component.displayName = name;
  return Component;
};

const Svg = make('Svg');

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Path: make('Path'),
  Circle: make('Circle'),
  Rect: make('Rect'),
  Defs: make('Defs'),
  LinearGradient: make('LinearGradient'),
  Stop: make('Stop'),
};
