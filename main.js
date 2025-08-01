// ==UserScript==
// @name         Better Names
// @namespace    http://tampermonkey.net/
// @version      v5.0.0.rc.3
// @description  Better Names v5.0.0.rc.3
// @author       wwx
// @match        http://*.7fa4.cn:8888/*
// @exclude      http://*.7fa4.cn:9080/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const DEFAULT_MAX_UNITS = 10;
    const storedTitleUnits = GM_getValue('maxTitleUnits', DEFAULT_MAX_UNITS);
    const storedUserUnits  = GM_getValue('maxUserUnits', DEFAULT_MAX_UNITS);
    const maxTitleUnits = (storedTitleUnits === 'none') ? Infinity : parseInt(storedTitleUnits, 10);
    const maxUserUnits  = (storedUserUnits === 'none') ? Infinity : parseInt(storedUserUnits, 10);
    const enableTitleTruncate = isFinite(maxTitleUnits);
    const enableUserTruncate  = isFinite(maxUserUnits);
    const hideAvatar  = GM_getValue('hideAvatar', false);
    const enableCopy  = GM_getValue('enableCopy', false);
    const copyNotify  = GM_getValue('copyNotify', false);
    const hideOrig    = GM_getValue('hideOrig', false);
    const showHook    = GM_getValue('showHook', false);
    const showMedal   = GM_getValue('showMedal', false);
    const enableMenu  = GM_getValue('enableUserMenu', false);
    const enablePlanAdder = GM_getValue('enablePlanAdder', false);
    const initialAutoExit = GM_getValue('planAdder.autoExit', false);
    let autoExit = initialAutoExit;
    const COLOR_KEYS = ['low3','low2','low1', 'is','upp1','upp2','upp3', 'upp4', 'upp5', 'oth'];
    const COLOR_LABELS = {
        low3: '初2025级',
        low2: '初2024级',
        low1: '初2023级',
        is:   '高2025级',
        upp1: '高2024级',
        upp2: '高2023级',
        upp3: '大2025级',
        upp4: '大2024级',
        upp5: '大2023级',
        oth:  '成都七中'
    };
    const GRADE_LABELS = {
        is: '高2025级',
        upp1: '高2024级',
        upp2: '高2023级',
        upp3: '大2025级',
        upp4: '大2024级',
        upp5: '大2023级',
        low3: '初2025级',
        low2: '初2024级',
        low1: '初2023级',
        oth:  '成都七中'
    };
    const storedPalette = JSON.parse(GM_getValue('userPalette', '{}'));
    const useCustomColors = GM_getValue('useCustomColors', false);

    const palettes = {
        light: {
            low3:  '#ff0101',
            low2:  '#ff6629',
            low1:  '#ffbb00',
            upp1:  '#62ca00',
            upp2:  '#00b972',
            upp3:  '#9900ff',
            is:    '#ca00ca',
            oth:   '#5a5a5a',
            upp4:  '#000cff',
            upp5:  '#896e00'
        }
    };

    const palette = Object.assign({}, palettes.light, useCustomColors ? storedPalette : {});

    const css = `
    #bn-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 480px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #bn-container.bn-expanded {
        width: 960px;
    }
    #bn-container * {
        pointer-events: auto;
        box-sizing: border-box;
    }

    @media (max-width: 600px) {
        #bn-container,
        #bn-container.bn-expanded {
            width: calc(100vw - 40px);
        }
        #bn-panel,
        #bn-panel.bn-expanded {
            width: 100%;
        }
    }

    #bn-trigger {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 48px;
        height: 48px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    #bn-trigger:hover {
        background: #f8f9fa;
        border-color: #ccc;
        color: #333;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    #bn-panel {
        position: absolute;
        bottom: 58px;
        right: 0;
        width: 480px;
        padding: 0;
        background: #fff;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        max-height: calc(100vh - 80px);
        overflow-y: auto;
        transform: scale(0.95) translateY(10px);
        transform-origin: bottom right;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

    }
    #bn-panel.bn-show {
        transform: scale(1) translateY(0);
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
    }
    #bn-panel.bn-expanded {
        width: 960px;
    }

    .bn-panel-header {
        position: relative;
        padding: 16px 20px;
        background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
        border-bottom: 1px solid #e9ecef;
    }

    #bn-pin {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #999;
        transition: color 0.2s, transform 0.2s;
    }
    #bn-pin svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
    }
    #bn-pin:hover {
        color: #333;
        transform: scale(1.2);
    }
    #bn-pin.bn-pinned {
        color: #007bff;
        transform: rotate(45deg);
    }

    .bn-panel-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .bn-panel-subtitle {
        font-size: 12px;
        color: #666;
        margin: 4px 0 0 0;
    }

    .bn-panel-content {
        display: flex;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bn-main-content {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        flex: 1;
        min-width: 0;
    }

    .bn-color-sidebar {
        width: 480px;
        background: #fafbfc;
        border-left: 1px solid #e9ecef;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        display: none;
    }

    .bn-color-sidebar.bn-show {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
        display: block;
    }

    .bn-section {
        padding: 12px 16px;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        background: #fff;
        transition: background-color 0.2s ease;
    }
    .bn-section:hover {
        background: rgba(248, 249, 250, 0.6);
    }

    .bn-title {
        font-weight: 600;
        font-size: 14px;
        color: #495057;
        margin: 0 0 10px 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .bn-icon {
        width: 16px;
        height: 16px;
        opacity: 0.7;
        flex-shrink: 0;
    }

    .bn-desc {
        font-size: 12px;
        color: #6c757d;
        margin: 0 0 12px 0;
        line-height: 1.4;
    }

    #bn-panel label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #495057;
        cursor: pointer;
        padding: 4px 0;
        transition: all 0.2s ease;
        border-radius: 6px;
        margin: 0 -4px;
        padding-left: 4px;
        padding-right: 4px;
    }

    #bn-panel label:hover {
        background: rgba(248, 249, 250, 0.8);
        color: #333;
    }

    #bn-panel input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: #007bff;
        cursor: pointer;
        flex-shrink: 0;
    }

    #bn-panel input[type="number"] {
        width: 72px;
        padding: 6px 8px;
        border: 1px solid #ced4da;
        border-radius: 8px;
        font-size: 13px;
        background: #fff;
        margin-bottom: 8px;
        transition: all 0.2s ease;
    }

    #bn-panel input[type="number"]:focus {
        border-color: #007bff;
        outline: none;
        box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        transform: translateY(-1px);
    }

    .bn-btn-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 12px;
    }

    .bn-btn-group.bn-btn-group-4 {
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 6px;
    }

    .bn-btn {
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #ced4da;
        border-radius: 6px;
        cursor: pointer;
        background: #fff;
        color: #495057;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }

    .bn-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
        transition: left 0.5s ease;
    }

    .bn-btn:hover::before {
        left: 100%;
    }

    .bn-btn:hover {
        background: #f8f9fa;
        border-color: #adb5bd;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .bn-btn:active {
        transform: translateY(0);
        transition: all 0.1s ease;
    }

    .bn-btn.bn-btn-primary {
        background: #007bff;
        color: #fff;
        border-color: #007bff;
    }

    .bn-btn.bn-btn-primary:hover {
        background: #0056b3;
        border-color: #0056b3;
        box-shadow: 0 4px 12px rgba(0,123,255,0.3);
    }

    .bn-color-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e9ecef;
        background: #fff;
    }

    .bn-color-title {
        font-size: 14px;
        font-weight: 600;
        color: #495057;
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .bn-color-content {
        padding: 20px;
    }

    .bn-color-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 20px;
    }

    .bn-color-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: #fff;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .bn-color-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(248,249,250,0.8), transparent);
        transition: left 0.6s ease;
    }

    .bn-color-item:hover::before {
        left: 100%;
    }

    .bn-color-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        border-color: #007bff;
    }

    .bn-color-item label {
        font-size: 11px;
        font-weight: 600;
        color: #6c757d;
        min-width: 32px;
        margin: 0;
        padding: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        flex-shrink: 0;
    }

    .bn-color-item input[type="color"] {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
        flex-shrink: 0;
    }

    .bn-color-item input[type="color"]:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .bn-color-item input[type="text"] {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid #ced4da;
        border-radius: 6px;
        font-size: 11px;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        background: #f8f9fa;
        transition: all 0.2s ease;
    }

    .bn-color-item input[type="text"]:focus {
        border-color: #007bff;
        background: #fff;
        box-shadow: 0 0 0 2px rgba(0,123,255,0.1);
        outline: none;
    }

    .bn-color-actions {
        display: flex;
        gap: 8px;
    }

    .bn-color-actions .bn-btn {
        flex: 1;
        padding: 10px 16px;
        font-size: 12px;
    }

    .bn-save-actions {
        display: none;
        padding: 12px 20px;
        border-top: 1px solid #e9ecef;
        background: #fff;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    #bn-copy-options {
        margin-left: 24px;
        display: ${enableCopy ? 'block' : 'none'};
        padding-top: 8px;
        border-top: 1px solid #f0f0f0;
        margin-top: 8px;
        animation: slideDown 0.3s ease-out;
    }

    #bn-plan-options {
        margin-left: 24px;
        display: ${enablePlanAdder ? 'block' : 'none'};
        padding-top: 8px;
        border-top: 1px solid #f0f0f0;
        margin-top: 8px;
        animation: slideDown 0.3s ease-out;
    }

    #bn-title-options, #bn-user-options {
        margin-left: 24px;
        padding-top: 8px;
        border-top: 1px solid #f0f0f0;
        margin-top: 8px;
        animation: slideDown 0.3s ease-out;
    }
    #bn-title-options {
        display: ${enableTitleTruncate ? 'block' : 'none'};
    }
    #bn-user-options {
        display: ${enableUserTruncate ? 'block' : 'none'};
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }

    .bn-medal {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        color: #fff;
        font-size: 9px;
        font-weight: bold;
        vertical-align: middle;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .bn-medal-gold { background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%); }
    .bn-medal-silver { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); }
    .bn-medal-bronze { background: linear-gradient(135deg, #fd7e14 0%, #dc3545 100%); }
    .bn-medal-iron { background: linear-gradient(135deg, #495057 0%, #343a40 100%); }

    #bn-user-menu {
        position: fixed;
        z-index: 10001;
        background: #fff;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 8px 0;
        display: none;
        flex-direction: column;
        min-width: 160px;
        overflow: hidden;
    }
    #bn-user-menu a {
        padding: 10px 16px;
        color: #495057;
        text-decoration: none;
        font-size: 13px;
        white-space: nowrap;
        transition: all 0.2s ease;
        position: relative;
    }
    #bn-user-menu a::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #007bff;
        transform: scaleY(0);
        transition: transform 0.2s ease;
    }
    #bn-user-menu a:hover {
        background: #f8f9fa;
        color: #333;
        padding-left: 20px;
    }
    #bn-user-menu a:hover::before {
        transform: scaleY(1);
    }

    .bn-version {
        text-align: center;
        padding: 12px 20px;
        background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
        border-top: 1px solid #e9ecef;
        font-size: 11px;
        color: #6c757d;
        font-weight: 500;
    }

    /* 图标 SVG */
    .bn-icon-settings { fill: currentColor; }
    .bn-icon-crop { stroke: currentColor; stroke-width: 2; fill: none; }
    .bn-icon-eye { stroke: currentColor; stroke-width: 2; fill: none; }
    .bn-icon-copy { stroke: currentColor; stroke-width: 2; fill: none; }
    .bn-icon-hook { stroke: currentColor; stroke-width: 2; fill: none; }
    .bn-icon-medal { stroke: currentColor; stroke-width: 2; fill: none; }
    .bn-icon-menu { stroke: currentColor; stroke-width: 2; fill: none; }
    .bn-icon-palette { stroke: currentColor; stroke-width: 2; fill: none; }
    .bn-icon-pin { fill: currentColor; }

    /* 响应式 */
    @media (max-width: 600px) {
        #bn-container {
            width: 300px;
            right: 16px;
            bottom: 16px;
        }

        #bn-container.bn-expanded {
            width: calc(100vw - 32px);
            max-width: 520px;
        }

        #bn-panel {
            width: 300px;
        }

        #bn-panel.bn-expanded {
            width: calc(100vw - 32px);
            max-width: 520px;
        }

        .bn-color-sidebar {
            width: 200px;
        }
    }
    `;
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

    const colorInputs = COLOR_KEYS.map(k => `
            <div class="bn-color-item">
                <label>${COLOR_LABELS[k] || k}:</label>
                <input type="color" id="bn-color-${k}" value="${palette[k]}">
                <input type="text" class="bn-color-hex" id="bn-color-${k}-hex" value="${palette[k]}">
            </div>
        `).join('');

    const container = document.createElement('div'); container.id = 'bn-container';
    container.innerHTML = `
      <div id="bn-trigger">⚙️</div>
      <div id="bn-panel">
        <div class="bn-panel-header">
          <div class="bn-panel-title">
            <svg class="bn-icon bn-icon-settings" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Better Names 设置
          </div>
          <div id="bn-pin" title="\u56fa\u5b9a\u9762\u677f">
            <svg class="bn-icon bn-icon-pin" viewBox="0 0 24 24">
              <path d="M16 9V4h1c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1H7c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
            </svg>
          </div>
          <div class="bn-panel-subtitle">Generated By ChatGPT o3, Codex and Manus</div>
        </div>
        <div class="bn-panel-content">
          <div class="bn-main-content">
            <div class="bn-section">
              <div class="bn-title">
                <svg class="bn-icon bn-icon-crop" viewBox="0 0 24 24">
                  <path d="M6.13 1L6 16a2 2 0 002 2h15"/>
                  <path d="M1 6.13L16 6a2 2 0 012 2v15"/>
                </svg>
                截断功能
              </div>
              <label><input type="checkbox" id="bn-enable-title-truncate" ${enableTitleTruncate?'checked':''}/> 启用题目名截断</label>
              <div id="bn-title-options">
                <label>截断长度：<input id="bn-title-input" type="number" min="1" step="1" value="${isFinite(maxTitleUnits)? maxTitleUnits : ''}" placeholder="输入正整数"></label>
              </div>
              <label><input type="checkbox" id="bn-enable-user-truncate" ${enableUserTruncate?'checked':''}/> 启用用户名截断</label>
              <div id="bn-user-options">
                <label>截断长度：<input id="bn-user-input" type="number" min="1" step="1" value="${isFinite(maxUserUnits)? maxUserUnits : ''}" placeholder="输入正整数"></label>
              </div>
            </div>

            <div class="bn-section">
              <div class="bn-title">
                <svg class="bn-icon bn-icon-eye" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                显示选项
              </div>
              <label><input type="checkbox" id="bn-hide-avatar" ${hideAvatar?'checked':''}/> 隐藏用户头像</label>
              <label><input type="checkbox" id="bn-show-hook" ${showHook?'checked':''}/> 显示等级钩子</label>
              <label><input type="checkbox" id="bn-show-medal" ${showMedal?'checked':''}/> 显示 NOI 奖牌</label>
              <label><input type="checkbox" id="bn-enable-user-menu" ${enableMenu?'checked':''}/> 启用用户菜单</label>
            </div>

            <div class="bn-section">
              <div class="bn-title">
                <svg class="bn-icon bn-icon-copy" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                复制功能
              </div>
              <label><input type="checkbox" id="bn-enable-copy" ${enableCopy?'checked':''}/> 启用题面复制</label>
              <div id="bn-copy-options">
                <label><input type="checkbox" id="bn-copy-notify" ${copyNotify?'checked':''}/> 显示复制提示</label>
                <label><input type="checkbox" id="bn-hide-orig" ${hideOrig?'checked':''}/> 隐藏原始按钮</label>
              </div>
            </div>

            <div class="bn-section">
              <div class="bn-title">
                <svg class="bn-icon bn-icon-menu" viewBox="0 0 24 24">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                添加计划
              </div>
              <label><input type="checkbox" id="bn-enable-plan" ${enablePlanAdder?'checked':''}/> 启用添加计划</label>
              <div id="bn-plan-options">
                <label><input type="checkbox" id="bn-plan-auto" ${initialAutoExit?'checked':''}/> 完成后退出</label>
              </div>
            </div>

            <div class="bn-section">
              <div class="bn-title">
                <svg class="bn-icon bn-icon-palette" viewBox="0 0 24 24">
                  <circle cx="13.5" cy="6.5" r=".5"/>
                  <circle cx="17.5" cy="10.5" r=".5"/>
                  <circle cx="8.5" cy="7.5" r=".5"/>
                  <circle cx="6.5" cy="12.5" r=".5"/>
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                </svg>
                颜色配置
              </div>
              <label><input type="checkbox" id="bn-use-custom-color" ${useCustomColors?'checked':''}/> 启用自定义颜色</label>
            </div>
          </div>

          <div class="bn-color-sidebar" id="bn-color-sidebar">
            <div class="bn-color-header">
              <div class="bn-color-title">
                <svg class="bn-icon bn-icon-palette" viewBox="0 0 24 24">
                  <circle cx="13.5" cy="6.5" r=".5"/>
                  <circle cx="17.5" cy="10.5" r=".5"/>
                  <circle cx="8.5" cy="7.5" r=".5"/>
                  <circle cx="6.5" cy="12.5" r=".5"/>
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                </svg>
                自定义颜色
              </div>
            </div>
            <div class="bn-color-content">
              <div class="bn-color-grid">${colorInputs}</div>
              <div class="bn-color-actions">
                <button class="bn-btn" id="bn-color-reset">重置默认</button>
              </div>
            </div>
          </div>
        </div>
        <div class="bn-save-actions" id="bn-save-actions">
          <button class="bn-btn bn-btn-primary" id="bn-save-config">保存配置</button>
          <button class="bn-btn" id="bn-cancel-changes">取消更改</button>
        </div>
        <div class="bn-version">v5.0.0.rc.3</div>
      </div>`;
    document.body.appendChild(container);
    container.style.pointerEvents = 'none';

    const trigger  = document.getElementById('bn-trigger');
    const panel    = document.getElementById('bn-panel');
    const pinBtn   = document.getElementById('bn-pin');
    let pinned   = !!GM_getValue('panelPinned', false);
    const titleInp   = document.getElementById('bn-title-input');
    const userInp    = document.getElementById('bn-user-input');
    const chkTitleTr = document.getElementById('bn-enable-title-truncate');
    const chkUserTr  = document.getElementById('bn-enable-user-truncate');
    const titleOpts  = document.getElementById('bn-title-options');
    const userOpts   = document.getElementById('bn-user-options');
    const chkAv    = document.getElementById('bn-hide-avatar');
    const chkCp    = document.getElementById('bn-enable-copy');
    const chkNt    = document.getElementById('bn-copy-notify');
    const chkHo    = document.getElementById('bn-hide-orig');
    const copyOpts = document.getElementById('bn-copy-options');
    const chkHook  = document.getElementById('bn-show-hook');
    const chkMedal = document.getElementById('bn-show-medal');
    const chkMenu  = document.getElementById('bn-enable-user-menu');
    const chkPlan  = document.getElementById('bn-enable-plan');
    const planOpts = document.getElementById('bn-plan-options');
    const chkPlanAuto = document.getElementById('bn-plan-auto');
    const chkUseColor = document.getElementById('bn-use-custom-color');
    const colorSidebar = document.getElementById('bn-color-sidebar');
    const saveActions = document.getElementById('bn-save-actions');
    const colorPickers = {};
    const hexInputs = {};

    const originalConfig = {
        titleTruncate: enableTitleTruncate,
        userTruncate: enableUserTruncate,
        maxTitleUnits,
        maxUserUnits,
        hideAvatar,
        enableCopy,
        copyNotify,
        hideOrig,
        showHook,
        showMedal,
        enableMenu,
        enablePlanAdder,
        autoExit: initialAutoExit,
        useCustomColors,
        palette: Object.assign({}, palette)
    };


    pinBtn.classList.toggle('bn-pinned', pinned);
    if (pinned) {
        panel.classList.add('bn-show');
        container.style.pointerEvents = 'auto';
    }

    titleOpts.style.display = enableTitleTruncate ? 'block' : 'none';
    userOpts.style.display  = enableUserTruncate ? 'block' : 'none';
    copyOpts.style.display  = enableCopy ? 'block' : 'none';
    planOpts.style.display  = enablePlanAdder ? 'block' : 'none';
    checkChanged();

    // 初始化颜色选择器
    COLOR_KEYS.forEach(k => {
        colorPickers[k] = document.getElementById(`bn-color-${k}`);
        hexInputs[k]    = document.getElementById(`bn-color-${k}-hex`);

        if (colorPickers[k] && hexInputs[k]) {
            // 设置初始值
            colorPickers[k].value = palette[k];
            hexInputs[k].value = palette[k];

            // 绑定事件
            colorPickers[k].oninput = () => {
                hexInputs[k].value = colorPickers[k].value;
                checkChanged();
            };
            hexInputs[k].oninput = () => {
                const v = hexInputs[k].value.trim();
                if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
                    const val = v.startsWith('#') ? v : '#' + v;
                    colorPickers[k].value = val;
                }
                checkChanged();
            };
        }
    });

    chkUseColor.onchange = () => {
        const isChecked = chkUseColor.checked;
        if (isChecked) {
            container.classList.add('bn-expanded');
            panel.classList.add('bn-expanded');
            setTimeout(() => {
                colorSidebar.classList.add('bn-show');
            }, 200);
        } else {
            colorSidebar.classList.remove('bn-show');
            setTimeout(() => {
                container.classList.remove('bn-expanded');
                panel.classList.remove('bn-expanded');
            }, 200);
        }
        checkChanged();
    };

    // 初始化颜色面板状态
    if (useCustomColors) {
        container.classList.add('bn-expanded');
        panel.classList.add('bn-expanded');
        colorSidebar.classList.add('bn-show');
    }

    let hideTimer = null;
    const showPanel = () => {
        clearTimeout(hideTimer);
        panel.classList.add('bn-show');
        container.style.pointerEvents = 'auto';
    };
    const hidePanel = () => {
        if (pinned) return;
        panel.classList.remove('bn-show');
        container.style.pointerEvents = 'none';
        if (panel.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    };
    trigger.addEventListener('mouseenter', showPanel);
    const maybeHidePanel = () => {
        hideTimer = setTimeout(() => {
            if (!pinned &&
                !trigger.matches(':hover') &&
                !panel.matches(':hover') &&
                !container.matches(':hover')) {
                hidePanel();
            }
        }, 300);
    };

    trigger.addEventListener('mouseleave', maybeHidePanel);
    panel.addEventListener('mouseleave', maybeHidePanel);

    pinBtn.addEventListener('click', () => {
        pinned = !pinned;
        GM_setValue('panelPinned', pinned);
        pinBtn.classList.toggle('bn-pinned', pinned);
        if (pinned) {
            showPanel();
        } else if (!trigger.matches(':hover') && !panel.matches(':hover')) {
            hidePanel();
        }
    });

    function checkChanged() {
        const ti = parseInt(titleInp.value, 10);
        const ui = parseInt(userInp.value, 10);
        const paletteChanged = COLOR_KEYS.some(k => {
            return colorPickers[k] &&
                colorPickers[k].value.toLowerCase() !== (originalConfig.palette[k] || '').toLowerCase();
        });
        const changed =
            chkTitleTr.checked !== originalConfig.titleTruncate ||
            chkUserTr.checked !== originalConfig.userTruncate ||
            (chkTitleTr.checked && ti !== originalConfig.maxTitleUnits) ||
            (chkUserTr.checked && ui !== originalConfig.maxUserUnits) ||
            (!chkTitleTr.checked && originalConfig.titleTruncate) ||
            (!chkUserTr.checked && originalConfig.userTruncate) ||
            chkAv.checked !== originalConfig.hideAvatar ||
            chkCp.checked !== originalConfig.enableCopy ||
            chkNt.checked !== originalConfig.copyNotify ||
            chkHo.checked !== originalConfig.hideOrig ||
            chkHook.checked !== originalConfig.showHook ||
            chkMedal.checked !== originalConfig.showMedal ||
            chkMenu.checked !== originalConfig.enableMenu ||
            chkPlan.checked !== originalConfig.enablePlanAdder ||
            chkPlanAuto.checked !== originalConfig.autoExit ||
            chkUseColor.checked !== originalConfig.useCustomColors ||
            paletteChanged;
        saveActions.style.display = changed ? 'flex' : 'none';
    }

    function toggleOption(chk, el) {
        if (chk.checked) {
            el.style.display = 'block';
            el.style.animation = 'slideDown 0.3s ease-out';
        } else {
            el.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => { el.style.display = 'none'; }, 300);
        }
    }

    chkTitleTr.onchange = () => { toggleOption(chkTitleTr, titleOpts); checkChanged(); };
    chkUserTr.onchange  = () => { toggleOption(chkUserTr, userOpts); checkChanged(); };
    titleInp.oninput = checkChanged;
    userInp.oninput = checkChanged;
    chkAv.onchange = checkChanged;
    chkCp.onchange = () => { toggleOption(chkCp, copyOpts); checkChanged(); };
    chkNt.onchange = checkChanged;
    chkHo.onchange = checkChanged;
    chkHook.onchange = checkChanged;
    chkMedal.onchange = checkChanged;
    chkMenu.onchange = checkChanged;
    chkPlan.onchange = () => { toggleOption(chkPlan, planOpts); checkChanged(); };
    chkPlanAuto.onchange = () => { autoExit = chkPlanAuto.checked; checkChanged(); };

    document.getElementById('bn-color-reset').onclick = () => {
        COLOR_KEYS.forEach(k => {
            if (colorPickers[k] && hexInputs[k]) {
                colorPickers[k].value = palettes.light[k];
                hexInputs[k].value = palettes.light[k];
            }
        });
        chkUseColor.checked = true;
        container.classList.add('bn-expanded');
        panel.classList.add('bn-expanded');
        colorSidebar.classList.add('bn-show');
        checkChanged();
    };

    document.getElementById('bn-save-config').onclick = () => {
        if (chkTitleTr.checked) {
            const v = parseInt(titleInp.value, 10);
            if (isNaN(v) || v <= 0) { alert('请输入大于 0 的正整数'); return; }
            GM_setValue('maxTitleUnits', v);
        } else {
            GM_setValue('maxTitleUnits', 'none');
        }
        if (chkUserTr.checked) {
            const v = parseInt(userInp.value, 10);
            if (isNaN(v) || v <= 0) { alert('请输入大于 0 的正整数'); return; }
            GM_setValue('maxUserUnits', v);
        } else {
            GM_setValue('maxUserUnits', 'none');
        }

        GM_setValue('hideAvatar', chkAv.checked);
        GM_setValue('enableCopy', chkCp.checked);
        GM_setValue('copyNotify', chkNt.checked);
        GM_setValue('hideOrig', chkHo.checked);
        GM_setValue('showHook', chkHook.checked);
        GM_setValue('showMedal', chkMedal.checked);
        GM_setValue('enableUserMenu', chkMenu.checked);
        GM_setValue('enablePlanAdder', chkPlan.checked);
        GM_setValue('planAdder.autoExit', chkPlanAuto.checked);
        autoExit = chkPlanAuto.checked;

        const obj = {};
        COLOR_KEYS.forEach(k => {
            if (colorPickers[k]) {
                obj[k] = colorPickers[k].value;
            }
        });
        GM_setValue('userPalette', JSON.stringify(obj));
        GM_setValue('useCustomColors', chkUseColor.checked);
        setTimeout(() => location.reload(), 50);
    };

    document.getElementById('bn-cancel-changes').onclick = () => {
        chkTitleTr.checked = originalConfig.titleTruncate;
        chkUserTr.checked = originalConfig.userTruncate;
        titleInp.value = isFinite(originalConfig.maxTitleUnits) ? originalConfig.maxTitleUnits : '';
        userInp.value = isFinite(originalConfig.maxUserUnits) ? originalConfig.maxUserUnits : '';
        chkAv.checked = originalConfig.hideAvatar;
        chkCp.checked = originalConfig.enableCopy;
        chkNt.checked = originalConfig.copyNotify;
        chkHo.checked = originalConfig.hideOrig;
        chkHook.checked = originalConfig.showHook;
        chkMedal.checked = originalConfig.showMedal;
        chkMenu.checked = originalConfig.enableMenu;
        chkPlan.checked = originalConfig.enablePlanAdder;
        chkPlanAuto.checked = originalConfig.autoExit;
        autoExit = originalConfig.autoExit;
        chkUseColor.checked = originalConfig.useCustomColors;

        titleOpts.style.display = chkTitleTr.checked ? 'block' : 'none';
        userOpts.style.display  = chkUserTr.checked ? 'block' : 'none';
        copyOpts.style.display  = chkCp.checked ? 'block' : 'none';
        planOpts.style.display  = chkPlan.checked ? 'block' : 'none';
        if (chkUseColor.checked) {
            container.classList.add('bn-expanded');
            panel.classList.add('bn-expanded');
            colorSidebar.classList.add('bn-show');
        } else {
            colorSidebar.classList.remove('bn-show');
            container.classList.remove('bn-expanded');
            panel.classList.remove('bn-expanded');
        }
        COLOR_KEYS.forEach(k => {
            if (colorPickers[k] && hexInputs[k]) {
                colorPickers[k].value = originalConfig.palette[k];
                hexInputs[k].value = originalConfig.palette[k];
            }
        });
        checkChanged();
    };

    function fEasierClip() {
        if (!/\/problem\//.test(location.pathname)) return;
        let link = document.querySelector('div.ui.buttons.right.floated > a');
        if (!link) {
            const grids = document.querySelectorAll('div.ui.center.aligned.grid');
            for (const g of grids) {
                const candBox = g.querySelector('div.ui.buttons.right.floated');
                if (candBox && candBox.firstElementChild && candBox.firstElementChild.tagName === 'A') {
                    link = candBox.firstElementChild;
                    break;
                }
            }
        } else if (link.previousSibling) {
            link = link.parentElement && link.parentElement.firstElementChild;
        }
        if (!link) return;
        if (hideOrig) {
            link.style.display = 'none';
        }
        const btn = document.createElement('a');
        btn.className = 'small ui button';
        btn.textContent = '复制题面';
        btn.onclick = async () => {
            try {
                const res = await fetch(location.href + '/markdown/text');
                const text = await res.text();
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                if (copyNotify) {
                    GM_notification({ text: '复制成功！', timeout: 2000 });
                } else {
                    console.log('复制成功！');
                }
            } catch (e) {
                GM_notification({ text: '复制失败：' + e, timeout: 3000 });
            }
        };
        link.parentNode.insertBefore(btn, link);
    }

    function initUserMenu() {
        const menu = document.createElement('div');
        menu.id = 'bn-user-menu';
        menu.innerHTML = `
            <a id="bn-menu-home" href="#">转到主页</a>
            <a id="bn-menu-sub-problem" href="#" style="display:none;">转到该题提交记录</a>
            <a id="bn-menu-sub-all" href="#">转到提交记录</a>
            <a id="bn-menu-plan" href="#">转到计划</a>
        `;
        document.body.appendChild(menu);
        const home = menu.querySelector('#bn-menu-home');
        const subProblem = menu.querySelector('#bn-menu-sub-problem');
        const subAll = menu.querySelector('#bn-menu-sub-all');
        const plan = menu.querySelector('#bn-menu-plan');
        const hide = () => { menu.style.display = 'none'; };
        document.addEventListener('click', hide);
        document.addEventListener('contextmenu', e => {
            const a = e.target.closest('a[href^="/user/"]');
            if (a) {
                const m = a.getAttribute('href').match(/^\/user\/(\d+)/);
                if (m) {
                    e.preventDefault();
                    const uid = m[1];
                    home.href = `/user/${uid}`;
                    let pid = '';
                    let pm = location.search.match(/problem_id=(\d+)/);
                    if (!pm) pm = location.pathname.match(/\/problem\/(\d+)/);
                    if (pm) pid = pm[1];
                    if (pid) {
                        subProblem.style.display = 'block';
                        subProblem.href = `/submissions?contest=&problem_id=${pid}&submitter=${uid}&min_score=0&max_score=100&language=&status=`;
                        subAll.textContent = '转到所有提交记录';
                    } else {
                        subProblem.style.display = 'none';
                        subAll.textContent = '转到提交记录';
                    }
                    subAll.href = `/submissions?contest=&problem_id=&submitter=${uid}&min_score=0&max_score=100&language=&status=`;
                    plan.href = `/user_plans/${uid}`;
                    menu.style.left = e.pageX + 'px';
                    menu.style.top = e.pageY + 'px';
                    menu.style.display = 'flex';
                    return;
                }
            }
            hide();
        });
    }


    const HOOK_GREEN = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="#28a745" style="margin-bottom: -2px; opacity:1;"><path d="M16 8C16 6.84375 15.25 5.84375 14.1875 5.4375C14.6562 4.4375 14.4688 3.1875 13.6562 2.34375C12.8125 1.53125 11.5625 1.34375 10.5625 1.8125C10.1562 0.75 9.15625 0 8 0C6.8125 0 5.8125 0.75 5.40625 1.8125C4.40625 1.34375 3.15625 1.53125 2.34375 2.34375C1.5 3.1875 1.3125 4.4375 1.78125 5.4375C0.71875 5.84375 0 6.84375 0 8C0 9.1875 0.71875 10.1875 1.78125 10.5938C1.3125 11.5938 1.5 12.8438 2.34375 13.6562C3.15625 14.5 4.40625 14.6875 5.40625 14.2188C5.8125 15.2812 6.8125 16 8 16C9.15625 16 10.1562 15.2812 10.5625 14.2188C11.5938 14.6875 12.8125 14.5 13.6562 13.6562C14.4688 12.8438 14.6562 11.5938 14.1875 10.5938C15.25 10.1875 16 9.1875 16 8ZM11.4688 6.625L7.375 10.6875C7.21875 10.8438 7 10.8125 6.875 10.6875L4.5 8.3125C4.375 8.1875 4.375 7.96875 4.5 7.8125L5.3125 7C5.46875 6.875 5.6875 6.875 5.8125 7.03125L7.125 8.34375L10.1562 5.34375C10.3125 5.1875 10.5312 5.1875 10.6562 5.34375L11.4688 6.15625C11.5938 6.28125 11.5938 6.5 11.4688 6.625Z"></path></svg>';
    const HOOK_BLUE  = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="#007bff" style="margin-bottom: -2px; opacity:1;"><path d="M16 8C16 6.84375 15.25 5.84375 14.1875 5.4375C14.6562 4.4375 14.4688 3.1875 13.6562 2.34375C12.8125 1.53125 11.5625 1.34375 10.5625 1.8125C10.1562 0.75 9.15625 0 8 0C6.8125 0 5.8125 0.75 5.40625 1.8125C4.40625 1.34375 3.15625 1.53125 2.34375 2.34375C1.5 3.1875 1.3125 4.4375 1.78125 5.4375C0.71875 5.84375 0 6.84375 0 8C0 9.1875 0.71875 10.1875 1.78125 10.5938C1.3125 11.5938 1.5 12.8438 2.34375 13.6562C3.15625 14.5 4.40625 14.6875 5.40625 14.2188C5.8125 15.2812 6.8125 16 8 16C9.15625 16 10.1562 15.2812 10.5625 14.2188C11.5938 14.6875 12.8125 14.5 13.6562 13.6562C14.4688 12.8438 14.6562 11.5938 14.1875 10.5938C15.25 10.1875 16 9.1875 16 8ZM11.4688 6.625L7.375 10.6875C7.21875 10.8438 7 10.8125 6.875 10.6875L4.5 8.3125C4.375 8.1875 4.375 7.96875 4.5 7.8125L5.3125 7C5.46875 6.875 5.6875 6.875 5.8125 7.03125L7.125 8.34375L10.1562 5.34375C10.3125 5.1875 10.5312 5.1875 10.6562 5.34375L11.4688 6.15625C11.5938 6.28125 11.5938 6.5 11.4688 6.625Z"></path></svg>';
    const HOOK_GOLD  = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="#ffc107" style="margin-bottom: -2px; opacity:1;"><path d="M16 8C16 6.84375 15.25 5.84375 14.1875 5.4375C14.6562 4.4375 14.4688 3.1875 13.6562 2.34375C12.8125 1.53125 11.5625 1.34375 10.5625 1.8125C10.1562 0.75 9.15625 0 8 0C6.8125 0 5.8125 0.75 5.40625 1.8125C4.40625 1.34375 3.15625 1.53125 2.34375 2.34375C1.5 3.1875 1.3125 4.4375 1.78125 5.4375C0.71875 5.84375 0 6.84375 0 8C0 9.1875 0.71875 10.1875 1.78125 10.5938C1.3125 11.5938 1.5 12.8438 2.34375 13.6562C3.15625 14.5 4.40625 14.6875 5.40625 14.2188C5.8125 15.2812 6.8125 16 8 16C9.15625 16 10.1562 15.2812 10.5625 14.2188C11.5938 14.6875 12.8125 14.5 13.6562 13.6562C14.4688 12.8438 14.6562 11.5938 14.1875 10.5938C15.25 10.1875 16 9.1875 16 8ZM11.4688 6.625L7.375 10.6875C7.21875 10.8438 7 10.8125 6.875 10.6875L4.5 8.3125C4.375 8.1875 4.375 7.96875 4.5 7.8125L5.3125 7C5.46875 6.875 5.6875 6.875 5.8125 7.03125L7.125 8.34375L10.1562 5.34375C10.3125 5.1875 10.5312 5.1875 10.6562 5.34375L11.4688 6.15625C11.5938 6.28125 11.5938 6.5 11.4688 6.625Z"></path></svg>';
    const MEDAL_ICONS = {
        gold: '<span class="bn-medal bn-medal-gold">金</span>',
        silver: '<span class="bn-medal bn-medal-silver">银</span>',
        bronze: '<span class="bn-medal bn-medal-bronze">铜</span>',
        iron: '<span class="bn-medal bn-medal-iron">铁</span>'
    };

    function getMedalIcon(type) {
        return MEDAL_ICONS[type] || '';
    }

    function getHookIcon(lv) {
        if (lv <= 0) return '';
        if (lv <= 5) return HOOK_GREEN;
        if (lv <= 7) return HOOK_BLUE;
        return HOOK_GOLD;
    }

    const users = {
        1458: { name: "彭博彦", colorKey: 'low3', hook: 5 },
        966:  { name: "公子文", colorKey: 'low1', hook: 5 },
        882:  { name: "唐若轩", colorKey: 'low1', hook: 6 },
        811:  { name: "杨笑",   colorKey: 'is',   hook: 6 },
        629:  { name: "曹灿",   colorKey: 'oth',  hook: 7 },
        2010: { name: "张恩齐", colorKey: 'is',   hook: 5 },
        2177: { name: "张尽欢", colorKey: 'is',   hook: 6, medal: 'iron' },
        2176: { name: "刘子墨", colorKey: 'is',   hook: 5 },
        994:  { name: "黎莫轩", colorKey: 'upp2', hook: 10, medal: 'gold' },
        34:   { name: "李弩翰", colorKey: 'upp2', hook: 8 },
        1094: { name: "文星杰", colorKey: 'upp1', hook: 8, medal: 'bronze' },
        1179: { name: "赖今羿", colorKey: 'upp1', hook: 7 },
        661:  { name: "国皓语", colorKey: 'upp1', hook: 7 },
        1085: { name: "汪士恒", colorKey: 'upp1', hook: 8, medal: 'bronze' },
        1339: { name: "王海烨", colorKey: 'upp1', hook: 7, medal: 'bronze' },
        1577: { name: "彭赞滔", colorKey: 'upp1', hook: 7 },
        18:   { name: "黄诗哲", colorKey: 'upp1', hook: 7, medal: 'bronze' },
        735:  { name: "宋成宸", colorKey: 'upp1', hook: 7 },
        880:  { name: "陈统峙", colorKey: 'oth',  hook: 9 },
        874:  { name: "陈霖瑄", colorKey: 'is', hook: 7, medal: 'bronze' },
        793:  { name: "孙邦博", colorKey: 'is', hook: 7 },
        890:  { name: "王腾立", colorKey: 'is', hook: 6 },
        1069: { name: "李思阳", colorKey: 'is', hook: 6 },
        878:  { name: "王译萱", colorKey: 'is', hook: 8, medal: 'silver' },
        879:  { name: "张子佩", colorKey: 'is', hook: 8 },
        875:  { name: "程翊宸", colorKey: 'oth', hook: 8, medal: 'bronze' },
        1070: { name: "章正瀚", colorKey: 'low1', hook: 7 },
        887:  { name: "漆小凡", colorKey: 'low1', hook: 7 },
        2317: { name: "张珈源", colorKey: 'upp2', hook: 8, medal: 'bronze' },
        2318: { name: "肖浩宇", colorKey: 'upp1', hook: 8, medal: 'bronze' },
        2337: { name: "张健佳", colorKey: 'upp2', hook: 8, medal: 'bronze' },
        920:  { name: "谭筱丸", colorKey: 'low1', hook: 7 },
        977:  { name: "吴雨翔", colorKey: 'low1', hook: 5 },
        976:  { name: "汪泽浩", colorKey: 'low1', hook: 6 },
        992:  { name: "刘文驭", colorKey: 'low1', hook: 6 },
        974:  { name: "宋泰然", colorKey: 'low1', hook: 6 },
        889:  { name: "梁殿宸", colorKey: 'low1', hook: 6 },
        871:  { name: "张平京渝", colorKey: 'low1', hook: 7 },
        972:  { name: "赖俊岑", colorKey: 'low1', hook: 5 },
        1064: { name: "肖翊",   colorKey: 'low1', hook: 6 },
        1184: { name: "赵淀磊", colorKey: 'low1', hook: 5 },
        991:  { name: "周圣青", colorKey: 'low1', hook: 6 },
        1030: { name: "刘思淇", colorKey: 'low1', hook: 5 },
        808:  { name: "杨谨源", colorKey: 'low1', hook: 6 },
        812:  { name: "曾帅鸣", colorKey: 'low1', hook: 4 },
        981:  { name: "叶柏岑", colorKey: 'low1' },
        1:    { name: "陈许旻", colorKey: 'tch', hook: 10, medal: 'gold' },
        1166: { name: "田亮",   colorKey: 'is',   hook: 7 },
        745:  { name: "陈恒宇", colorKey: 'tch'  },
        2175: { name: "李雪梅", colorKey: 'tch'  },
        2170: { name: "王多灵", colorKey: 'tch',  hook: 4 },
        85:   { name: "程宇轩", colorKey: 'tch',  hook: 7 },
        667:  { name: "钟胡天翔", colorKey: 'tch' },
        1172: { name: "徐苒茨", colorKey: 'tch',  hook: 8, medal: 'bronze' },
        829:  { name: "徐淑君", colorKey: 'tch'  },
        1106: { name: "王思勋", colorKey: 'low3', hook: 6 },
        995:  { name: "彭奕力", colorKey: 'low1', hook: 6 },
        962:  { name: "李卓衡", colorKey: 'low1', hook: 7 },
        1191: { name: "宁亦檬", colorKey: 'is',   hook: 6 },
        792:  { name: "陈泳蒽", colorKey: 'is',   hook: 4 },
        791:  { name: "宋明阳", colorKey: 'is',   hook: 4 },
        785:  { name: "祝煜涵", colorKey: 'is' },
        794:  { name: "施宇翔", colorKey: 'upp1' },
        1481: { name: "杨嘉缘", colorKey: 'upp2', hook: 6 },
        22:   { name: "冯思韬", colorKey: 'upp2', hook: 7 },
        987:  { name: "谢宇轩", colorKey: 'upp2', hook: 5 },
        990:  { name: "严家乐", colorKey: 'upp2', hook: 7 },
        701:  { name: "周星宇", colorKey: 'upp1', hook: 6 },
        918:  { name: "黄浩源", colorKey: 'upp1', hook: 6 },
        881:  { name: "郑凯文", colorKey: 'upp3', hook: 7 },
        666:  { name: "张铭杰", colorKey: 'upp1', hook: 7 },
        135:  { name: "彭博", colorKey: 'is',     hook: 7 },
        1154: { name: "刘楚谦", colorKey: 'is' },
        973:  { name: "马逸逍", colorKey: 'low1' },
        1031: { name: "王炫理", colorKey: 'low2', hook: 7 },
        1157: { name: "陈骏贤", colorKey: 'low2', hook: 7 },
        1045: { name: "李炎泽", colorKey: 'low2', hook: 6 },
        1161: { name: "李泽轩", colorKey: 'low2', hook: 6 },
        1448: { name: "祝晗泽", colorKey: 'low2', hook: 5 },
        1036: { name: "张立言", colorKey: 'low2', hook: 6 },
        1175: { name: "刘佩林", colorKey: 'low2', hook: 6 },
        1108: { name: "黄祺远", colorKey: 'low2', hook: 5 },
        1176: { name: "杨辰瑾", colorKey: 'low2', hook: 6 },
        1177: { name: "姚烨拣", colorKey: 'low2' },
        1037: { name: "刘溯理", colorKey: 'low2', hook: 5 },
        1082: { name: "毛馨仪", colorKey: 'low2', hook: 5 },
        1174: { name: "钟沐霖", colorKey: 'low2', hook: 6 },
        1681: { name: "高云朗", colorKey: 'low2', hook: 5 },
        1171: { name: "徐静丹", colorKey: 'low2', hook: 5 },
        2355: { name: "邓皓轩", colorKey: 'low1', hook: 7 },
        1158: { name: "刘泽宇", colorKey: 'low3', hook: 7 },
        2375: { name: "佘佳霖", colorKey: 'upp1', hook: 4 },
        1150: { name: "黄梓轩", colorKey: 'upp1', hook: 7 },
        1286: { name: "刘晨煜", colorKey: 'low2', hook: 5 },
        758:  { name: "胡越",   colorKey: 'upp3', hook: 8 },
        23:   { name: "黄皓坤", colorKey: 'upp2', hook: 6 },
        867:  { name: "李卓恒", colorKey: 'upp3', hook: 7 },
        709:  { name: "龚信维", colorKey: 'upp3', hook: 7 },
        718:  { name: "吴雨松", colorKey: 'upp4', hook: 9 },
        650:  { name: "李钰曦", colorKey: 'upp4', hook: 9 },
        717:  { name: "蒋宇恒", colorKey: 'upp4', hook: 7 },
        721:  { name: "江来",   colorKey: 'upp4', hook: 6 },
        757:  { name: "邱志匀", colorKey: 'upp4', hook: 7 },
        999:  { name: "聂文涛", colorKey: 'upp2', hook: 5 },
        668:  { name: "张子川", colorKey: 'upp1', hook: 6 },
        152:  { name: "马平川", colorKey: 'upp5', hook: 9, medal: 'silver' },
        151:  { name: "程书涵", colorKey: 'upp5', hook: 9 },
        831:  { name: "王曦田", colorKey: 'upp3', hook: 6 },
        15:   { name: "黄嘉玮", colorKey: 'upp2', hook: 7 }
    };

    function truncateByUnits(str, maxU) {
        if (!isFinite(maxU)) return str;
        let used=0, out='';
        for (const ch of str) {
            const w = ch.charCodeAt(0)>255 ? 2:1;
            if (used + w > maxU) { out += '...'; break; }
            out += ch; used += w;
        }
        return out;
    }

    function processUserLink(a) {
        if (
            a.matches('#user-dropdown > a') ||
            a.matches('#user-dropdown > div > a:nth-child(1)') ||
            a.matches('body > div.ui.fixed.borderless.menu > div > div > a') ||
            a.matches('#form > div > div:nth-child(13) > a')
        ) return;

        const href = a.getAttribute('href');
        const m = href.match(/^\/user\/(\d+)\/?$/);
        if (!m) return;
        const uid  = m[1];
        const info = users[uid];
        if (info && GRADE_LABELS[info.colorKey]) {
            a.setAttribute('title', GRADE_LABELS[info.colorKey]);
        } else {
            a.removeAttribute('title');
        }
        const img  = a.querySelector('img');

        if (img && hideAvatar) img.remove();

        a.querySelectorAll('.bn-icon').forEach(el => el.remove());

        let newHTML;
        if (info) {
            newHTML = (img ? '&nbsp;' : '') + info.name;
            const c = palette[info.colorKey];
            if (c) a.style.color = c;
            if (showHook && info.hook) {
                newHTML += ' <span class="bn-icon" title="OI 程序设计能力评级：' + info.hook + ' 级">' + getHookIcon(info.hook) + '</span>';
            }
            if (showMedal && info.medal) {
                const label = info.medal === 'gold' ? '金牌' : info.medal === 'silver' ? '银牌' : info.medal === 'iron' ? '铁' : '铜牌';
                if (info.medal != 'iron') newHTML += ' <span class="bn-icon" title="NOI奖牌：' + label + '">' + getMedalIcon(info.medal) + '</span>';
                // else newHTML += ' <span class="bn-icon" title="荣誉铁">' + getMedalIcon(info.medal) + '</span>';
            }
        } else {
            let original = '';
            a.childNodes.forEach(n => {
                if (n.nodeType === Node.TEXT_NODE) original += n.textContent;
            });
            original = original.trim();
            newHTML = (img ? '&nbsp;' : '') + truncateByUnits(original, maxUserUnits);
        }

        Array.from(a.childNodes).forEach(n => {
            if (n.nodeType === Node.TEXT_NODE) a.removeChild(n);
        });
        a.insertAdjacentHTML('beforeend', newHTML);
    }

    function processProblemTitle(span) {
        let prefix = '';
        const b = span.querySelector('b');
        if (b) {
            const idText = b.textContent;
            prefix = b.outerHTML + ' ';
        }
        let text = '';
        span.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) text += n.textContent; });
        text = text.trim();
        if (b && text.startsWith(b.textContent)) {
            text = text.slice(b.textContent.length).trim();
        }
        const truncated = truncateByUnits(text, maxTitleUnits);
        Array.from(span.childNodes).forEach(n => { if (n.nodeType === Node.TEXT_NODE) span.removeChild(n); });
        span.innerHTML = prefix + truncated;
    }

    document.querySelectorAll('a[href^="/user/"]').forEach(processUserLink);
    document.querySelectorAll('#vueAppFuckSafari > tbody > tr > td:nth-child(2) > a > span').forEach(processProblemTitle);

    const observer = new MutationObserver(mutations => {
        for (const mut of mutations) {
            mut.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.matches && node.matches('a[href^="/user/"]')) {
                    processUserLink(node);
                }
                if (node.matches && node.matches('#vueAppFuckSafari > tbody > tr > td:nth-child(2) > a > span')) {
                    processProblemTitle(node);
                }
                node.querySelectorAll &&
                    node.querySelectorAll('a[href^="/user/"]').forEach(processUserLink);
                node.querySelectorAll &&
                    node.querySelectorAll('#vueAppFuckSafari > tbody > tr > td:nth-child(2) > a > span').forEach(processProblemTitle);
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (enableCopy) fEasierClip();
    if (enableMenu) initUserMenu();
})();

