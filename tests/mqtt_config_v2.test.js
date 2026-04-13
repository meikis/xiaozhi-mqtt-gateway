const { generateMqttConfig, validateMqttCredentials, generatePasswordSignature } = require('../utils/mqtt_config_v2');

describe('generatePasswordSignature', () => {
  const testSecretKey = 'test-secret-key-12345';

  it('should generate consistent signature for same input', () => {
    const content = 'test-content';
    const signature1 = generatePasswordSignature(content, testSecretKey);
    const signature2 = generatePasswordSignature(content, testSecretKey);
    
    expect(signature1).toBe(signature2);
  });

  it('should generate different signatures for different content', () => {
    const signature1 = generatePasswordSignature('content-1', testSecretKey);
    const signature2 = generatePasswordSignature('content-2', testSecretKey);
    
    expect(signature1).not.toBe(signature2);
  });

  it('should generate different signatures for different secret keys', () => {
    const content = 'test-content';
    const signature1 = generatePasswordSignature(content, 'key-1');
    const signature2 = generatePasswordSignature(content, 'key-2');
    
    expect(signature1).not.toBe(signature2);
  });

  it('should generate base64 encoded signature', () => {
    const signature = generatePasswordSignature('test', testSecretKey);
    
    expect(typeof signature).toBe('string');
    expect(() => {
      Buffer.from(signature, 'base64');
    }).not.toThrow();
  });

  it('should handle empty content', () => {
    const signature = generatePasswordSignature('', testSecretKey);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
  });

  it('should handle special characters in content', () => {
    const specialContent = 'test@@@with@@@special@@@chars';
    const signature = generatePasswordSignature(specialContent, testSecretKey);
    expect(typeof signature).toBe('string');
  });

  it('should handle unicode characters', () => {
    const unicodeContent = '测试内容🎉';
    const signature = generatePasswordSignature(unicodeContent, testSecretKey);
    expect(typeof signature).toBe('string');
  });
});

