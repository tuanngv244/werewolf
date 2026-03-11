// Bridge R3F types for React 19
// React 19 moved JSX types from global JSX to React.JSX namespace
// R3F v8 still augments the old global JSX namespace
// This file imports the ThreeElements and augments both namespaces

import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
