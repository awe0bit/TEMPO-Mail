# Open-source building blocks

TEMPO Mail 不复制现成项目的品牌或整套界面，只在许可证允许的范围内复用维护中的开源组件和协议实现。

客户端会连接自托管的 [Stalwart Mail Server](https://github.com/stalwartlabs/stalwart)，并读取其 JMAP 管理 API 与 `/api/schema` 元数据；Stalwart 由原作者单独授权，本仓库不捆绑或再分发服务器二进制文件。

| 用途 | 项目 | 许可证 |
| --- | --- | --- |
| JMAP 邮件协议 | [OpenPaaS-Suite/jmap-client-ts](https://github.com/OpenPaaS-Suite/jmap-client-ts) | MIT |
| 内容组件与表单 | [callstack/react-native-paper](https://github.com/callstack/react-native-paper) | MIT |
| 大型邮件列表 | [Shopify/flash-list](https://github.com/Shopify/flash-list) | MIT |
| 服务端缓存 | [TanStack/query](https://github.com/TanStack/query) | MIT |
| 本地状态 | [pmndrs/zustand](https://github.com/pmndrs/zustand) | MIT |
| 原生导航 | [expo/router](https://github.com/expo/router) | MIT |
| 原生 SwiftUI 控件 | [expo/expo](https://github.com/expo/expo) 的 `@expo/ui` | MIT |

项目自身只保留 Stalwart 管理扩展适配、账户安全存储、权限映射和页面编排。
