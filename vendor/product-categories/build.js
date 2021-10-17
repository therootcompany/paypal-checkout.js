// Documented under "categories" at
// https://developer.paypal.com/docs/api/catalog-products/v1/
/*
  // To scrape the full list from the site:
  var categories = [];
  var $c = $$('.dax-def-label code').find(function ($el) {
    if ("category" === $el.innerText.toLowerCase()) {
      return $el;
    }
  });
  $c.closest('div').nextElementSibling.querySelectorAll('li').forEach(function ($el) {
    categories.push($el.querySelector('code').innerText);
  });
  console.info(JSON.stringify(categories));
*/

let Fs = require("fs");
let Path = require("path");

let categories = Fs.readFileSync(Path.join(__dirname, "categories.txt"), 'utf8')
  .split(/[\n\r\s]/)
  .filter(Boolean);

let categoriesMap = categories.reduce(function (obj, name) {
  obj[name] = name;
  return obj;
}, {});
//Fs.mkdirSync(Path.join(__dirname,  "../lib"), { recursive: true });
let categoriesJson = JSON.stringify(categoriesMap, null, 2).replace(
  /"(\w+)":.*/g,
  "$1: \"\","
);
Fs.writeFileSync(
  Path.join(__dirname, "categories.js"),
  `"use strict";

module.exports = ${categoriesJson};

// set the value to be the same string as the key
Object.keys(module.exports).forEach(function (k) {
  module.exports[k] = k;
});
`,
  "utf8"
);
