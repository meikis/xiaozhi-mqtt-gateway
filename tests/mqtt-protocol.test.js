const { MQTTProtocol, PacketType } = require('../mqtt-protocol');
const EventEmitter = require('events');
const { ConfigManager } = require('../utils/config-manager');

class MockSocket extends EventEmitter {
  constructor() {
    super();
    this.writable = true;
    this.destroyed = false;
    this.dataWritten = [];
  }

  write(data) {
    this.dataWritten.push(data);
    return true;
  }

  end() {
    this.destroyed = true;
    this.emit('close');
  }

  destroy() {
    this.destroyed = true;
    this.emit('close');
  }

  reset() {
    this.dataWritten = [];
    this.destroyed = false;
  }
}

describe('MQTTProtocol', () => {
  let socket;
  let protocol;
  let configManager;

  beforeEach(() => {
    socket = new MockSocket();
    configManager = new ConfigManager('mqtt.json');
    protocol = new MQTTProtocol(socket, configManager);
  });

  afterEach(() => {
    if (protocol) {
      protocol.close();
    }
  });

  describe('PacketType', () => {
    it('should have correct packet type values', () => {
      expect(PacketType.CONNECT).toBe(1);
      expect(PacketType.CONNACK).toBe(2);
      expect(PacketType.PUBLISH).toBe(3);
      expect(PacketType.SUBSCRIBE).toBe(8);
      expect(PacketType.SUBACK).toBe(9);
      expect(PacketType.PINGREQ).toBe(12);
      expect(PacketType.PINGRESP).toBe(13);
      expect(PacketType.DISCONNECT).toBe(14);
    });
  });

  describe('decodeRemainingLength', () => {
    it('should decode single byte length', () => {
      const buffer = Buffer.from([0x00, 0x7F]);
      const result = protocol.decodeRemainingLength(buffer);
      expect(result.value).toBe(127);
      expect(result.bytesRead).toBe(1);
    });

    it('should decode two byte length', () => {
      const buffer = Buffer.from([0x00, 0x80, 0x01]);
      const result = protocol.decodeRemainingLength(buffer);
      expect(result.value).toBe(128);
      expect(result.bytesRead).toBe(2);
    });

    it('should decode three byte length', () => {
      const buffer = Buffer.from([0x00, 0x80, 0x80, 0x01]);
      const result = protocol.decodeRemainingLength(buffer);
      expect(result.value).toBe(16384);
      expect(result.bytesRead).toBe(3);
    });

    it('should decode four byte length', () => {
      const buffer = Buffer.from([0x00, 0x80, 0x80, 0x80, 0x01]);
      const result = protocol.decodeRemainingLength(buffer);
      expect(result.value).toBe(2097152);
      expect(result.bytesRead).toBe(4);
    });

    it('should throw error for malformed remaining length', () => {
      const buffer = Buffer.from([0x00, 0x80, 0x80, 0x80, 0x80, 0x01]);
      expect(() => {
        protocol.decodeRemainingLength(buffer);
      }).toThrow('Malformed Remaining Length');
    });
  });

  describe('encodeRemainingLength', () => {
    it('should encode single byte length', () => {
      const result = protocol.encodeRemainingLength(127);
      expect(result.bytesLength).toBe(1);
      expect(result.bytes[0]).toBe(127);
    });

    it('should encode two byte length', () => {
      const result = protocol.encodeRemainingLength(128);
      expect(result.bytesLength).toBe(2);
      expect(result.bytes[0]).toBe(0x80);
      expect(result.bytes[1]).toBe(0x01);
    });

    it('should encode maximum length', () => {
      const result = protocol.encodeRemainingLength(268435455);
      expect(result.bytesLength).toBe(4);
    });
  });

  describe('sendConnack', () => {
    it('should send CONNACK packet with return code 0', () => {
      protocol.sendConnack(0, false);
      expect(socket.dataWritten.length).toBe(1);
      
      const packet = socket.dataWritten[0];
      expect(packet[0]).toBe(PacketType.CONNACK << 4);
      expect(packet[1]).toBe(2);
      expect(packet[2]).toBe(0);
      expect(packet[3]).toBe(0);
    });

    it('should send CONNACK with session present flag', () => {
      protocol.sendConnack(0, true);
      const packet = socket.dataWritten[0];
      expect(packet[2]).toBe(1);
    });

    it('should send CONNACK with error return code', () => {
      protocol.sendConnack(1, false);
      const packet = socket.dataWritten[0];
      expect(packet[3]).toBe(1);
    });
  });

  describe('sendSuback', () => {
    it('should send SUBACK packet', () => {
      protocol.isConnected = true;
      protocol.sendSuback(1234, 0);
      
      expect(socket.dataWritten.length).toBe(1);
      const packet = socket.dataWritten[0];
      expect(packet[0]).toBe(PacketType.SUBACK << 4);
      expect(packet[1]).toBe(3);
      expect(packet[2]).toBe(0x04);
      expect(packet[3]).toBe(0xD2);
      expect(packet[4]).toBe(0);
    });

    it('should not send SUBACK when not connected', () => {
      protocol.isConnected = false;
      protocol.sendSuback(1234, 0);
      expect(socket.dataWritten.length).toBe(0);
    });
  });

  describe('sendPingResp', () => {
    it('should send PINGRESP packet', () => {
      protocol.isConnected = true;
      protocol.sendPingResp();
      
      expect(socket.dataWritten.length).toBe(1);
      const packet = socket.dataWritten[0];
      expect(packet[0]).toBe(PacketType.PINGRESP << 4);
      expect(packet[1]).toBe(0);
    });

    it('should not send PINGRESP when not connected', () => {
      protocol.isConnected = false;
      protocol.sendPingResp();
      expect(socket.dataWritten.length).toBe(0);
    });
  });

  describe('sendPublish', () => {
    it('should send PUBLISH packet with QoS 0', () => {
      protocol.isConnected = true;
      protocol.sendPublish('test/topic', 'hello world', 0, false, false);
      
      expect(socket.dataWritten.length).toBe(1);
      const packet = socket.dataWritten[0];
      
      const firstByte = packet[0];
      expect((firstByte >> 4)).toBe(PacketType.PUBLISH);
      expect((firstByte & 0x06) >> 1).toBe(0);
    });

    it('should send PUBLISH packet with QoS 1', () => {
      protocol.isConnected = true;
      protocol.sendPublish('test/topic', 'hello world', 1, false, false, 1234);
      
      expect(socket.dataWritten.length).toBe(1);
      const packet = socket.dataWritten[0];
      
      const firstByte = packet[0];
      expect((firstByte >> 4)).toBe(PacketType.PUBLISH);
      expect((firstByte & 0x06) >> 1).toBe(1);
    });

    it('should send PUBLISH packet with DUP flag', () => {
      protocol.isConnected = true;
      protocol.sendPublish('test/topic', 'hello world', 0, true, false);
      
      const packet = socket.dataWritten[0];
      expect(packet[0] & 0x08).toBeTruthy();
    });

    it('should send PUBLISH packet with RETAIN flag', () => {
      protocol.isConnected = true;
      protocol.sendPublish('test/topic', 'hello world', 0, false, true);
      
      const packet = socket.dataWritten[0];
      expect(packet[0] & 0x01).toBeTruthy();
    });

    it('should not send PUBLISH when not connected', () => {
      protocol.isConnected = false;
      protocol.sendPublish('test/topic', 'hello world');
      expect(socket.dataWritten.length).toBe(0);
    });
  });

  describe('parseConnect', () => {
    it('should parse valid CONNECT packet', (done) => {
      const connectPacket = Buffer.from([
        0x10,
        0x16,
        0x00, 0x04, 0x4D, 0x51, 0x54, 0x54, // 'M', 'Q', 'T', 'T' in ASCII
        0x04,
        0x02,
        0x00, 0x3C,
        0x00, 0x0A, 0x74, 0x65, 0x73, 0x74, 0x43, 0x6C, 0x69, 0x65, 0x6E, 0x74 // 'testClient' in ASCII
      ]);

      protocol.on('connect', (data) => {
        expect(data.protocol).toBe('MQTT');
        expect(data.protocolLevel).toBe(4);
        expect(data.clientId).toBe('testClient');
        expect(data.keepAlive).toBe(60);
        expect(data.cleanSession).toBe(true);
        done();
      });

      protocol.on('protocolError', (err) => {
        done(err);
      });

      protocol.on('error', (err) => {
        done(err);
      });

      socket.emit('data', connectPacket);
    });

    it('should parse CONNECT with username and password', (done) => {
      const connectPacket = Buffer.from([
        0x10,
        0x24,
        0x00, 0x04, 0x4D, 0x51, 0x54, 0x54, // 'M', 'Q', 'T', 'T' in ASCII
        0x04,
        0xC0,
        0x00, 0x3C,
        0x00, 0x0A, 0x74, 0x65, 0x73, 0x74, 0x43, 0x6C, 0x69, 0x65, 0x6E, 0x74, // 'testClient' in ASCII
        0x00, 0x05, 0x75, 0x73, 0x65, 0x72, 0x31, // 'user1' in ASCII
        0x00, 0x05, 0x70, 0x61, 0x73, 0x73, 0x31 // 'pass1' in ASCII
      ]);

      protocol.on('connect', (data) => {
        expect(data.username).toBe('user1');
        expect(data.password).toBe('pass1');
        done();
      });

      socket.emit('data', connectPacket);
    });

    it('should reject unsupported protocol version', (done) => {
      const connectPacket = Buffer.from([
        0x10,
        0x0C,
        0x00, 0x04, 0x4D, 0x51, 0x54, 0x54, // 'M', 'Q', 'T', 'T' in ASCII
        0x03,
        0x02,
        0x00, 0x3C,
        0x00, 0x02, 0x69, 0x64 // 'id' in ASCII
      ]);

      protocol.on('protocolError', (err) => {
        expect(err).toBeDefined();
        done();
      });

      socket.emit('data', connectPacket);
    });
  });

  describe('parsePublish', () => {
    beforeEach(() => {
      protocol.isConnected = true;
    });

    it('should parse PUBLISH packet with QoS 0', (done) => {
      const publishPacket = Buffer.from([
        0x30,
        0x0C,
        0x00, 0x05, 0x74, 0x6F, 0x70, 0x69, 0x63, // 'topic' in ASCII
        0x68, 0x65, 0x6C, 0x6C, 0x6F // 'hello' in ASCII
      ]);

      protocol.on('publish', (data) => {
        expect(data.topic).toBe('topic');
        expect(data.payload).toBe('hello');
        expect(data.qos).toBe(0);
        expect(data.dup).toBe(false);
        expect(data.retain).toBe(false);
        done();
      });

      socket.emit('data', publishPacket);
    });

    it('should parse PUBLISH packet with QoS 1', (done) => {
      const publishPacket = Buffer.from([
        0x32,
        0x0D,
        0x00, 0x05, 0x74, 0x6F, 0x70, 0x69, 0x63, // 'topic' in ASCII
        0x12, 0x34,
        0x68, 0x65, 0x6C, 0x6C, 0x6F // 'hello' in ASCII
      ]);

      protocol.on('publish', (data) => {
        expect(data.qos).toBe(1);
        expect(data.packetId).toBe(0x1234);
        done();
      });

      socket.emit('data', publishPacket);
    });

    it('should parse PUBLISH with DUP and RETAIN flags', (done) => {
      const publishPacket = Buffer.from([
        0x3D,
        0x0B,
        0x00, 0x05, 0x74, 0x6F, 0x70, 0x69, 0x63, // 'topic' in ASCII
        0x68, 0x65, 0x6C, 0x6C, 0x6F // 'hello' in ASCII
      ]);

      protocol.on('publish', (data) => {
        expect(data.dup).toBe(true);
        expect(data.retain).toBe(true);
        done();
      });

      socket.emit('data', publishPacket);
    });
  });

  describe('parseSubscribe', () => {
    beforeEach(() => {
      protocol.isConnected = true;
    });

    it('should parse SUBSCRIBE packet', (done) => {
      const subscribePacket = Buffer.from([
        0x82,
        0x0A,
        0x00, 0x01,
        0x00, 0x05, 0x74, 0x6F, 0x70, 0x69, 0x63, // 'topic' in ASCII
        0x00
      ]);

      protocol.on('subscribe', (data) => {
        expect(data.packetId).toBe(1);
        expect(data.topic).toBe('topic');
        expect(data.qos).toBe(0);
        done();
      });

      socket.emit('data', subscribePacket);
    });

    it('should parse SUBSCRIBE with QoS 1', (done) => {
      const subscribePacket = Buffer.from([
        0x82,
        0x0A,
        0x00, 0x01,
        0x00, 0x05, 0x74, 0x6F, 0x70, 0x69, 0x63, // 'topic' in ASCII
        0x01
      ]);

      protocol.on('subscribe', (data) => {
        expect(data.qos).toBe(1);
        done();
      });

      socket.emit('data', subscribePacket);
    });
  });

  describe('parsePingReq', () => {
    beforeEach(() => {
      protocol.isConnected = true;
    });

    it('should parse PINGREQ and send PINGRESP', (done) => {
      const pingReqPacket = Buffer.from([0xC0, 0x00]);

      protocol.on('publish', () => {
        done();
      });

      socket.emit('data', pingReqPacket);
      
      setTimeout(() => {
        expect(socket.dataWritten.length).toBe(1);
        const packet = socket.dataWritten[0];
        expect(packet[0]).toBe(PacketType.PINGRESP << 4);
        done();
      }, 10);
    });
  });

  describe('parseDisconnect', () => {
    beforeEach(() => {
      protocol.isConnected = true;
    });

    it('should parse DISCONNECT packet', (done) => {
      const disconnectPacket = Buffer.from([0xE0, 0x00]);

      protocol.on('disconnect', () => {
        expect(protocol.isConnected).toBe(false);
        done();
      });

      socket.emit('data', disconnectPacket);
    });
  });

  describe('keepAlive', () => {
    it('should track last activity time', () => {
      const initialTime = protocol.getLastActivity();
      expect(typeof initialTime).toBe('number');
      
      socket.emit('data', Buffer.from([0xC0, 0x00]));
      
      const newTime = protocol.getLastActivity();
      expect(newTime).toBeGreaterThanOrEqual(initialTime);
    });

    it('should set keepAlive interval from CONNECT', (done) => {
      const connectPacket = Buffer.from([
        0x10,
        0x16,
        0x00, 0x04, 'M', 'Q', 'T', 'T',
        0x04,
        0x02,
        0x00, 0x3C,
        0x00, 0x0A, 't', 'e', 's', 't', 'C', 'l', 'i', 'e', 'n', 't'
      ]);

      protocol.on('connect', () => {
        const interval = protocol.getKeepAliveInterval();
        expect(interval).toBe(90000);
        done();
      });

      socket.emit('data', connectPacket);
    });
  });

  describe('buffer management', () => {
    beforeEach(() => {
      protocol.isConnected = true;
    });

    it('should handle incomplete packets', (done) => {
      const incompletePacket = Buffer.from([0x10, 0x2A]);
      
      socket.emit('data', incompletePacket);
      
      setTimeout(() => {
        expect(protocol.buffer.length).toBe(2);
        done();
      }, 10);
    });

    it('should process multiple packets in buffer', (done) => {
      const firstPacket = Buffer.from([0xC0, 0x00]);
      const secondPacket = Buffer.from([0xC0, 0x00]);
      const combined = Buffer.concat([firstPacket, secondPacket]);
      
      let pingCount = 0;
      protocol.on('pingreq', () => {
        pingCount++;
        if (pingCount === 2) {
          done();
        }
      });

      socket.emit('data', combined);
    });

    it('should clear buffer on request', () => {
      protocol.buffer = Buffer.from([0x01, 0x02, 0x03]);
      protocol.clearBuffer();
      expect(protocol.buffer.length).toBe(0);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      protocol.isConnected = true;
    });

    it('should emit error on socket error', (done) => {
      protocol.on('error', (err) => {
        expect(err).toBeDefined();
        done();
      });

      socket.emit('error', new Error('Socket error'));
    });

    it('should emit close on socket close', (done) => {
      protocol.on('close', () => {
        done();
      });

      socket.emit('close');
    });

    it('should handle protocol errors', (done) => {
      const invalidPacket = Buffer.from([0xFF, 0x00]);
      
      protocol.on('protocolError', (err) => {
        expect(err).toBeDefined();
        done();
      });

      socket.emit('data', invalidPacket);
    });
  });

  describe('close', () => {
    it('should destroy socket', () => {
      protocol.close();
      expect(socket.destroyed).toBe(true);
    });
  });
});
