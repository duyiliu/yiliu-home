import Component from './base/Component.js';

/**
 * SearchBar 全局搜索组件
 * 支持快捷键唤起（Ctrl+K）
 */
class SearchBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
      query: '',
      results: [],
      selectedIndex: 0,
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  render() {
    const { isOpen, query, results, selectedIndex } = this.state;
    const { onSelect } = this.props;

    if (!isOpen) return null;

    // 遮罩层
    const overlay = this.createElement('div', {
      className: 'search-overlay',
      onclick: () => this.close(),
    });

    // 搜索框容器
    const container = this.createElement('div', {
      className: 'search-container',
      onclick: (e) => e.stopPropagation(),
    });

    // 搜索输入框
    const inputWrapper = this.createElement('div', { className: 'search-input-wrapper' },
      this.createElement('span', { className: 'search-icon' }, '🔍'),
      this.createElement('input', {
        type: 'text',
        className: 'search-input',
        placeholder: '搜索任务、书签、习惯...',
        value: query,
        oninput: this.handleInputChange,
        onkeydown: this.handleKeyDown,
      }),
      query && this.createElement('button', {
        className: 'search-clear',
        onclick: () => this.setState({ query: '', results: [] }),
      }, '×')
    );

    // 搜索结果
    const resultsList = this.createElement('div', { className: 'search-results' });

    if (query && results.length === 0) {
      resultsList.appendChild(
        this.createElement('div', { className: 'search-empty' }, '没有找到匹配的结果')
      );
    } else if (results.length > 0) {
      results.forEach((item, index) => {
        const resultItem = this.createResultItem(item, index === selectedIndex, () => {
          if (onSelect) onSelect(item);
          this.close();
        });
        resultsList.appendChild(resultItem);
      });
    } else {
      resultsList.appendChild(
        this.createElement('div', { className: 'search-hint' },
          this.createElement('p', {}, '开始输入以搜索...'),
          this.createElement('p', { className: 'search-hint-sub' }, 'Esc 关闭 · ↑↓ 选择 · Enter 打开')
        )
      );
    }

    container.appendChild(inputWrapper);
    container.appendChild(resultsList);

    // 包裹容器
    const wrapper = this.createElement('div', { className: 'search-modal' });
    wrapper.appendChild(overlay);
    wrapper.appendChild(container);

    return wrapper;
  }

  createResultItem(item, isSelected, onClick) {
    const { type, title, subtitle } = item;

    const typeIcon = {
      task: '✓',
      bookmark: '🔖',
      habit: '🎯',
    }[type] || '•';

    const typeName = {
      task: '任务',
      bookmark: '书签',
      habit: '习惯',
    }[type] || type;

    return this.createElement('div', {
      className: `search-result-item ${isSelected ? 'is-selected' : ''}`,
      onclick: onClick,
    },
      this.createElement('div', { className: 'result-icon' }, typeIcon),
      this.createElement('div', { className: 'result-content' },
        this.createElement('div', { className: 'result-title' }, title),
        subtitle && this.createElement('div', { className: 'result-subtitle' }, subtitle)
      ),
      this.createElement('div', { className: 'result-type' }, typeName)
    );
  }

  handleInputChange(e) {
    const query = e.target.value;
    this.setState({ query });

    // 触发搜索
    if (this.props.onSearch) {
      const results = this.props.onSearch(query);
      this.setState({ results, selectedIndex: 0 });
    }
  }

  handleKeyDown(e) {
    const { results, selectedIndex } = this.state;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.setState({
        selectedIndex: Math.min(selectedIndex + 1, results.length - 1),
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.setState({
        selectedIndex: Math.max(selectedIndex - 1, 0),
      });
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      if (this.props.onSelect) {
        this.props.onSelect(results[selectedIndex]);
      }
      this.close();
    }
  }

  open() {
    this.setState({ isOpen: true, query: '', results: [], selectedIndex: 0 });
    this.update(this.props);

    // 自动聚焦输入框
    setTimeout(() => {
      const input = this.element?.querySelector('.search-input');
      if (input) input.focus();
    }, 0);
  }

  close() {
    this.setState({ isOpen: false });
    this.update(this.props);
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
  }
}

export default SearchBar;
