# 测试文档

## 概述

本项目使用 Jest 作为测试框架，提供了完整的单元测试覆盖。

## 测试结构

```
tests/
├── mqtt-protocol.test.js      # MQTT协议测试
├── config-manager.test.js     # 配置管理器测试
└── mqtt_config_v2.test.js     # 认证配置测试
```

## 安装测试依赖

```bash
npm install
```

这将安装所有依赖，包括 Jest 测试框架。

## 运行测试

### 运行所有测试

```bash
npm test
```

### 监听模式运行测试

```bash
npm run test:watch
```

测试将在文件变化时自动重新运行。

### 生成测试覆盖率报告

```bash
npm run test:coverage
```

覆盖率报告将生成在 `coverage/` 目录中。

### 详细输出模式

```bash
npm run test:verbose
```

## 测试覆盖范围

### mqtt-protocol.test.js

测试 MQTTProtocol 类的所有功能：

- **PacketType 枚举**: 验证所有包类型常量
- **decodeRemainingLength**: 测试剩余长度解码
  - 单字节长度
  - 两字节长度
  - 三字节长度
  - 四字节长度
  - 错误处理
- **encodeRemainingLength**: 测试剩余长度编码
- **sendConnack**: 测试 CONNACK 消息发送
- **sendSuback**: 测试 SUBACK 消息发送
- **sendPingResp**: 测试 PINGRESP 消息发送
- **sendPublish**: 测试 PUBLISH 消息发送
  - QoS 0
  - QoS 1
  - DUP 标志
  - RETAIN 标志
- **parseConnect**: 测试 CONNECT 消息解析
  - 基本连接
  - 带用户名和密码
  - 不支持的协议版本
- **parsePublish**: 测试 PUBLISH 消息解析
  - QoS 0
  - QoS 1
  - DUP 和 RETAIN 标志
- **parseSubscribe**: 测试 SUBSCRIBE 消息解析
- **parsePingReq**: 测试 PINGREQ 消息解析
- **parseDisconnect**: 测试 DISCONNECT 消息解析
- **keepAlive**: 测试心跳功能
- **buffer management**: 测试缓冲区管理
  - 不完整包处理
  - 多包处理
  - 缓冲区清理
- **error handling**: 测试错误处理
  - Socket 错误
  - 连接关闭
  - 协议错误
- **close**: 测试连接关闭

### config-manager.test.js

测试 ConfigManager 类的所有功能：

- **initialization**: 测试初始化
  - 从文件加载配置
  - 创建空配置文件
- **getConfig**: 测试获取配置
  - 返回完整配置对象
  - 返回配置副本
- **get**: 测试获取特定配置项
  - 顶级配置值
  - 嵌套配置值
  - 不存在的键
  - 数组值
  - 数字值
- **configChanged event**: 测试配置变更事件
  - 配置加载时触发
  - 文件修改时触发
  - 内容相同时不触发
- **config hot reload**: 测试配置热重载
  - 文件修改后更新配置
  - 快速多次修改处理
- **error handling**: 测试错误处理
  - 无效 JSON
  - 缺少配置目录
- **config structure**: 测试配置结构
  - 复杂嵌套配置
  - 特殊字符键名
- **event listener management**: 测试事件监听器管理
  - 多个监听器
  - 移除监听器
  - 移除所有监听器
- **debounce behavior**: 测试防抖行为

### mqtt_config_v2.test.js

测试认证配置功能：

- **generatePasswordSignature**: 测试密码签名生成
  - 相同输入生成相同签名
  - 不同内容生成不同签名
  - 不同密钥生成不同签名
  - Base64 编码验证
  - 空内容处理
  - 特殊字符处理
  - Unicode 字符处理
- **validateMqttCredentials**: 测试凭证验证
  - 正确凭证验证
  - 无效密码签名
  - 无效 clientId 格式
  - 空/非空 clientId
  - 空/非空 username
  - 无效 Base64 username
  - MAC 地址转换
  - 复杂 userData 对象
  - 无签名密钥时跳过验证
