import store from '../store.js';

const CITY_KEY = 'yiliu.home.weather.city';
const DEFAULT_CITY = '自动';

/**
 * WeatherService - 天气服务
 *
 * 注意：这里使用 wttr.in 作为免费天气 API
 * 也可以替换为其他天气服务（如和风天气、OpenWeatherMap 等）
 */
const weatherService = {
  /**
   * 获取用户配置的城市（localStorage 持久化）
   */
  getCity() {
    return localStorage.getItem(CITY_KEY) || DEFAULT_CITY;
  },

  /**
   * 保存城市并立即生效
   */
  setCity(city) {
    const value = (city || '').trim() || DEFAULT_CITY;
    localStorage.setItem(CITY_KEY, value);
    return value;
  },

  /**
   * 获取天气数据
   */
  async fetch(city) {
    try {
      const target = city || this.getCity();
      // 使用 wttr.in API（免费，无需 key）
      const url = `https://wttr.in/${encodeURIComponent(target)}?format=j1&lang=zh`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('获取天气失败');
      }

      const data = await response.json();

      // 解析数据
      const current = data.current_condition[0];
      const area = data.nearest_area?.[0];

      const weather = {
        city: area?.areaName?.[0]?.value || target,
        temp: `${current.temp_C}°C`,
        description: current.lang_zh?.[0]?.value || current.weatherDesc[0].value,
        emoji: this.getWeatherEmoji(current.weatherCode),
        humidity: `${current.humidity}%`,
        windSpeed: `${current.windspeedKmph} km/h`,
        fetchedAt: Date.now(),
      };

      // 保存到 Store
      store.setState(state => ({
        ...state,
        weather,
      }));

      return weather;
    } catch (error) {
      console.error('获取天气失败:', error);
      throw error;
    }
  },

  /**
   * 获取当前天气数据（从 Store）
   */
  getCurrent() {
    const state = store.getState();
    return state.weather || null;
  },

  /**
   * 检查天气数据是否过期（超过1小时）
   */
  isExpired() {
    const weather = this.getCurrent();
    if (!weather || !weather.fetchedAt) return true;

    const now = Date.now();
    const elapsed = now - weather.fetchedAt;
    const oneHour = 60 * 60 * 1000;

    return elapsed > oneHour;
  },

  /**
   * 刷新天气（如果过期）
   */
  async refreshIfNeeded(city) {
    if (this.isExpired()) {
      return await this.fetch(city);
    }
    return this.getCurrent();
  },

  /**
   * 根据天气代码获取 emoji
   */
  getWeatherEmoji(code) {
    const codeNum = parseInt(code);

    // wttr.in 天气代码映射
    if (codeNum === 113) return '☀️';  // 晴天
    if (codeNum === 116) return '⛅';  // 少云
    if (codeNum === 119) return '☁️';  // 多云
    if (codeNum === 122) return '☁️';  // 阴天
    if (codeNum === 143) return '🌫️';  // 雾
    if (codeNum === 176 || codeNum === 263 || codeNum === 266) return '🌦️';  // 小雨
    if (codeNum === 296 || codeNum === 299 || codeNum === 302) return '🌧️';  // 中雨
    if (codeNum === 305 || codeNum === 308) return '⛈️';  // 大雨
    if (codeNum === 200 || codeNum === 386 || codeNum === 389) return '⛈️';  // 雷雨
    if (codeNum === 227 || codeNum === 230) return '🌨️';  // 暴雪
    if (codeNum >= 323 && codeNum <= 338) return '❄️';  // 雪
    if (codeNum >= 350 && codeNum <= 362) return '🌨️';  // 雨夹雪

    return '🌤️';  // 默认
  },
};

export default weatherService;
