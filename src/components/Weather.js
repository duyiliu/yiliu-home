import Component from './base/Component.js';

/**
 * Weather 天气组件
 * 显示当前天气信息
 */
class Weather extends Component {
  render() {
    const { weather, loading, error, onRefresh } = this.props;

    const container = this.createElement('div', { className: 'weather-widget' });

    // 加载中
    if (loading) {
      container.appendChild(
        this.createElement('div', { className: 'weather-loading' }, '加载中...')
      );
      return container;
    }

    // 错误状态
    if (error) {
      container.appendChild(
        this.createElement('div', { className: 'weather-error' },
          this.createElement('p', {}, error),
          this.createElement('button', {
            className: 'btn btn-sm',
            onclick: onRefresh,
          }, '重试')
        )
      );
      return container;
    }

    // 无数据
    if (!weather) {
      container.appendChild(
        this.createElement('div', { className: 'weather-empty' },
          this.createElement('p', {}, '暂无天气数据'),
          this.createElement('button', {
            className: 'btn btn-primary btn-sm',
            onclick: onRefresh,
          }, '获取天气')
        )
      );
      return container;
    }

    // 显示天气
    const { city, temp, description, emoji, humidity, windSpeed } = weather;

    // 主要信息
    const main = this.createElement('div', { className: 'weather-main' },
      this.createElement('div', { className: 'weather-emoji' }, emoji || '☀️'),
      this.createElement('div', { className: 'weather-info' },
        this.createElement('div', { className: 'weather-temp' }, temp),
        this.createElement('div', { className: 'weather-desc' }, description)
      )
    );

    // 详细信息
    const details = this.createElement('div', { className: 'weather-details' },
      this.createElement('div', { className: 'weather-detail-item' },
        this.createElement('span', { className: 'detail-label' }, '城市'),
        this.createElement('span', { className: 'detail-value' }, city)
      )
    );

    if (humidity) {
      details.appendChild(
        this.createElement('div', { className: 'weather-detail-item' },
          this.createElement('span', { className: 'detail-label' }, '湿度'),
          this.createElement('span', { className: 'detail-value' }, humidity)
        )
      );
    }

    if (windSpeed) {
      details.appendChild(
        this.createElement('div', { className: 'weather-detail-item' },
          this.createElement('span', { className: 'detail-label' }, '风速'),
          this.createElement('span', { className: 'detail-value' }, windSpeed)
        )
      );
    }

    // 刷新按钮
    const footer = this.createElement('div', { className: 'weather-footer' },
      this.createElement('button', {
        className: 'btn-text btn-sm',
        onclick: onRefresh,
      }, '🔄 刷新')
    );

    container.appendChild(main);
    container.appendChild(details);
    container.appendChild(footer);

    return container;
  }
}

export default Weather;
