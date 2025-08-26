import { schemaCommandFactory } from '../utils/commandFactory.mjs';
import { Command } from '../generated/schemas.mjs';

const inviteUserEmbedded = schemaCommandFactory(Command.INVITE_USER_EMBEDDED);

export { inviteUserEmbedded };
