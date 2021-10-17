"use strict";

if ("SOFTWARE" !== require("./categories.js").SOFTWARE) {
  console.error(`FAIL: SOFTWARE !== "SOFTWARE"`);
  process.exit(1);
}

console.info("PASS");
