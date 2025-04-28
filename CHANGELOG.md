## 3.0.5

### 💻界面

- 新导入的脚本将添加到末尾而不是开头
- 在脚本编辑界面新建按钮将默认是启用的

### 📚脚本库

**内置库:**

- 新增 `预设防误触` 脚本, 启用后将锁定预设除了 '流式传输'、'请求思维链' 和 '具体条目' 以外的选项, 不能通过界面来修改

### ⏫功能

**世界书条目操作:**

- 新增 `replaceLorebookEntries` 和 `updateLorebookEntriesWith` 函数, 相比于原来的 `setLorebookEntries` 等函数更方便

  ```typescript
  // 禁止所有条目递归, 保持其他设置不变
  const entries = await getLorebookEntries("eramgt少女歌剧");
  await replaceLorebookEntries("eramgt少女歌剧", entries.map(entry => ({ ...entry, prevent_recursion: true })));
  ```

  ```typescript
  // 删除所有名字中包含 `神乐光` 的条目
  const entries = await getLorebookEntries("eramgt少女歌剧");
  _.remove(entries, entry => entry.comment.includes('神乐光'));
  await replaceLorebookEntries("eramgt少女歌剧", entries);
  ```

- 新增 `createLorebookEntry` 和 `deleteLorebookEntry` 的数组版本: `createLorebookEntries` 和 `deleteLorebookEntries`

### 🐛修复

- 部分函数不兼容以前版本的问题

## 3.0.4

### 🐛修复

- 深度输入框为0时无法正确加载
- 快速回复代码编辑界面在开启前端优化时无法正确显示

## 3.0.3

### 💻界面

- 现在脚本导入发生冲突时, 将可以选择是 '新建脚本' 还是 '覆盖原脚本'.

### 📚脚本库

**内置库:**

- 让`标签化`能开关酒馆助手脚本

### 🐛修复

- 在没有打开角色卡时 `replaceTavernRegexes` 意外报错

## 3.0.2

### 📚脚本库

**内置库:**

- 优化了`标签化`的执行速度
- 让`自动关闭前端卡不兼容选项`也会关闭 "在响应中显示标签"
- 添加了`样式加载`脚本
- 添加了`资源预载`脚本

### ⏫功能

- 新增 `getScriptId` 函数, 可以在脚本中获取脚本的唯一 id

- `getVariables` 等变量操作现在支持获取和修改绑定在角色卡的变量, 你也可以在酒馆助手 "脚本库" 设置界面的 "变量" 按钮手动修改角色卡变量.

  ```typescript
  const variables = getVariables({type: 'character'});
  ```

- `getVariables` 等变量操作现在支持获取和修改某层消息楼层的变量，并支持负数来获取倒数楼层的变量（如 `-1` 为最新一条消息）

  ```typescript
  const variables = getVariables({type: 'message', message_id: -1});
  ```

- `getChatMessage` 和 `setChatMessage` 也支持了用负数来获取倒数楼层

### 🐛修复

- 实时修改监听器不能监听脚本

## 3.0.1

### 🐛修复

- 部分函数无法正常使用
- 音频播放器无法正常播放
- getCharacterRegexes在不选择角色时错误抛出异常

## 3.0.0

### 💻全新用户界面

- 重新设计了整体界面布局，各功能模块独立控制启用

### ⏫版本管理

- 扩展启动时自动检查版本并提示更新，点击更新按钮可查看最新版本到本地版本的更新日志

### 📚脚本库功能

- 新增脚本库功能，支持脚本的统一管理
- 提供脚本导入导出功能
- 脚本可与角色卡一同导出，导入角色卡时自动导入脚本
- 新增绑定到角色卡的变量，可被扩展读取及与角色卡一同导出
- 内置库中拥有扩展提供的实用功能脚本

### 🔌扩展性增强

- 将酒馆助手核心函数注册到全局作用域
- 支持其他扩展插件调用酒馆助手的功能

### ✍️写卡体验提升

> 具体教程编写中，目前在Discord帖子 [用酒馆助手编写角色卡的VSCode/Cursor环境搭建](https://discord.com/channels/1134557553011998840/1320081111451439166/1354125905848569958) 有简单使用方法说明

- 支持真实时修改，只需要在软件中修改代码，酒馆就会立即更新内容
- 支持拆分文件编写，为界面不同功能拆分逻辑
- 支持使用 package.json 自行加入第三方库
