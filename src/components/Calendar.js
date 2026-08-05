import Component from './base/Component.js';

/**
 * Calendar 日历组件
 * 显示月历视图，支持日期选择和事件标记
 */
class Calendar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      currentDate: props.selectedDate ? new Date(props.selectedDate) : new Date(),
      today: new Date(),
    };
  }

  render() {
    const { currentDate, today } = this.state;
    const { events = [], onDateSelect } = this.props;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 获取当月第一天是星期几（0-6，0 是星期日）
    const firstDayWeek = firstDay.getDay();

    // 获取当月天数
    const daysInMonth = lastDay.getDate();

    // 获取上个月的天数
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // 创建日历容器
    const calendar = this.createElement('div', { className: 'calendar' });

    // 头部：月份导航
    const header = this.createElement('div', { className: 'calendar-header' },
      this.createElement('button', {
        className: 'calendar-nav-btn',
        onclick: () => this.prevMonth(),
      }, '‹'),
      this.createElement('div', { className: 'calendar-title' },
        `${year}年${month + 1}月`
      ),
      this.createElement('button', {
        className: 'calendar-nav-btn',
        onclick: () => this.nextMonth(),
      }, '›')
    );

    // 星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekHeader = this.createElement('div', { className: 'calendar-weekdays' });
    weekdays.forEach(day => {
      weekHeader.appendChild(
        this.createElement('div', { className: 'calendar-weekday' }, day)
      );
    });

    // 日期网格
    const grid = this.createElement('div', { className: 'calendar-grid' });

    // 填充上个月的日期（灰色显示）
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const cell = this.createDayCell(day, 'prev-month');
      grid.appendChild(cell);
    }

    // 填充当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = this.isSameDay(date, today);
      const hasEvent = this.hasEventOnDate(date, events);

      const cell = this.createDayCell(day, 'current-month', {
        isToday,
        hasEvent,
        date,
        onDateSelect,
      });

      grid.appendChild(cell);
    }

    // 填充下个月的日期（灰色显示）
    const totalCells = firstDayWeek + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const cell = this.createDayCell(day, 'next-month');
      grid.appendChild(cell);
    }

    calendar.appendChild(header);
    calendar.appendChild(weekHeader);
    calendar.appendChild(grid);

    return calendar;
  }

  createDayCell(day, monthClass, options = {}) {
    const { isToday, hasEvent, date, onDateSelect } = options;

    const classNames = ['calendar-day', monthClass];
    if (isToday) classNames.push('is-today');
    if (hasEvent) classNames.push('has-event');

    const cell = this.createElement('div', {
      className: classNames.join(' '),
      onclick: monthClass === 'current-month' && onDateSelect
        ? () => onDateSelect(date)
        : null,
    }, day.toString());

    if (hasEvent) {
      const dot = this.createElement('span', { className: 'event-dot' });
      cell.appendChild(dot);
    }

    return cell;
  }

  prevMonth() {
    this.state.currentDate.setMonth(this.state.currentDate.getMonth() - 1);
    this.update(this.props);
  }

  nextMonth() {
    this.state.currentDate.setMonth(this.state.currentDate.getMonth() + 1);
    this.update(this.props);
  }

  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  hasEventOnDate(date, events) {
    return events.some(event => {
      const eventDate = new Date(event.date);
      return this.isSameDay(date, eventDate);
    });
  }
}

export default Calendar;