describe('validateMqttCredentials', () => {
  const testSignatureKey = 'test-signature-key-12345';
  const testGroupId = 'GID_test';
  const testMacAddress = 'aa:bb:cc:dd:ee:ff';
  const testUuid = '36c98363-3656-43cb-a00f-8bced2391a90';
  const testUserData = { ip: '192.168.1.1', userId: 'user123' };

  beforeEach(() => {
    process.env.MQTT_SIGNATURE_KEY = testSignatureKey;
  });

  afterEach(() => {
    delete process.env.MQTT_SIGNATURE_KEY;
  });

  it('should validate correct credentials', () => {
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const username = Buffer.from(JSON.stringify(testUserData)).toString('base64');
    const password = generatePasswordSignature(clientId + '|' + username, testSignatureKey);

    const result = validateMqttCredentials(clientId, username, password);
    
    expect(result.groupId).toBe(testGroupId);
    expect(result.macAddress).toBe(testMacAddress);
    expect(result.uuid).toBe(testUuid);
    expect(result.userData).toEqual(testUserData);
  });

  it('should reject invalid password signature', () => {
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const username = Buffer.from(JSON.stringify(testUserData)).toString('base64');
    const wrongPassword = 'wrong-password';

    expect(() => {
      validateMqttCredentials(clientId, username, wrongPassword);
    }).toThrow('密码签名验证失败');
  });

  it('should reject invalid clientId format - missing separators', () => {
    const invalidClientId = 'invalid-client-id';
    const username = Buffer.from(JSON.stringify(testUserData)).toString('base64');
    const password = generatePasswordSignature(invalidClientId + '|' + username, testSignatureKey);

    expect(() => {
      validateMqttCredentials(invalidClientId, username, password);
    }).toThrow('clientId格式错误，必须包含@@@分隔符');
  });

  it('should reject invalid clientId format - wrong number of parts', () => {
    const invalidClientId = `${testGroupId}@@@${testMacAddress}`;
    const username = Buffer.from(JSON.stringify(testUserData)).toString('base64');
    const password = generatePasswordSignature(invalidClientId + '|' + username, testSignatureKey);

    expect(() => {
      validateMqttCredentials(invalidClientId, username, password);
    }).toThrow('clientId格式错误，必须包含@@@分隔符');
  });

  it('should reject empty clientId', () => {
    expect(() => {
      validateMqttCredentials('', 'username', 'password');
    }).toThrow('clientId必须是非空字符串');
  });

  it('should reject null clientId', () => {
    expect(() => {
      validateMqttCredentials(null, 'username', 'password');
    }).toThrow('clientId必须是非空字符串');
  });

  it('should reject non-string clientId', () => {
    expect(() => {
      validateMqttCredentials(123, 'username', 'password');
    }).toThrow('clientId必须是非空字符串');
  });

  it('should reject empty username', () => {
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const password = generatePasswordSignature(clientId + '|' + '', testSignatureKey);

    expect(() => {
      validateMqttCredentials(clientId, '', password);
    }).toThrow('username必须是非空字符串');
  });

  it('should reject null username', () => {
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;

    expect(() => {
      validateMqttCredentials(clientId, null, 'password');
    }).toThrow('username必须是非空字符串');
  });

  it('should reject non-string username', () => {
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;

    expect(() => {
      validateMqttCredentials(clientId, 123, 'password');
    }).toThrow('username必须是非空字符串');
  });

  it('should reject invalid base64 username', () => {
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const invalidUsername = 'not-valid-base64!!!';
    const password = generatePasswordSignature(clientId + '|' + invalidUsername, testSignatureKey);

    expect(() => {
      validateMqttCredentials(clientId, invalidUsername, password);
    }).toThrow('username不是有效的base64编码JSON');
  });

  it('should reject username that is not valid JSON', () => {
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const invalidJsonUsername = Buffer.from('not-json').toString('base64');
    const password = generatePasswordSignature(clientId + '|' + invalidJsonUsername, testSignatureKey);

    expect(() => {
      validateMqttCredentials(clientId, invalidJsonUsername, password);
    }).toThrow('username不是有效的base64编码JSON');
  });

  it('should convert mac address underscores to colons', () => {
    const deviceIdWithUnderscores = 'aa_bb_cc_dd_ee_ff';
    const clientId = `${testGroupId}@@@${deviceIdWithUnderscores}@@@${testUuid}`;
    const username = Buffer.from(JSON.stringify(testUserData)).toString('base64');
    const password = generatePasswordSignature(clientId + '|' + username, testSignatureKey);

    const result = validateMqttCredentials(clientId, username, password);
    
    expect(result.macAddress).toBe('aa:bb:cc:dd:ee:ff');
  });

  it('should handle complex userData object', () => {
    const complexUserData = {
      ip: '192.168.1.1',
      userId: 'user123',
      metadata: {
        deviceType: 'speaker',
        firmware: '1.0.0'
      },
      tags: ['premium', 'beta']
    };

    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const username = Buffer.from(JSON.stringify(complexUserData)).toString('base64');
    const password = generatePasswordSignature(clientId + '|' + username, testSignatureKey);

    const result = validateMqttCredentials(clientId, username, password);
    
    expect(result.userData).toEqual(complexUserData);
  });

  it('should skip password validation when MQTT_SIGNATURE_KEY is not set', () => {
    delete process.env.MQTT_SIGNATURE_KEY;

    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const username = Buffer.from(JSON.stringify(testUserData)).toString('base64');
    const wrongPassword = 'any-password';

    const result = validateMqttCredentials(clientId, username, wrongPassword);
    
    expect(result.groupId).toBe(testGroupId);
    expect(result.macAddress).toBe(testMacAddress);
    expect(result.uuid).toBe(testUuid);
  });
});

describe('generateMqttConfig', () => {
  const testSignatureKey = 'test-signature-key-12345';
  const testGroupId = 'GID_test';
  const testMacAddress = 'aa:bb:cc:dd:ee:ff';
  const testUuid = '36c98363-3656-43cb-a00f-8bced2391a90';
  const testUserData = { ip: '192.168.1.1', userId: 'user123' };

  beforeEach(() => {
    process.env.MQTT_SIGNATURE_KEY = testSignatureKey;
    process.env.MQTT_ENDPOINT = 'mqtt.example.com';
  });

  afterEach(() => {
    delete process.env.MQTT_SIGNATURE_KEY;
    delete process.env.MQTT_ENDPOINT;
  });

  it('should generate valid MQTT config', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    
    expect(config).toBeDefined();
    expect(config.endpoint).toBe('mqtt.example.com');
    expect(config.port).toBe(8883);
    expect(config.publish_topic).toBe('device-server');
    expect(config.subscribe_topic).toBe('null');
  });

  it('should generate correct clientId format', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    
    const expectedClientId = `${testGroupId}@@@${testMacAddress.replace(/:/g, '_')}@@@${testUuid}`;
    expect(config.client_id).toBe(expectedClientId);
  });

  it('should generate base64 encoded username', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    
    expect(() => {
      const decoded = Buffer.from(config.username, 'base64').toString();
      const userData = JSON.parse(decoded);
      expect(userData).toEqual(testUserData);
    }).not.toThrow();
  });

  it('should generate valid password signature', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    
    const deviceIdNoColon = testMacAddress.replace(/:/g, '_');
    const clientId = `${testGroupId}@@@${deviceIdNoColon}@@@${testUuid}`;
    const expectedPassword = generatePasswordSignature(clientId + '|' + config.username, testSignatureKey);
    
    expect(config.password).toBe(expectedPassword);
  });

  it('should return undefined when MQTT_SIGNATURE_KEY is not set', () => {
    delete process.env.MQTT_SIGNATURE_KEY;

    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    
    expect(config).toBeUndefined();
  });

  it('should handle empty userData', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, {});
    
    expect(() => {
      const decoded = Buffer.from(config.username, 'base64').toString();
      const userData = JSON.parse(decoded);
      expect(userData).toEqual({});
    }).not.toThrow();
  });

  it('should handle userData with special characters', () => {
    const specialUserData = {
      name: '测试用户🎉',
      email: 'test+special@example.com',
      'key-with-dash': 'value'
    };

    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, specialUserData);
    
    expect(() => {
      const decoded = Buffer.from(config.username, 'base64').toString();
      const userData = JSON.parse(decoded);
      expect(userData).toEqual(specialUserData);
    }).not.toThrow();
  });

  it('should handle mac address with colons', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    
    expect(config.client_id).toContain('aa_bb_cc_dd_ee_ff');
    expect(config.client_id).not.toContain(':');
  });

  it('should handle different group IDs', () => {
    const differentGroupId = 'GID_production';
    const config = generateMqttConfig(differentGroupId, testMacAddress, testUuid, testUserData);
    
    expect(config.client_id).toContain(differentGroupId);
  });

  it('should handle different UUIDs', () => {
    const differentUuid = '12345678-1234-1234-1234-123456789abc';
    const config = generateMqttConfig(testGroupId, testMacAddress, differentUuid, testUserData);
    
    expect(config.client_id).toContain(differentUuid);
  });
});

