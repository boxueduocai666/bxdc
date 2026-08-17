/**
 * 液态玻璃博客核心交互脚本
 * 包含：FLIP 零闪烁卡片展开、Clip-path 评论区扩散动画、实时 CSS 变量调控器、本地数据存储
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. FLIP 零闪烁卡片展开/收起逻辑 (Core FLIP Engine)
     ========================================================================== */
  const articleCards = document.querySelectorAll('.article-card');

  articleCards.forEach(card => {
    card.addEventListener('click', function (e) {
      // 避免点击内部的特殊按钮（关闭、评论区、点赞）时误触发全屏展开
      if (
        e.target.classList.contains('close-btn') || 
        e.target.classList.contains('comment-btn') ||
        e.target.closest('.action-btn')
      ) {
        return;
      }

      if (this.classList.contains('is-expanding')) return;

      // [First] 1. 记录初始位置与几何参数
      const rect = this.getBoundingClientRect();

      // [Placeholder] 2. 插入隐形占位符，防止脱离文档流导致周遭组件瞬间跳动塌陷
      const placeholder = document.createElement('div');
      placeholder.className = 'card-placeholder';
      placeholder.style.width = `${rect.width}px`;
      placeholder.style.height = `${rect.height}px`;
      this.parentNode.insertBefore(placeholder, this);

      // [Last] 3. 固定在原始像素位置
      this.style.left = `${rect.left}px`;
      this.style.top = `${rect.top}px`;
      this.style.width = `${rect.width}px`;
      this.style.height = `${rect.height}px`;
      this.classList.add('is-expanding');

      // [Invert] 4. 通知 Body 触发周遭其他模块平滑淡出微缩
      document.body.classList.add('has-active-card');

      // [Play] 5. 嵌套双重 rAF：确保浏览器在下一帧渲染完 fixed 样式后再启动 CSS 渐变动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.style.top = '5vh';
          this.style.left = '5vw';
          this.style.width = '90vw';
          this.style.height = '90vh';
          this.style.borderRadius = '24px';
        });
      });

      // 保存占位符引用到 DOM 节点属性
      this._placeholder = placeholder;
    });
  });

  /**
   * 关闭/收起卡片函数
   * @param {HTMLElement} activeCard 当前处于展开状态的卡片
   */
  function closeCard(activeCard) {
    if (!activeCard || !activeCard.classList.contains('is-expanding')) return;

    const placeholder = activeCard._placeholder;
    if (placeholder) {
      const rect = placeholder.getBoundingClientRect();

      // 1. 卡片平滑飞回原占位符位置
      activeCard.style.top = `${rect.top}px`;
      activeCard.style.left = `${rect.left}px`;
      activeCard.style.width = `${rect.width}px`;
      activeCard.style.height = `${rect.height}px`;

      // 2. 周围模块恢复显示
      document.body.classList.remove('has-active-card');

      // 3. 动画播放结束后清除临时内联样式与占位符
      const onTransitionEnd = function () {
        activeCard.removeEventListener('transitionend', onTransitionEnd);

        activeCard.classList.remove('is-expanding');
        activeCard.style.cssText = '';

        if (placeholder && placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
        }
      };

      activeCard.addEventListener('transitionend', onTransitionEnd);
    }
  }

  // 绑定卡片右上角关闭按钮
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCard(btn.closest('.article-card'));
    });
  });

  // 支持键盘 ESC 键一键关闭卡片或评论区
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeCard = document.querySelector('.article-card.is-expanding');
      if (activeCard) closeCard(activeCard);

      const commentsOverlay = document.getElementById('comments-overlay');
      if (commentsOverlay) commentsOverlay.classList.remove('is-open');
    }
  });


  /* ==========================================================================
     2. 评论区 Clip-Path 扩散动画 (Comments Overlay Engine)
     ========================================================================== */
  const commentsOverlay = document.getElementById('comments-overlay');
  const commentBtns = document.querySelectorAll('.comment-btn');
  const closeCommentsBtn = document.getElementById('close-comments');

  commentBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      // 动态计算点击坐标，使水波纹扩散圆心定位在按钮中心位置
      const clickX = e.clientX;
      const clickY = e.clientY;

      if (commentsOverlay) {
        commentsOverlay.style.setProperty('--click-x', `${clickX}px`);
        commentsOverlay.style.setProperty('--click-y', `${clickY}px`);
        commentsOverlay.classList.add('is-open');
      }
    });
  });

  if (closeCommentsBtn && commentsOverlay) {
    closeCommentsBtn.addEventListener('click', () => {
      commentsOverlay.classList.remove('is-open');
    });
  }


  /* ==========================================================================
     3. 实时视觉调节器与 LocalStorage 本地存储 (Theme Control)
     ========================================================================== */
  const opacityRange = document.getElementById('opacity-range');
  const blurRange = document.getElementById('blur-range');

  // 从本地读取历史保存的样式配置
  const savedOpacity = localStorage.getItem('glass-opacity');
  const savedBlur = localStorage.getItem('glass-blur');

  if (savedOpacity && opacityRange) {
    opacityRange.value = savedOpacity;
    document.documentElement.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${savedOpacity})`);
  }

  if (savedBlur && blurRange) {
    blurRange.value = savedBlur;
    document.documentElement.style.setProperty('--glass-blur', `${savedBlur}px`);
  }

  // 监听滑块拖动事件，实时修改 CSS 自定义变量并写入存储
  if (opacityRange) {
    opacityRange.addEventListener('input', (e) => {
      const val = e.target.value;
      document.documentElement.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${val})`);
      localStorage.setItem('glass-opacity', val);
    });
  }

  if (blurRange) {
    blurRange.addEventListener('input', (e) => {
      const val = e.target.value;
      document.documentElement.style.setProperty('--glass-blur', `${val}px`);
      localStorage.setItem('glass-blur', val);
    });
  }


  /* ==========================================================================
     4. 音频播放器小组件逻辑 (Audio Player Control)
     ========================================================================== */
  const playerBtn = document.querySelector('.player-btn');
  let isPlaying = false;

  if (playerBtn) {
    playerBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playerBtn.textContent = isPlaying ? '❚❚' : '▶';
    });
  }

});

