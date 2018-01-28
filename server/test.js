var Kado = require('./kado.js').create();

//var kd=new Kado();

var S='427eWNIvm7YocTs6aVibO8UJ7xiLlHH8rlTerxLDzznWHMo';

console.log(Kado.md5('111111'));
console.log(Kado.base64_encode('111111'));
console.log(Kado.base64_decode('111111'));
//console.log(Kado.abacaEncrypt('111111','xxx'));
console.log('try to decode:  '+Kado.abacaEncrypt(S,'DECODE'));