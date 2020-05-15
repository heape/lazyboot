function createBoundary() {
    var multipartChars = "-_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var length = 30 + Math.floor(Math.random() * 10);
    var boundary = "---------------------------";
    for (var i = 0; i < length; i++) {
        boundary += multipartChars.charAt(Math.floor(Math.random() * multipartChars.length));
    }
    return boundary;
}

function unicode2buffer(str) {

    var n = str.length,
        idx = -1,
        byteLength = 512,
        bytes = new Uint8Array(byteLength),
        i, c, _bytes;

    for (i = 0; i < n; ++i) {
        c = str.charCodeAt(i);
        if (c <= 0x7F) {
            bytes[++idx] = c;
        } else if (c <= 0x7FF) {
            bytes[++idx] = 0xC0 | (c >>> 6);
            bytes[++idx] = 0x80 | (c & 0x3F);
        } else if (c <= 0xFFFF) {
            bytes[++idx] = 0xE0 | (c >>> 12);
            bytes[++idx] = 0x80 | ((c >>> 6) & 0x3F);
            bytes[++idx] = 0x80 | (c & 0x3F);
        } else {
            bytes[++idx] = 0xF0 | (c >>> 18);
            bytes[++idx] = 0x80 | ((c >>> 12) & 0x3F);
            bytes[++idx] = 0x80 | ((c >>> 6) & 0x3F);
            bytes[++idx] = 0x80 | (c & 0x3F);
        }
        if (byteLength - idx <= 4) {
            _bytes = bytes;
            byteLength *= 2;
            bytes = new Uint8Array(byteLength);
            bytes.set(_bytes);
        }
    }
    idx++;

    var result = new Uint8Array(idx);
    result.set(bytes.subarray(0, idx), 0);

    return result.buffer;
}

function appendBuffer(buf1, buf2) {
    var uint8array = new Uint8Array(buf1.byteLength + buf2.byteLength);
    uint8array.set(new Uint8Array(buf1), 0);
    uint8array.set(new Uint8Array(buf2), buf1.byteLength);
    return uint8array.buffer;
}

function toBuffer(ab) {
    var buf = Buffer.alloc(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}