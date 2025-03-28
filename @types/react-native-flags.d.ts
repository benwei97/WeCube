declare module 'react-native-flags' {
    import { Component } from 'react';
    import { ViewProps } from 'react-native';
  
    interface FlagProps extends ViewProps {
      code: string;   // ISO 3166-1 alpha-2 country code
      size?: number;  // Size of the flag (optional)
    }
  
    export default class Flag extends Component<FlagProps> {}
  }
  