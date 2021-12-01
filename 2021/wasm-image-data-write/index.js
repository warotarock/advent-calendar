const fs = require("fs");
const AsBind = require("as-bind/dist/as-bind.cjs.js");
let wasmModule;
const imports = {};
wasmModule = AsBind.instantiateSync(fs.readFileSync(__dirname + "/build/untouched.wasm"), imports);
module.exports = { loader: AsBind, module: wasmModule.exports };
