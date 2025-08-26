'use strict';

var commandFactory = require('../utils/commandFactory.cjs');
var schemas = require('../generated/schemas.cjs');

const getRelationships = commandFactory.schemaCommandFactory(schemas.Command.GET_RELATIONSHIPS);

exports.getRelationships = getRelationships;
