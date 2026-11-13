// 앱 진입점: 화면 설정(색)을 먼저 적용하고 expo-router 를 불러옴 (src/boot/Gate.tsx)
// `@expo/metro-runtime` 는 웹 Fast Refresh 를 위해 가장 먼저 import
import '@expo/metro-runtime';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

import { Gate } from './src/boot/Gate';

renderRootComponent(Gate);
