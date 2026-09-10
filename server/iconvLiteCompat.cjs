'use strict';

class StringDecoderShim {
  constructor(encoding = 'utf-8') {
    this.encoding = (encoding || 'utf-8').toLowerCase();
    this.decoder = new TextDecoder(this.encoding);
  }
  write(buf) {
    if (!buf) return '';
    if (typeof buf === 'string') return buf;
    return this.decoder.decode(buf, { stream: true });
  }
  end(buf) {
    if (buf) {
      return this.decoder.decode(buf);
    }
    return this.decoder.decode();
  }
}

function getDecoder(encoding) {
  try {
    return new StringDecoderShim(encoding);
  } catch (err) {
    throw new Error('Encoding not recognized: ' + encoding);
  }
}

function getEncoder(encoding) {
  const enc = new TextEncoder();
  return {
    write(str) {
      return Buffer.from(enc.encode(str || ''));
    },
    end() {
      return Buffer.alloc(0);
    }
  };
}

function decode(buf, encoding) {
  if (typeof buf === 'string') return buf;
  const dec = new TextDecoder((encoding || 'utf-8').toLowerCase());
  return dec.decode(buf);
}

function encode(str, encoding) {
  if (Buffer.isBuffer(str)) return str;
  const enc = new TextEncoder();
  return Buffer.from(enc.encode(str || ''));
}

function encodingExists(encoding) {
  try {
    new TextDecoder((encoding || 'utf-8').toLowerCase());
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  getDecoder,
  getEncoder,
  decode,
  encode,
  encodingExists,
  toEncoding: decode,
  fromEncoding: encode
};
