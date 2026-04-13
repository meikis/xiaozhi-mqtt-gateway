# API 文档

## 目录

- [概述](#概述)
- [MQTT协议API](#mqtt协议api)
- [配置管理API](#配置管理api)
- [认证配置API](#认证配置api)
- [设备连接API](#设备连接api)
- [WebSocket桥接API](#websocket桥接api)
- [UDP传输API](#udp传输api)
- [MCP工具API](#mcp工具api)
- [错误处理](#错误处理)
- [事件系统](#事件系统)

---

## 概述

xiaozhi-mqtt-gateway 提供了一套完整的API用于管理MQTT连接、配置、认证和设备通信。本文档详细描述了所有可用的API接口、方法、参数和返回值。

---

## MQTT协议API

### MQTTProtocol类

MQTT协议处理类，负责MQTT协议的解析和封装，以及心跳维持。

#### 构造函数

```javascript
new MQTTProtocol(socket, configManager)
```

**参数：**
- `socket` (Object): TCP socket连接对象
- `configManager` (ConfigManager): 配置管理器实例

**示例：**
```javascript
const { MQTTProtocol } = require('./mqtt-protocol');
const protocol = new MQTTProtocol(socket, configManager);
```

#### 方法

##### decodeRemainingLength(buffer)

解析MQTT报文中的Remaining Length字段。

**参数：**
- `buffer` (Buffer): 消息缓冲区

**返回值：**
- `{ value: number, bytesRead: number }`: 包含解析的值和读取的字节数

**示例：**
```javascript
const result = protocol.decodeRemainingLength(buffer);
console.log(result.value); // 剩余长度值
console.log(result.bytesRead); // 读取的字节数
```

##### encodeRemainingLength(length)

编码MQTT报文中的Remaining Length字段。

**参数：**
- `length` (number): 要编码的长度值

**返回值：**
- `{ bytes: Buffer, bytesLength: number }`: 包含编码后的字节和字节长度

**示例：**
```javascript
const result = protocol.encodeRemainingLength(100);
console.log(result.bytes); // 编码后的字节
console.log(result.bytesLength); // 字节长度
```

##### sendConnack(returnCode, sessionPresent)

发送CONNACK消息。

**参数：**
- `returnCode` (number): 返回码，默认为0
  - 0: 连接成功
  - 1: 不支持的协议版本
  - 2: 不支持的客户端ID
  - 3: 服务不可用
  - 4: 错误的用户名或密码
  - 5: 未授权
- `sessionPresent` (boolean): 会话存在标志，默认为false

**示例：**
```javascript
protocol.sendConnack(0, false); // 连接成功
protocol.sendConnack(1, false); // 不支持的协议版本
```

##### sendSuback(packetId, returnCode)

发送SUBACK消息。

**参数：**
- `packetId` (number): 包ID
- `returnCode` (number): 返回码，默认为0

**示例：**
```javascript
protocol.sendSuback(1234, 0);
```

##### sendPingResp()

发送PINGRESP消息。

**示例：**
```javascript
protocol.sendPingResp();
```

##### sendPublish(topic, payload, qos, dup, retain, packetId)

发送PUBLISH消息。

**参数：**
- `topic` (string): 主题
- `payload` (string): 有效载荷
- `qos` (number): QoS级别，默认为0
- `dup` (boolean): 重复标志，默认为false
- `retain` (boolean): 保留标志，默认为false
- `packetId` (number): 包ID（仅QoS > 0时需要）

**示例：**
```javascript
protocol.sendPublish('devices/p2p/aa_bb_cc_dd_ee_ff', '{"type":"hello"}', 0);
```

##### getLastActivity()

获取上次活动时间。

**返回值：**
- `number`: 上次活动的时间戳（毫秒）

**示例：**
```javascript
const lastActivity = protocol.getLastActivity();
```

##### getKeepAliveInterval()

获取心跳间隔。

**返回值：**
- `number`: 心跳间隔（毫秒）

**示例：**
```javascript
const interval = protocol.getKeepAliveInterval();
```

##### clearBuffer()

清空缓冲区。

**示例：**
```javascript
protocol.clearBuffer();
```

##### close()

关闭连接。

**示例：**
```javascript
protocol.close();
```

#### 事件

##### connect

当客户端连接时触发。

**事件数据：**
```javascript
{
  clientId: string,
  protocol: string,
  protocolLevel: number,
  keepAlive: number,
  username: string,
  password: string,
  cleanSession: boolean
}
```

##### publish

当收到发布消息时触发。

**事件数据：**
```javascript
{
  topic: string,
  payload: string,
  qos: number,
  dup: boolean,
  retain: boolean,
  packetId: number
}
```

##### subscribe

当收到订阅请求时触发。

**事件数据：**
```javascript
{
  packetId: number,
  topic: string,
  qos: number
}
```

##### disconnect

当收到断开连接请求时触发。

##### close

当连接关闭时触发。

##### error

当发生错误时触发。

**事件数据：**
- `err` (Error): 错误对象

##### protocolError

当发生协议错误时触发。

**事件数据：**
- `err` (Error): 错误对象

---

## 配置管理API

### ConfigManager类

配置管理器，支持配置文件加载、热更新和事件通知。

#### 构造函数

```javascript
new ConfigManager(fileName)
```

**参数：**
- `fileName` (string): 配置文件名（相对于config目录）

**示例：**
```javascript
const { ConfigManager } = require('./utils/config-manager');
const configManager = new ConfigManager('mqtt.json');
```

#### 方法

##### getConfig()

获取整个配置对象。

**返回值：**
- `Object`: 配置对象

**示例：**
```javascript
const config = configManager.getConfig();
```

##### get(key)

获取特定配置项。

**参数：**
- `key` (string): 配置项键名，支持点号分隔的嵌套键

**返回值：**
- `any`: 配置项值

**示例：**
```javascript
const debug = configManager.get('debug');
const chatServers = configManager.get('production.chat_servers');
```

#### 事件

##### configChanged

当配置文件发生变化时触发。

**事件数据：**
- `config` (Object): 新的配置对象

**示例：**
```javascript
configManager.on('configChanged', (config) => {
  console.log('配置已更新:', config);
});
```

---

## 认证配置API

### 函数

#### generatePasswordSignature(content, secretKey)

生成密码签名。

**参数：**
- `content` (string): 要签名的内容
- `secretKey` (string): 密钥

**返回值：**
- `string`: Base64编码的签名

**示例：**
```javascript
const { generatePasswordSignature } = require('./utils/mqtt_config_v2');
const signature = generatePasswordSignature('client-id|username', 'secret-key');
```

#### validateMqttCredentials(clientId, username, password)

验证MQTT凭证。

**参数：**
- `clientId` (string): 客户端ID，格式为 `GID_xxx@@@mac_address@@@uuid`
- `username` (string): Base64编码的JSON用户数据
- `password` (string): 密码签名

**返回值：**
```javascript
{
  groupId: string,
  macAddress: string,
  uuid: string,
  userData: Object
}
```

**异常：**
- `Error`: 当凭证验证失败时抛出

**示例：**
```javascript
const { validateMqttCredentials } = require('./utils/mqtt_config_v2');
try {
  const credentials = validateMqttCredentials(clientId, username, password);
  console.log('验证成功:', credentials);
} catch (error) {
  console.error('验证失败:', error.message);
}
```

#### generateMqttConfig(groupId, macAddress, uuid, userData)

生成MQTT配置。

**参数：**
- `groupId` (string): 分组ID
- `macAddress` (string): MAC地址（格式：aa:bb:cc:dd:ee:ff）
- `uuid` (string): 设备UUID
- `userData` (Object): 用户数据

**返回值：**
```javascript
{
  endpoint: string,
  port: number,
  client_id: string,
  username: string,
  password: string,
  publish_topic: string,
  subscribe_topic: string
}
```

**示例：**
```javascript
const { generateMqttConfig } = require('./utils/mqtt_config_v2');
const config = generateMqttConfig(
  'GID_test',
  'aa:bb:cc:dd:ee:ff',
  '36c98363-3656-43cb-a00f-8bced2391a90',
  { ip: '192.168.1.1' }
);
```

---

## 设备连接API

### MQTTConnection类

MQTT连接类，负责应用层逻辑处理。

#### 构造函数

```javascript
new MQTTConnection(socket, connectionId, server)
```

**参数：**
- `socket` (Object): TCP socket连接对象
- `connectionId` (number): 连接ID
- `server` (MQTTServer): MQTT服务器实例

#### 方法

##### sendMqttMessage(payload)

发送MQTT消息。

**参数：**
- `payload` (string): 消息内容（JSON字符串）

**示例：**
```javascript
connection.sendMqttMessage(JSON.stringify({
  type: 'hello',
  version: 3
}));
```

##### sendUdpMessage(payload, timestamp)

发送UDP消息。

**参数：**
- `payload` (Buffer): 消息内容
- `timestamp` (number): 时间戳

**示例：**
```javascript
connection.sendUdpMessage(audioBuffer, Date.now());
```

##### checkKeepAlive()

检查心跳超时。

**示例：**
```javascript
connection.checkKeepAlive();
```

##### close()

关闭连接。

**示例：**
```javascript
connection.close();
```

##### isAlive()

检查连接是否存活。

**返回值：**
- `boolean`: 连接是否存活

**示例：**
```javascript
if (connection.isAlive()) {
  console.log('连接正常');
}
```

#### 事件

##### connect

当客户端连接时触发。

##### publish

当收到发布消息时触发。

##### subscribe

当收到订阅请求时触发。

##### disconnect

当收到断开连接请求时触发。

##### close

当连接关闭时触发。

---

## WebSocket桥接API

### WebSocketBridge类

WebSocket桥接类，负责与聊天服务器的通信。

#### 构造函数

```javascript
new WebSocketBridge(connection, protocolVersion, macAddress, uuid, userData)
```

**参数：**
- `connection` (MQTTConnection): MQTT连接实例
- `protocolVersion` (number): 协议版本
- `macAddress` (string): MAC地址
- `uuid` (string): 设备UUID
- `userData` (Object): 用户数据

#### 方法

##### connect(audio_params, features)

连接到聊天服务器。

**参数：**
- `audio_params` (Object): 音频参数
- `features` (Object): 设备特性

**返回值：**
- `Promise<Object>`: 连接响应

**示例：**
```javascript
const response = await bridge.connect({
  sample_rate: 16000,
  channels: 1
}, {
  noise_suppression: true
});
```

##### sendJson(message)

发送JSON消息。

**参数：**
- `message` (Object): 消息对象

**示例：**
```javascript
bridge.sendJson({
  type: 'text',
  content: 'Hello'
});
```

##### sendAudio(opus, timestamp)

发送音频数据。

**参数：**
- `opus` (Buffer): Opus编码的音频数据
- `timestamp` (number): 时间戳

**示例：**
```javascript
bridge.sendAudio(audioBuffer, Date.now());
```

##### isAlive()

检查连接是否存活。

**返回值：**
- `boolean`: 连接是否存活

**示例：**
```javascript
if (bridge.isAlive()) {
  console.log('WebSocket连接正常');
}
```

##### close()

关闭连接。

**示例：**
```javascript
bridge.close();
```

#### 事件

##### close

当连接关闭时触发。

---

## UDP传输API

### UDP消息格式

UDP消息使用16字节头部：

```
| 版本(1) | 长度(2) | 连接ID(4) | 时间戳(4) | 序列号(4) | 加密数据 |
```

### 方法

#### sendUdpMessage(message, remoteAddress)

发送UDP消息。

**参数：**
- `message` (Buffer): 消息内容
- `remoteAddress` (Object): 远程地址对象

**示例：**
```javascript
server.sendUdpMessage(encryptedMessage, {
  address: '192.168.1.100',
  port: 8884
});
```

#### onUdpMessage(rinfo, message, payloadLength, timestamp, sequence)

处理接收到的UDP消息。

**参数：**
- `rinfo` (Object): 远程地址信息
- `message` (Buffer): 完整消息
- `payloadLength` (number): 载荷长度
- `timestamp` (number): 时间戳
- `sequence` (number): 序列号

**示例：**
```javascript
connection.onUdpMessage(rinfo, message, payloadLength, timestamp, sequence);
```

---

## MCP工具API

### 方法

#### initializeDeviceTools()

初始化设备工具。

**返回值：**
- `Promise<void>`

**示例：**
```javascript
await connection.initializeDeviceTools();
```

#### sendMcpRequest(method, params)

发送MCP请求。

**参数：**
- `method` (string): 方法名
- `params` (Object): 参数

**返回值：**
- `Promise<any>`: 请求结果

**示例：**
```javascript
const result = await connection.sendMcpRequest('tools/list', { cursor: undefined });
```

#### onMcpMessageFromBridge(message)

处理从桥接接收到的MCP消息。

**参数：**
- `message` (Object): MCP消息对象

**示例：**
```javascript
connection.onMcpMessageFromBridge({
  type: 'mcp',
  payload: { jsonrpc: '2.0', method: 'initialize', id: 1 }
});
```

---

## 错误处理

### 错误类型

#### 协议错误

```javascript
{
  name: 'ProtocolError',
  message: '未处理的包类型: 15',
  code: 'PROTOCOL_ERROR'
}
```

#### 认证错误

```javascript
{
  name: 'AuthenticationError',
  message: '密码签名验证失败',
  code: 'AUTH_FAILED'
}
```

#### 配置错误

```javascript
{
  name: 'ConfigError',
  message: '配置文件格式错误',
  code: 'CONFIG_ERROR'
}
```

### 错误处理示例

```javascript
try {
  const credentials = validateMqttCredentials(clientId, username, password);
} catch (error) {
  if (error.message.includes('密码签名验证失败')) {
    console.error('认证失败:', error.message);
  } else {
    console.error('未知错误:', error);
  }
}
```

---

## 事件系统

### 事件监听

#### 添加监听器

```javascript
protocol.on('connect', (data) => {
  console.log('客户端连接:', data.clientId);
});
```

#### 移除监听器

```javascript
const handler = (data) => {
  console.log('消息:', data);
};
protocol.on('publish', handler);
protocol.removeListener('publish', handler);
```

#### 移除所有监听器

```javascript
protocol.removeAllListeners('publish');
```

### 事件类型

| 事件名 | 触发时机 | 事件数据 |
|--------|----------|----------|
| connect | 客户端连接 | 连接信息对象 |
| publish | 收到发布消息 | 消息对象 |
| subscribe | 收到订阅请求 | 订阅信息对象 |
| disconnect | 收到断开请求 | 无 |
| close | 连接关闭 | 无 |
| error | 发生错误 | Error对象 |
| protocolError | 协议错误 | Error对象 |
| configChanged | 配置更新 | 新配置对象 |

---

## 使用示例

### 完整的设备连接流程

```javascript
const { MQTTProtocol } = require('./mqtt-protocol');
const { ConfigManager } = require('./utils/config-manager');

// 创建配置管理器
const configManager = new ConfigManager('mqtt.json');

// 创建协议处理器
const protocol = new MQTTProtocol(socket, configManager);

// 监听连接事件
protocol.on('connect', (data) => {
  console.log('客户端连接:', data.clientId);
  
  // 发送CONNACK
  protocol.sendConnack(0, false);
});

// 监听发布消息
protocol.on('publish', (data) => {
  console.log('收到消息:', data.topic, data.payload);
  
  // 处理hello消息
  const message = JSON.parse(data.payload);
  if (message.type === 'hello') {
    // 处理握手
    handleHelloMessage(message);
  }
});

// 监听订阅请求
protocol.on('subscribe', (data) => {
  console.log('订阅主题:', data.topic);
  protocol.sendSuback(data.packetId, 0);
});

// 监听心跳
protocol.on('publish', (data) => {
  if (data.topic === 'ping') {
    protocol.sendPingResp();
  }
});

// 监听断开连接
protocol.on('disconnect', () => {
  console.log('客户端断开连接');
});

// 监听错误
protocol.on('error', (err) => {
  console.error('连接错误:', err);
});
```

### 配置热更新

```javascript
const configManager = new ConfigManager('mqtt.json');

configManager.on('configChanged', (config) => {
  console.log('配置已更新');
  
  // 更新调试模式
  if (config.debug) {
    debug.enable('mqtt-server');
  } else {
    debug.disable();
  }
  
  // 获取新的聊天服务器列表
  const chatServers = config.get('production.chat_servers');
  console.log('聊天服务器:', chatServers);
});
```

### 设备认证

```javascript
const { generateMqttConfig, validateMqttCredentials } = require('./utils/mqtt_config_v2');

// 生成设备配置
const config = generateMqttConfig(
  'GID_test',
  'aa:bb:cc:dd:ee:ff',
  '36c98363-3656-43cb-a00f-8bced2391a90',
  { ip: '192.168.1.1', userId: 'user123' }
);

// 验证设备凭证
try {
  const credentials = validateMqttCredentials(
    config.client_id,
    config.username,
    config.password
  );
  console.log('验证成功:', credentials);
} catch (error) {
  console.error('验证失败:', error.message);
}
```

---

## 附录

### MQTT协议版本

| 协议级别 | 版本名称 | 支持状态 |
|----------|----------|----------|
| 3 | MQTT 3.0 | 不支持 |
| 4 | MQTT 3.1.1 | 支持 |

### QoS级别

| QoS级别 | 名称 | 支持状态 |
|---------|------|----------|
| 0 | 最多一次 | 支持 |
| 1 | 至少一次 | 不支持 |
| 2 | 恰好一次 | 不支持 |

### 返回码

| 返回码 | 描述 |
|--------|------|
| 0 | 连接成功 |
| 1 | 不支持的协议版本 |
| 2 | 不支持的客户端ID |
| 3 | 服务不可用 |
| 4 | 错误的用户名或密码 |
| 5 | 未授权 |

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| MQTT_PORT | MQTT服务器端口 | 1883 |
| UDP_PORT | UDP服务器端口 | 同MQTT_PORT |
| PUBLIC_IP | 服务器公网IP | mqtt.xiaozhi.me |
| MQTT_SIGNATURE_KEY | 密码签名密钥 | - |
| MQTT_ENDPOINT | MQTT端点地址 | - |

---

## 更新日志

### v1.0.0
- 初始版本
- 支持MQTT 3.1.1协议
- 支持UDP音频传输
- 支持WebSocket桥接
- 支持MCP工具协议