- **generateMqttConfig**: 测试配置生成
  - 生成有效配置
  - 正确的 clientId 格式
  - Base64 编码的 username
  - 有效的密码签名
  - 无签名密钥时返回 undefined
  - 空 userData 处理
  - 特殊字符处理
  - MAC 地址处理
  - 不同分组 ID
  - 不同 UUID
- **integration tests**: 集成测试
  - 验证生成的配置
  - 修改密码失败
  - 修改 username 失败
  - 修改 clientId 失败
  - 多设备凭证处理

## 测试覆盖率目标

- **语句覆盖率**: > 80%
- **分支覆盖率**: > 75%
- **函数覆盖率**: > 85%
- **行覆盖率**: > 80%

## 编写新测试

### 测试文件命名规范

测试文件应命名为 `<module-name>.test.js`，并放置在 `tests/` 目录中。

### 测试结构示例

```javascript
describe('ModuleName', () => {
  let module;

  beforeEach(() => {
    // 在每个测试前执行
    module = new Module();
  });

  afterEach(() => {
    // 在每个测试后执行
    if (module) {
      module.close();
    }
  });

  describe('methodName', () => {
    it('should do something', () => {
      // 测试逻辑
      expect(module.methodName()).toBe(expectedValue);
    });

    it('should handle error case', () => {
      // 错误处理测试
      expect(() => {
        module.methodName(invalidInput);
      }).toThrow('Expected error message');
    });
  });
});
```

### Mock 对象示例

```javascript
class MockSocket extends EventEmitter {
  constructor() {
    super();
    this.writable = true;
    this.dataWritten = [];
  }

  write(data) {
    this.dataWritten.push(data);
    return true;
  }

  end() {
    this.emit('close');
  }
}
```

### 异步测试示例

```javascript
it('should handle async operation', async () => {
  const result = await module.asyncMethod();
  expect(result).toBe(expectedValue);
});

it('should handle async error', async () => {
  await expect(module.asyncMethod()).rejects.toThrow('Error message');
});

it('should emit event', (done) => {
  module.on('event', (data) => {
    expect(data).toBe(expectedData);
    done();
  });
  
  module.triggerEvent();
});
```

## 持续集成

测试可以在 CI/CD 流水线中自动运行：

```yaml
# GitHub Actions 示例
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 故障排除

### 测试失败

如果测试失败，检查以下几点：

1. **依赖版本**: 确保所有依赖已正确安装
   ```bash
   npm install
   ```

2. **环境变量**: 某些测试可能需要环境变量
   ```bash
   cp .env.example .env
   # 编辑 .env 文件
   ```

3. **端口冲突**: 确保测试端口未被占用

4. **文件权限**: 确保有读写测试文件的权限

### 覆盖率低

如果覆盖率低于预期：

1. 检查哪些代码路径未被测试
2. 添加缺失的测试用例
3. 确保测试覆盖所有分支和边界情况

### 测试超时

如果测试超时：

1. 增加 Jest 超时时间
   ```javascript
   it('should complete', async () => {
     // 测试代码
   }, 10000); // 10秒超时
   ```

2. 检查异步操作是否正确处理

## 最佳实践

1. **测试隔离**: 每个测试应该独立运行，不依赖其他测试
2. **清理资源**: 在 `afterEach` 中清理测试资源
3. **使用 Mock**: 对外部依赖使用 Mock 对象
4. **描述性名称**: 使用描述性的测试名称
5. **测试边界**: 测试边界情况和错误处理
6. **保持简单**: 保持测试简单直接
7. **定期更新**: 定期更新测试以匹配代码变更

## 贡献指南

在提交代码前，请确保：

1. 所有测试通过
2. 测试覆盖率符合要求
3. 新功能包含相应的测试
4. 测试命名清晰且具有描述性

## 相关文档

- [API 文档](./API.md) - 完整的 API 参考
- [README](./README.md) - 项目概述和入门指南
- [Jest 文档](https://jestjs.io/) - Jest 测试框架文档
