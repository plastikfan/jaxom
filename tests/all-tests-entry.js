var context = require.context('./', true, /.spec.ts$/);
context.keys().forEach(context);
module.exports = context;