(function () {
  'use strict';

  
  const CFG = {
    base: 'http://in.7fa4.cn:8888',
    base: 'http://jx.7fa4.cn:8888',
    tzOffsetHours: 8,  
    DEBUG: true,    
    DELIM: '|'         
  };

  const SEL = {
    table:  'table.ui.very.basic.center.aligned.table',
    thead:  'table.ui.very.basic.center.aligned.table thead > tr',
    tbody:  'table.ui.very.basic.center.aligned.table tbody',
    rows:   'table.ui.very.basic.center.aligned.table tbody > tr',
    linkIn: 'a[href^="/problem/"]'
  };

  const KEY = {
    mode:     'planAdder.mode',
    selected: 'planAdder.selected.v4', // [{pid, code}]
    date:     'planAdder.date',
    barPos:   'planAdder.barPos',
    autoExit: 'planAdder.autoExit'
  };

  const enablePlanAdder = GM_getValue('enablePlanAdder', false);
  let modeOn   = !!GM_getValue(KEY.mode, false);
  let selected = new Map(
    (GM_getValue(KEY.selected, []) || [])
      .filter(o => o.code && !/^L/i.test(o.code))
      .map(o => [o.pid, o.code])
  );
  let autoExit = GM_getValue(KEY.autoExit, false);
  let observer = null;

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const log = (...a) => CFG.DEBUG && console.log('[PlanAdder]', ...a);
  const txt = el => (el ? el.textContent.trim() : '');

  const tomorrowISO = () => {
    const d = new Date(); d.setDate(d.getDate()+1);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0,10);
  };

  function patchDatePicker(){
    const install = (input) => {
      if (!input || input.dataset.bnTomorrowInstalled) return;
      input.dataset.bnTomorrowInstalled = '1';
    };

    document.addEventListener('focusin', (e) => {
      const el = e.target;
      if (el && el.tagName === 'INPUT' && el.type === 'date') {
        install(el);
      }
    }, true);
  }
  const offsetStr = h => {
    const s=h>=0?'+':'-', a=Math.abs(h);
    return `${s}${String(Math.floor(a)).padStart(2,'0')}:${String(Math.round((a-Math.floor(a))*60)).padStart(2,'0')}`;
  };
  const dateToEpoch = (iso,tz)=>Math.floor(new Date(`${iso}T00:00:00${offsetStr(tz)}`).getTime()/1000);

  const notify  = m => GM_notification({ text:m, timeout:2600 });
  const persist = () => GM_setValue(KEY.selected,[...selected].map(([pid,code])=>({pid,code})));

  function getUserId(){
    const a = document.querySelector('a[href^="/user_plans/"]');
    return a ? (a.href.match(/\/user_plans\/(\d+)/)||[])[1] : null;
  }

  function codeColIndex(){
    const ths = $$(SEL.thead + ' > th');
    for (let i=0;i<ths.length;i++){
      if (txt(ths[i]).replace(/\s+/g,'').includes('编号')) return i+1;
    }
    return null;
  }
  const pidFromRow  = r => (r.querySelector(SEL.linkIn)?.href.match(/\/problem\/(\d+)/)||[])[1] || null;
  const codeFromRow = r => {
    const idx = codeColIndex();
    if (!idx) return null;
    const td = r.querySelector(`td:nth-child(${idx})`);
    return txt(td?.querySelector('b')||td);
  };
  const skipRow = r => {
    const c = codeFromRow(r);
    return c && /^L/i.test(c);
  };

  function toggleButton(){
    const host = $('.ui.grid .row .four.wide.right.aligned.column') || document.body;
    if ($('#plan-toggle', host)) return;
    const btn = document.createElement('button');
    btn.id='plan-toggle'; btn.className='ui mini button'; btn.style.marginLeft='8px';
    btn.textContent = modeOn?'退出【添加计划】模式':'进入【添加计划】模式';
    btn.onclick = () => { modeOn?exitMode():enterMode(); btn.textContent=modeOn?'退出【添加计划】模式':'进入【添加计划】模式'; };
    host.appendChild(btn);
  }

  function insertSelectColumn(){
    const tr = $(SEL.thead);
    if (tr && !$('#padder-th', tr)){
      const th = document.createElement('th');
      th.id='padder-th'; th.className='collapsing'; th.style.whiteSpace='nowrap';
      th.innerHTML = `<label title="本页全选"><input id="padder-all" type="checkbox" style="vertical-align:middle;"><span style="margin-left:4px;font-weight:normal;">全选</span></label>`;
      tr.prepend(th);
      $('#padder-all').onchange = e=>{
        const on = e.target.checked;
        $$(SEL.rows).forEach(row=>{
          const pid = +pidFromRow(row); if(!pid || skipRow(row)) return;
          let cell = row.querySelector('td.padder-cell');
          if(!cell){ cell=makeCell(row,pid); if(cell) row.prepend(cell); }
          if(!cell) return;
          const cb = cell.firstChild; cb.checked=on;
          toggleSelect(row,pid,on,true);
        });
        count();
      };
    }
    $$(SEL.rows).forEach(row=>{
      const pid = +pidFromRow(row); if(!pid || skipRow(row)) { row.querySelector('td.padder-cell')?.remove(); return; }
      if (!row.querySelector('td.padder-cell')){
        const cell=makeCell(row,pid); if(cell) row.prepend(cell);
      }
      const on = selected.has(pid);
      const cb = row.querySelector('td.padder-cell input');
      if (cb) { cb.checked = on; }
      row.classList.toggle('padder-selected', on);
    });
    syncHeader();
  }
  function makeCell(row,pid){
    if (skipRow(row)) return null;
    const td=document.createElement('td');
    td.className='padder-cell'; td.style.textAlign='center'; td.style.padding='6px';
    td.innerHTML=`<input type="checkbox" style="vertical-align:middle;">`;
    const cb=td.firstChild;
    cb.checked=selected.has(pid);
    cb.onchange=()=>{ toggleSelect(row,pid,cb.checked,false); count(); };
    row.classList.toggle('padder-selected', cb.checked);
    return td;
  }
  function toggleSelect(row,pid,on,fromHeader){
    if (skipRow(row)) return;
    const code = codeFromRow(row) || `#${pid}`;
    on ? selected.set(pid, code) : selected.delete(pid);
    row.classList.toggle('padder-selected', on);
    if(!fromHeader) syncHeader();
    persist();
  }
  function syncHeader(){
    const h=$('#padder-all'); if(!h) return;
    const ids=$$(SEL.rows)
      .filter(r=>!skipRow(r))
      .map(pidFromRow)
      .filter(Boolean)
      .map(Number);
    h.checked = ids.length && ids.every(id=>selected.has(id));
  }

  function clearSelections(){
    selected.clear();
    persist();
    $$('.padder-cell input').forEach(cb=>cb.checked=false);
    $$(SEL.rows).forEach(r=>r.classList.remove('padder-selected'));
    syncHeader();
    count();
  }

  function toolbar(){
    if($('#plan-bar')) return;
    const bar=document.createElement('div'); bar.id='plan-bar';
    bar.innerHTML=`
      <div class="padder">
        <span id="pad-handle" title="拖拽">⠿</span>
        <label>日期：<input type="date" id="pad-date"></label>
        <button class="ui mini button" id="pad-copy">复制编号</button>
        <button class="ui mini button" id="pad-clear">清空</button>
        <button class="ui mini primary button" id="pad-ok">确定（<span id="pad-count">0</span>）</button>
      </div>`;
    document.body.appendChild(bar);

    GM_addStyle(`
      #plan-bar{position:fixed;right:16px;bottom:120px;z-index:9999;background:#fff;border:1px solid #ddd;border-radius:10px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:460px;max-width:90vw;}
      #plan-bar .padder{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
      #pad-handle{cursor:move;opacity:.7}
      th#padder-th,td.padder-cell{width:46px;}
      .padder-selected{background:rgba(0,150,255,.06)!important;}
    `);

    const date=$('#pad-date');
    const tomorrow=tomorrowISO();
    date.min = tomorrow;
    date.value = GM_getValue(KEY.date, tomorrow);
    date.onchange=()=>{ if(date.value<tomorrow) date.value=tomorrow; GM_setValue(KEY.date,date.value); };
    $('#pad-copy').onclick=()=>{ GM_setClipboard(JSON.stringify({date:date.value,codes:[...selected.values()]},null,2)); notify(`已复制 ${selected.size} 个编号`); };
    $('#pad-clear').onclick=()=>{ if(!selected.size||!confirm('确认清空？')) return; clearSelections(); };
    $('#pad-ok').onclick=submitPlan;

    count();
    const pos=GM_getValue(KEY.barPos,null);
    if(pos){ bar.style.left=pos.left; bar.style.top=pos.top; bar.style.right='auto'; bar.style.bottom='auto'; }
    drag(bar, $('#pad-handle'));
  }
  function count(){ const el=$('#pad-count'); if(el) el.textContent=selected.size; }
  function drag(el, handle){
    let sx,sy,sl,st,d=false;
    handle.onmousedown=e=>{
      d=true; sx=e.clientX; sy=e.clientY; const r=el.getBoundingClientRect(); sl=r.left; st=r.top;
      el.style.right='auto'; el.style.bottom='auto';
      window.onmousemove=ev=>{ if(!d) return; const L=Math.max(0,Math.min(window.innerWidth-el.offsetWidth,sl+ev.clientX-sx)); const T=Math.max(0,Math.min(window.innerHeight-el.offsetHeight,st+ev.clientY-sy)); el.style.left=L+'px'; el.style.top=T+'px'; };
      window.onmouseup=()=>{ d=false; window.onmousemove=null; window.onmouseup=null; GM_setValue(KEY.barPos,{left:el.style.left,top:el.style.top}); };
      e.preventDefault();
    };
  }

  function observe(){
    const root=$(SEL.tbody)||document.body;
    observer?.disconnect();
    observer=new MutationObserver(()=>{ if(modeOn) insertSelectColumn(); });
    observer.observe(root,{childList:true,subtree:true});
  }

  function gmFetch(opts){
    return new Promise((res,rej)=>{
      GM_xmlhttpRequest({
        ...opts, withCredentials:true,
        onload:r=>{
          log(opts.method||'GET', opts.url, r.status, (r.responseText||'').slice(0,160));
          r.status>=200&&r.status<300 ? res(r) : rej(new Error(`HTTP ${r.status}: ${(r.responseText||'').slice(0,200)}`));
        },
        onerror:e=>rej(new Error(e.error||'网络错误'))
      });
    });
  }

  async function fetchPlanJSON({ uid, epoch }) {
    const r = await gmFetch({
      url: CFG.base + `/user_plan?user_id=${uid}&date=${epoch}&type=day&format=json`,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Referer': `${CFG.base}/user_plans/${uid}`
      }
    });
    let j = {};
    try { j = JSON.parse(r.responseText || '{}'); } catch {}
    const up = j.user_plan || {};
    const arr = String(up.problem_ids || '')
      .split(/[|,\s]+/)    // 兼容 | / , / 空白 分隔
      .map(x => Number(x))
      .filter(Boolean);
    return { id: up.id || up.plan_id || '', problemIds: arr };
  }

  function buildBody({ id, epoch, uid, values }) {
    const p = new URLSearchParams();
    if (id) p.set('id', String(id));
    p.set('type','day');
    p.set('date', String(epoch));
    p.set('user_id', String(uid));
    p.set('plan',''); p.set('result',''); p.set('tweak','');
    p.set('problem_ids', values.join(CFG.DELIM));  // 用 | 分隔的数字ID
    return p.toString();
  }

  function postPlan(body, uid){
    return gmFetch({
      url: CFG.base + '/user_plan',
      method:'POST',
      data: body,
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With':'XMLHttpRequest',
        'Accept':'application/json',
        'Origin': CFG.base,
      'Referer': `${CFG.base}/user_plans/${uid}`
      }
    });
  }

  function afterSuccess(){
    if(autoExit){
      clearSelections();
      exitMode();
    }
  }

