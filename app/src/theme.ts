import { useColorScheme } from 'react-native';

const light = {
  background: '#F3F5F0',
  surface: '#FFFFFF',
  text: '#17201A',
  muted: '#5F6B62',
  border: '#DDE3DA',
  accent: '#2F7D4F',
  onAccent: '#FFFFFF',
  accentSoft: '#E2F1E6',
  warning: '#A66A00',
  danger: '#B3261E',
};

const dark: typeof light = {
  background: '#0F1411',
  surface: '#19211C',
  text: '#ECF1EC',
  muted: '#9AA79D',
  border: '#2A352D',
  accent: '#6CC48A',
  onAccent: '#0F1411',
  accentSoft: '#21372A',
  warning: '#E9B44C',
  danger: '#F2B8B5',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
