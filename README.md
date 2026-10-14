# 强电检修机械臂虚拟仿真实验

本仓库为课程实验的独立介绍网站，使用原生 HTML、CSS 与 JavaScript 构建，可直接通过 GitHub Pages 发布。

网站只承担项目介绍与教学演示。实际 Streamlit 实验程序独立运行，其访问地址统一配置在 `config.js`：

```javascript
window.SITE_CONFIG = {
  streamlitAppUrl: "https://your-app.streamlit.app"
};
```

在 GitHub Pages 中将发布源设置为 `main` 分支根目录即可。