// 常见错误解决方案
// A1: 勾选题目
// B1: 先点顶部“计划”再回来
// B2: 向我们提 issue
// C1: 把 Network 中 POST /user_plan 的 Form Data 与 Response 向我们提 issue

  async function submitPlan(){
    if(!selected.size) return notify('[错误代码 A1] 请先勾选题目');

    const iso   = $('#pad-date')?.value || tomorrowISO();
    const epoch = dateToEpoch(iso, CFG.tzOffsetHours);
    const uid   = getUserId(); if(!uid){ notify('[错误代码 B1] 无法识别 user_id'); return; }

    const addIds = [...selected.keys()].map(Number);
    if(!addIds.length) return notify('[错误代码 B2] 未解析到数字ID');

    if(!confirm(`将提交 ${addIds.length} 个题到 ${iso}？`)) return;

    // 1) 读取现有 plan → id + 已有IDs
    const meta = await fetchPlanJSON({ uid, epoch });
    const planId = meta.id;
    const set = new Set(meta.problemIds);
    addIds.forEach(i=>set.add(i));
    const union = [...set];

    log('planId =', planId || '(空)', 'existing=', meta.problemIds, 'union=', union);

    // 2) 首选：一次性并集（携带 id，problem_ids="id|id|id"）
    try{
      const body = buildBody({ id: planId, epoch, uid, values: union });
      await postPlan(body, uid);
      const after = await fetchPlanJSON({ uid, epoch });
      const ok = union.every(x => after.problemIds.includes(x));
      if (ok) { notify(`保存成功：加入 ${addIds.length} 题（共 ${union.length} 题）`); afterSuccess(); return; }
      log('一次性写入后校验未通过，进入逐条补齐');
    }catch(e){
      log('一次性写入失败：', e.message);
    }

    // 3) 逐条补齐（每次都写“当前并集”，避免覆盖；同样用 | 分隔）
    try{
      for(const id of addIds){
        const latest = await fetchPlanJSON({ uid, epoch });
        const s2 = new Set(latest.problemIds); s2.add(id);
        const body2 = buildBody({ id: latest.id || planId, epoch, uid, values: [...s2] });
        await postPlan(body2, uid);
      }
      const final = await fetchPlanJSON({ uid, epoch });
      const ok2 = union.every(x => final.problemIds.includes(x));
      if (ok2) { notify(`保存成功（逐条补齐）：加入 ${addIds.length} 题（共 ${union.length} 题）`); afterSuccess(); return; }
    }catch(e){
      log('逐条补齐失败：', e.message);
    }

    notify('[错误代码 C1] 提交未生效');
  }

  /* ========= 模式切换 ========= */
  function enterMode(){ modeOn=true; GM_setValue(KEY.mode,true); insertSelectColumn(); toolbar(); observe();
    const b=$('#plan-toggle'); if(b) b.textContent='退出【添加计划】'; }
  function exitMode(){ modeOn=false; GM_setValue(KEY.mode,false);
    $('#plan-bar')?.remove(); $('#padder-th')?.remove();
    $$(SEL.rows).forEach(r=>{ r.classList.remove('padder-selected'); r.querySelector('td.padder-cell')?.remove(); });
    const b=$('#plan-toggle'); if(b) b.textContent='进入【添加计划】'; }

  /* ========= 启动 ========= */
  patchDatePicker();
  const onTagPage = /\/problems\/tag\//.test(location.pathname);
  (function start(){
    if (enablePlanAdder && onTagPage) {
      toggleButton();
      if(modeOn) enterMode();
    } else {
      modeOn = false; GM_setValue(KEY.mode,false);
    }
  })();
})();
