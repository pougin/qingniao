var Kado = require('kado').create();

//var kd=new Kado();

var S='427eWNIvm7YocTs6aVibO8UJ7xiLlHH8rlTerxLDzznWHMo';
var S='d471LBq+oL4WsD3BaBOTL8oaHOKLyj7FQauLIdwo0hCOMuACwPd7S2kHmDZuXYEu';
//S='MTExMTEx';


/*console.log(Kado.md5('111111'));
console.log(Kado.base64_encode('111111'));
console.log(Kado.base64_decode(S));
//console.log(Kado.abacaEncrypt('111111','xxx'));*/
start=Date.now();
console.log('start: '+start);
//console.log('try to decode:  '+Kado.abacaEncrypt(S,'DECODE'));
for(i=0;i<1000;i++){
	Kado.abacaEncrypt(S,'DECODE')
}
end=Date.now();
console.log('end: '+end);
console.log('time: '+(end-start)+'ms for 1000    '+(end-start)/1000+'ms\/time');

var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64DecodeChars = new Array(
          -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
          -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
          -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
          52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
          -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
          15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
          -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
          41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
      );

//console.log('asdfasdfasdfasd         '+base64DecodeChars.length);
//console.log(base64DecodeChars[52]);
//console.log(base64encode('111111'));
//console.log(base64decode(S));
//编码函数
function base64encode(str) {
      var out, i, len;
      var c1, c2, c3;
      len = str.length;
      i = 0;
      out = "";
      while(i < len) {
          c1 = str.charCodeAt(i++) & 0xff;
          if(i == len) {
              out += base64EncodeChars.charAt(c1 >> 2);
              out += base64EncodeChars.charAt((c1 & 0x3) << 4);
              out += "==";
              break;
          }
          c2 = str.charCodeAt(i++);
          if(i == len) {
              out += base64EncodeChars.charAt(c1 >> 2);
              out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
              out += base64EncodeChars.charAt((c2 & 0xF) << 2);
              out += "=";
              break;
          }
          c3 = str.charCodeAt(i++);
          out += base64EncodeChars.charAt(c1 >> 2);
          out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
          out += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6));
          out += base64EncodeChars.charAt(c3 & 0x3F);
      }
      return out;
}
//解码函数
function base64decode(str) {
      var c1, c2, c3, c4;
      var i, len, out;
      len = str.length;
      i = 0;
      out = "";
      while(i < len) {
          /* c1 */
          do {
			  console.log(str.charCodeAt(i) & 0xff);
              c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
          } while(i < len && c1 == -1);
        
          if(c1 == -1)
              break;
          /* c2 */
          do {
              c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
          } while(i < len && c2 == -1);
        
          if(c2 == -1)
              break;
          out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));
          /* c3 */
          do {
              c3 = str.charCodeAt(i++) & 0xff;
              if(c3 == 61)
                  return out;
              c3 = base64DecodeChars[c3];
          } while(i < len && c3 == -1);
        
          if(c3 == -1)
              break;
          out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));
          /* c4 */
          do {
              c4 = str.charCodeAt(i++) & 0xff;
              if(c4 == 61)
                  return out;
              c4 = base64DecodeChars[c4];
          } while(i < len && c4 == -1);
        
          if(c4 == -1)
              break;
          out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
      }
      return out;
}

var b64 = {

    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = b64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

        }

        return output;
    },

    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    }
}



//console.log(b64.encode('111111'));
