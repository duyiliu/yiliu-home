/**
 * 书签网格组件
 */

import Component from './base/Component.js';
import BookmarkCard from './BookmarkCard.js';

class BookmarkGrid extends Component {
  render() {
    const { bookmarks = [], onDelete, onPin } = this.props;

    // 清空旧的子组件
    this.children.forEach(child => child.destroy?.());
    this.children = [];

    // 创建容器
    this.el = this.createElement('div', { className: 'link-grid' });

    if (bookmarks.length === 0) {
      this.el.className = 'link-grid empty-state';
      this.el.textContent = '没有书签，点击上方添加按钮开始';
      return this.el;
    }

    // 排序：置顶在前
    const sorted = [...bookmarks].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    // 渲染书签卡片
    sorted.forEach(bookmark => {
      const card = new BookmarkCard({
        bookmark,
        onDelete,
        onPin,
      });

      this.children.push(card);
      this.el.appendChild(card.render());
    });

    return this.el;
  }
}

export default BookmarkGrid;
