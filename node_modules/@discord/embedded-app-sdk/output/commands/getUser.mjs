import { schemaCommandFactory } from '../utils/commandFactory.mjs';
import { Command } from '../generated/schemas.mjs';

const getUser = schemaCommandFactory(Command.GET_USER);

export { getUser };