describe('integration tests', () => {
  const testSignatureKey = 'test-signature-key-12345';
  const testGroupId = 'GID_test';
  const testMacAddress = 'aa:bb:cc:dd:ee:ff';
  const testUuid = '36c98363-3656-43cb-a00f-8bced2391a90';
  const testUserData = { ip: '192.168.1.1', userId: 'user123' };

  beforeEach(() => {
    process.env.MQTT_SIGNATURE_KEY = testSignatureKey;
    process.env.MQTT_ENDPOINT = 'mqtt.example.com';
  });

  afterEach(() => {
    delete process.env.MQTT_SIGNATURE_KEY;
    delete process.env.MQTT_ENDPOINT;
  });

  it('should successfully validate generated config', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    
    const result = validateMqttCredentials(
      config.client_id,
      config.username,
      config.password
    );
    
    expect(result.groupId).toBe(testGroupId);
    expect(result.macAddress).toBe(testMacAddress);
    expect(result.uuid).toBe(testUuid);
    expect(result.userData).toEqual(testUserData);
  });

  it('should fail validation with modified password', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    const modifiedPassword = config.password + 'modified';
    
    expect(() => {
      validateMqttCredentials(config.client_id, config.username, modifiedPassword);
    }).toThrow('密码签名验证失败');
  });

  it('should fail validation with modified username', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    const modifiedUsername = config.username + 'modified';
    
    expect(() => {
      validateMqttCredentials(config.client_id, modifiedUsername, config.password);
    }).toThrow('密码签名验证失败');
  });

  it('should fail validation with modified clientId', () => {
    const config = generateMqttConfig(testGroupId, testMacAddress, testUuid, testUserData);
    const modifiedClientId = config.client_id + 'modified';
    
    expect(() => {
      validateMqttCredentials(modifiedClientId, config.username, config.password);
    }).toThrow('密码签名验证失败');
  });

  it('should handle multiple devices with different credentials', () => {
    const devices = [
      {
        groupId: 'GID_test1',
        macAddress: 'aa:bb:cc:dd:ee:f1',
        uuid: '36c98363-3656-43cb-a00f-8bced2391a91',
        userData: { ip: '192.168.1.1' }
      },
      {
        groupId: 'GID_test2',
        macAddress: 'aa:bb:cc:dd:ee:f2',
        uuid: '36c98363-3656-43cb-a00f-8bced2391a92',
        userData: { ip: '192.168.1.2' }
      },
      {
        groupId: 'GID_test3',
        macAddress: 'aa:bb:cc:dd:ee:f3',
        uuid: '36c98363-3656-43cb-a00f-8bced2391a93',
        userData: { ip: '192.168.1.3' }
      }
    ];

    devices.forEach(device => {
      const config = generateMqttConfig(
        device.groupId,
        device.macAddress,
        device.uuid,
        device.userData
      );

      const result = validateMqttCredentials(
        config.client_id,
        config.username,
        config.password
      );

      expect(result.groupId).toBe(device.groupId);
      expect(result.macAddress).toBe(device.macAddress);
      expect(result.uuid).toBe(device.uuid);
      expect(result.userData).toEqual(device.userData);
    });
  });
});
