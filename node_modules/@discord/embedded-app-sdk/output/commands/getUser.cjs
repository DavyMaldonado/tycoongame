'use strict';

var commandFactory = require('../utils/commandFactory.cjs');
var schemas = require('../generated/schemas.cjs');

const getUser = commandFactory.schemaCommandFactory(schemas.Command.GET_USER);

exports.getUser = getUser;
