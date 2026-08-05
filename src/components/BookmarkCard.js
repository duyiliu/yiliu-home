/**
 * 书签卡片组件
 */

import Component from './base/Component.js';

class BookmarkCard extends Component {
  render() {
    const { bookmark, onDelete, onPin } = this.props;

    this.el = this.createElement(
      'article',
      {
        className: `link-card ${bookmark.isPinned ? 'is-pinned' : ''}`,
        dataset: { id: bookmark.id },
        style: bookmark.isPinned ? 'border: 2px solid var(--color-primary);' : '',
      },

      // Link
      this.createElement(
        'a',
        {
          href: bookmark.url,
          target: '_blank',
          rel: 'noreferrer noopener',
          title: bookmark.description || bookmark.title,
        },

        // Favicon
        bookmark.favicon && this.createElement('img', {
          className: 'link-favicon',
          src: bookmark.favicon,
          alt: '',
          onError: (e) => {
            e.target.style.display = 'none';
          },
        }),

        // Title
        this.createElement('strong', {},
          (bookmark.isPinned ? '📌 ' : '') + bookmark.title
        )
      ),

      // Actions container
      this.createElement(
        'div',
        {
          className: 'bookmark-actions',
          style: `
            position: absolute;
            top: -8px;
            right: -8px;
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 150ms ease;
          `,
        },

        // Pin button
        this.createElement(
          'button',
          {
            type: 'button',
            className: 'action-badge',
            'aria-label': bookmark.isPinned ? '取消置顶' : '置顶',
            title: bookmark.isPinned ? '取消置顶' : '置顶',
            style: `
              width: 24px;
              height: 24px;
              padding: 0;
              display: grid;
              place-items: center;
              background: var(--color-accent);
              color: white;
              border: none;
              border-radius: 50%;
              cursor: pointer;
              font-size: 12px;
            `,
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              onPin?.(bookmark.id);
            },
          },
          bookmark.isPinned ? '📌' : '📍'
        ),

        // Delete button
        this.createElement(
          'button',
          {
            type: 'button',
            className: 'delete-badge',
            'aria-label': '删除',
            style: `
              width: 24px;
              height: 24px;
              padding: 0;
              display: grid;
              place-items: center;
              background: var(--color-danger);
              color: white;
              border: none;
              border-radius: 50%;
              cursor: pointer;
              font-size: 18px;
              font-weight: bold;
            `,
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(bookmark.id);
            },
          },
          '×'
        )
      )
    );

    // Hover 效果
    this.el.addEventListener('mouseenter', () => {
      const actions = this.el.querySelector('.bookmark-actions');
      if (actions) actions.style.opacity = '1';
    });

    this.el.addEventListener('mouseleave', () => {
      const actions = this.el.querySelector('.bookmark-actions');
      if (actions) actions.style.opacity = '0';
    });

    return this.el;
  }
}

export default BookmarkCard;
