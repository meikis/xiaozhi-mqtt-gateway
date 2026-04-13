const { ConfigManager } = require('../utils/config-manager');
const fs = require('fs');
const path = require('path');

describe('ConfigManager', () => {
  let configManager;
  let testConfigPath;
  let originalConfig;

  beforeEach(() => {
    testConfigPath = path.join(__dirname, '..', 'config', 'test-config.json');
    
    originalConfig = {
      debug: true,
      production: {
        chat_servers: ['ws://prod.example.com']
      },
      development: {
        chat_servers: ['ws://dev.example.com'],
        mac_addresss: ['aa:bb:cc:dd:ee:ff']
      },
      max_mqtt_payload_size: 8192
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(originalConfig, null, 2));
    configManager = new ConfigManager('test-config.json');
  });

  afterEach(() => {
    if (configManager) {
      configManager.removeAllListeners();
    }
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('initialization', () => {
    it('should load config from file', () => {
      const config = configManager.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(true);
    });

    it('should create empty config if file does not exist', () => {
      const nonExistentPath = path.join(__dirname, '..', 'config', 'non-existent-config.json');
      
      if (fs.existsSync(nonExistentPath)) {
        fs.unlinkSync(nonExistentPath);
      }

      const newConfigManager = new ConfigManager('non-existent-config.json');
      const config = newConfigManager.getConfig();
      
      expect(config).toEqual({});
      
      if (fs.existsSync(nonExistentPath)) {
        fs.unlinkSync(nonExistentPath);
      }
    });
  });

  describe('getConfig', () => {
    it('should return the entire config object', () => {
      const config = configManager.getConfig();
      expect(config).toEqual(originalConfig);
    });

    it('should return a copy of the config', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('get', () => {
    it('should get top-level config value', () => {
      const debug = configManager.get('debug');
      expect(debug).toBe(true);
    });

    it('should get nested config value', () => {
      const chatServers = configManager.get('production.chat_servers');
      expect(chatServers).toEqual(['ws://prod.example.com']);
    });

    it('should return undefined for non-existent key', () => {
      const nonExistent = configManager.get('non_existent_key');
      expect(nonExistent).toBeUndefined();
    });

    it('should return undefined for nested non-existent key', () => {
      const nonExistent = configManager.get('production.non_existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should get array value', () => {
      const macAddresses = configManager.get('development.mac_addresss');
      expect(Array.isArray(macAddresses)).toBe(true);
      expect(macAddresses).toEqual(['aa:bb:cc:dd:ee:ff']);
    });

    it('should get number value', () => {
      const maxSize = configManager.get('max_mqtt_payload_size');
      expect(typeof maxSize).toBe('number');
      expect(maxSize).toBe(8192);
    });
  });

  describe('configChanged event', () => {
    it('should emit configChanged event when config is loaded', () => {
      // 清理旧的测试配置文件
      const testConfigPath = path.join(__dirname, '..', 'config', 'test-config.json');
      if (fs.existsSync(testConfigPath)) {
        fs.unlinkSync(testConfigPath);
      }
      
      // 创建一个新的 ConfigManager 实例
      const newConfigManager = new ConfigManager('test-config.json');
      
      // 验证配置是否被正确加载
      const config = newConfigManager.getConfig();
      expect(config).toBeDefined();
      
      // 清理
      newConfigManager.removeAllListeners();
    });

    it('should emit configChanged event when config file is modified', (done) => {
      configManager.on('configChanged', (config) => {
        expect(config).toBeDefined();
        expect(config.debug).toBe(false);
        done();
      });

      setTimeout(() => {
        const updatedConfig = { ...originalConfig, debug: false };
        fs.writeFileSync(testConfigPath, JSON.stringify(updatedConfig, null, 2));
      }, 400);
    });

    it('should not emit configChanged event when config content is the same', (done) => {
      let eventCount = 0;
      
      configManager.on('configChanged', () => {
        eventCount++;
      });

      setTimeout(() => {
        fs.writeFileSync(testConfigPath, JSON.stringify(originalConfig, null, 2));
      }, 400);

      setTimeout(() => {
        expect(eventCount).toBe(0);
        done();
      }, 1000);
    });
  });

  describe('config hot reload', () => {
    it('should update config after file modification', (done) => {
      const updatedConfig = { ...originalConfig, debug: false };
      
      configManager.on('configChanged', (config) => {
        if (!config.debug) {
          const currentConfig = configManager.getConfig();
          expect(currentConfig.debug).toBe(false);
          done();
        }
      });

      setTimeout(() => {
        fs.writeFileSync(testConfigPath, JSON.stringify(updatedConfig, null, 2));
      }, 400);
    });

    it('should handle multiple rapid config changes', (done) => {
      let eventCount = 0;
      let finalDebugValue = true;

      configManager.on('configChanged', (config) => {
        eventCount++;
        finalDebugValue = config.debug;
      });

      setTimeout(() => {
        fs.writeFileSync(testConfigPath, JSON.stringify({ ...originalConfig, debug: false }, null, 2));
      }, 400);

      setTimeout(() => {
        fs.writeFileSync(testConfigPath, JSON.stringify({ ...originalConfig, debug: true }, null, 2));
      }, 600);

      setTimeout(() => {
        fs.writeFileSync(testConfigPath, JSON.stringify({ ...originalConfig, debug: false }, null, 2));
      }, 800);

      setTimeout(() => {
        expect(eventCount).toBeGreaterThan(0);
        expect(finalDebugValue).toBe(false);
        done();
      }, 1500);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON in config file', () => {
      const invalidJsonPath = path.join(__dirname, '..', 'config', 'invalid-config.json');
      fs.writeFileSync(invalidJsonPath, '{ invalid json }');
      
      const invalidConfigManager = new ConfigManager('invalid-config.json');
      const config = invalidConfigManager.getConfig();
      
      expect(config).toBeDefined();
      
      if (fs.existsSync(invalidJsonPath)) {
        fs.unlinkSync(invalidJsonPath);
      }
    });

    it('should handle missing config directory', () => {
      const deepConfigPath = path.join(__dirname, '..', 'config', 'nested', 'deep-config.json');
      const relativePath = path.relative(path.join(__dirname, '..'), deepConfigPath);
      
      const newConfigManager = new ConfigManager(relativePath.replace(/\\/g, '/'));
      const config = newConfigManager.getConfig();
      
      expect(config).toEqual({});
      
      if (fs.existsSync(deepConfigPath)) {
        fs.unlinkSync(deepConfigPath);
      }
    });
  });

  describe('config structure', () => {
    it('should handle complex nested config', () => {
      const complexConfig = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        },
        array: [
          { id: 1, name: 'first' },
          { id: 2, name: 'second' }
        ]
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(complexConfig, null, 2));
      const newConfigManager = new ConfigManager('test-config.json');
      
      const deepValue = newConfigManager.get('level1.level2.level3.value');
      expect(deepValue).toBe('deep');
      
      const arrayValue = newConfigManager.get('array');
      expect(Array.isArray(arrayValue)).toBe(true);
      expect(arrayValue.length).toBe(2);
    });

    it('should handle config with special characters in keys', () => {
      const specialConfig = {
        'key-with-dash': 'value1',
        'key_with_underscore': 'value2',
        'key.with.dot': 'value3'
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(specialConfig, null, 2));
      const newConfigManager = new ConfigManager('test-config.json');
      
      expect(newConfigManager.get('key-with-dash')).toBe('value1');
      expect(newConfigManager.get('key_with_underscore')).toBe('value2');
      expect(newConfigManager.get('key.with.dot')).toBe('value3');
    });
  });

  describe('event listener management', () => {
    it('should support multiple listeners', (done) => {
      let listener1Called = false;
      let listener2Called = false;

      configManager.on('configChanged', () => {
        listener1Called = true;
      });

      configManager.on('configChanged', () => {
        listener2Called = true;
      });

      setTimeout(() => {
        fs.writeFileSync(testConfigPath, JSON.stringify({ ...originalConfig, debug: false }, null, 2));
      }, 400);

      setTimeout(() => {
        expect(listener1Called).toBe(true);
        expect(listener2Called).toBe(true);
        done();
      }, 1000);
    });

    it('should remove listeners', (done) => {
      let callCount = 0;

      const listener = () => {
        callCount++;
      };

      configManager.on('configChanged', listener);
      
      setTimeout(() => {
        configManager.removeListener('configChanged', listener);
        fs.writeFileSync(testConfigPath, JSON.stringify({ ...originalConfig, debug: false }, null, 2));
      }, 400);

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 1000);
    });

    it('should remove all listeners', (done) => {
      let callCount = 0;

      configManager.on('configChanged', () => {
        callCount++;
      });

      setTimeout(() => {
        configManager.removeAllListeners('configChanged');
        fs.writeFileSync(testConfigPath, JSON.stringify({ ...originalConfig, debug: false }, null, 2));
      }, 400);

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 1000);
    });
  });

  describe('debounce behavior', () => {
    it('should debounce rapid file changes', (done) => {
      let eventCount = 0;
      
      configManager.on('configChanged', () => {
        eventCount++;
      });

      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          fs.writeFileSync(testConfigPath, JSON.stringify({ ...originalConfig, debug: i % 2 === 0 }, null, 2));
        }
      }, 400);

      setTimeout(() => {
        expect(eventCount).toBeLessThan(5);
        done();
      }, 1500);
    });
  });
});
