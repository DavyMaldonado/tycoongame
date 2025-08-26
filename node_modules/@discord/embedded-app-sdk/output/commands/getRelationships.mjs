import { schemaCommandFactory } from '../utils/commandFactory.mjs';
import { Command } from '../generated/schemas.mjs';

const getRelationships = schemaCommandFactory(Command.GET_RELATIONSHIPS);

export { getRelationships };
