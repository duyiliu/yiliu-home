import BaseView from './BaseView.js';
import store from '../store.js';
import Toast from '../components/base/Toast.js';

/**
 * SettingsView - 设置视图
 * 应用设置和数据管理
 */
class SettingsView extends BaseView {
  render() {
    const container = document.createElement('div');
    container.className = 'settings-view';

    // 页面标题
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = '<h1>⚙️ 设置</h1>';

    // 设置区域
    const sections = document.createElement('div');
    sections.className = 'settings-sections';

    // 外观设置
    sections.appendChild(this.createAppearanceSection());

    // 数据管理
    sections.appendChild(this.createDataSection());

    // 关于
    sections.appendChild(this.createAboutSection());

    container.appendChild(header);
    container.appendChild(sections);

    return container;
  }

  createAppearanceSection() {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const header = document.createElement('h2');
    header.textContent = '外观';
    section.appendChild(header);

    // 主题选择
    const themeRow = this.createSettingRow(
      '主题',
      '选择界面主题',
      this.createThemeSelector()
    );
    section.appendChild(themeRow);

    return section;
  }

  createDataSection() {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const header = document.createElement('h2');
    header.textContent = '数据管理';
    section.appendChild(header);

    // 导出数据
    const exportRow = this.createSettingRow(
      '导出数据',
      '下载所有数据为 JSON 文件',
      this.createButton('导出', () => this.exportData())
    );
    section.appendChild(exportRow);

    // 导入数据
    const importRow = this.createSettingRow(
      '导入数据',
      '从 JSON 文件恢复数据',
      this.createImportButton()
    );
    section.appendChild(importRow);

    // 清空数据
    const clearRow = this.createSettingRow(
      '清空数据',
      '删除所有数据（不可恢复）',
      this.createButton('清空', () => this.clearData(), 'danger')
    );
    section.appendChild(clearRow);

    return section;
  }

  createAboutSection() {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const header = document.createElement('h2');
    header.textContent = '关于';
    section.appendChild(header);

    const state = store.getState();
    const version = state.meta?.version || '2.0.0';

    const info = document.createElement('div');
    info.className = 'about-info';
    info.innerHTML = `
      <p><strong>一流工作台</strong></p>
      <p>版本：${version}</p>
      <p>一个轻量级的个人生产力工具</p>
      <br>
      <p style="color: var(--text-secondary); font-size: 0.9em;">
        零依赖 · ES Modules · 模块化架构
      </p>
    `;

    section.appendChild(info);

    return section;
  }

  createSettingRow(title, description, control) {
    const row = document.createElement('div');
    row.className = 'setting-row';

    const left = document.createElement('div');
    left.className = 'setting-left';
    left.innerHTML = `
      <div class="setting-title">${title}</div>
      <div class="setting-desc">${description}</div>
    `;

    const right = document.createElement('div');
    right.className = 'setting-right';
    right.appendChild(control);

    row.appendChild(left);
    row.appendChild(right);

    return row;
  }

  createButton(text, onClick, variant = 'default') {
    const button = document.createElement('button');
    button.className = `btn btn-${variant}`;
    button.textContent = text;
    button.onclick = onClick;
    return button;
  }

  createThemeSelector() {
    const state = store.getState();
    const currentTheme = state.ui?.theme || 'auto';

    const select = document.createElement('select');
    select.className = 'setting-select';

    const options = [
      { value: 'light', label: '浅色' },
      { value: 'dark', label: '深色' },
      { value: 'auto', label: '跟随系统' },
    ];

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === currentTheme;
      select.appendChild(option);
    });

    select.onchange = (e) => {
      store.setState(state => ({
        ...state,
        ui: {
          ...state.ui,
          theme: e.target.value,
        },
      }));
      Toast.success('主题已更新');
      this.applyTheme(e.target.value);
    };

    return select;
  }

  createImportButton() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (confirm('导入数据将覆盖现有数据，确定继续吗？')) {
          store.setState(data);
          Toast.success('数据导入成功');
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (error) {
        Toast.error('导入失败：' + error.message);
      }
    };

    const button = this.createButton('选择文件', () => input.click());

    const wrapper = document.createElement('div');
    wrapper.appendChild(input);
    wrapper.appendChild(button);

    return wrapper;
  }

  exportData() {
    try {
      const state = store.getState();
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `yiliu-backup-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
      Toast.success('数据导出成功');
    } catch (error) {
      Toast.error('导出失败：' + error.message);
    }
  }

  clearData() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      return;
    }

    if (!confirm('真的确定吗？这将删除所有任务、书签、习惯等数据！')) {
      return;
    }

    try {
      localStorage.clear();
      Toast.success('数据已清空');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      Toast.error('清空失败：' + error.message);
    }
  }

  applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else if (theme === 'light') {
      root.classList.remove('dark-theme');
    } else {
      // auto: 跟随系统
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark-theme');
      } else {
        root.classList.remove('dark-theme');
      }
    }
  }
}

export default SettingsView;
