export type Nullable<T> = T | null;

export interface WeatherMain {
  temp: number;
  humidity: number;
}

export interface WeatherDescription {
  description: string;
}

export interface WeatherData {
  name: string;
  main: WeatherMain;
  weather: WeatherDescription[];
}