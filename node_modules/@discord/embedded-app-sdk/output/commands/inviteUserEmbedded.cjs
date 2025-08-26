'use strict';

var commandFactory = require('../utils/commandFactory.cjs');
var schemas = require('../generated/schemas.cjs');

const inviteUserEmbedded = commandFactory.schemaCommandFactory(schemas.Command.INVITE_USER_EMBEDDED);

exports.inviteUserEmbedded = inviteUserEmbedded;
